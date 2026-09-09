"""거시 데이터(매매가격지수 + 매매수급동향지수) 엔드포인트 (B-10).

가격지수: 한국부동산원 R-ONE, 월단위 (app/property/external/reb_api.py)
수급동향: KOSIS, 주단위 (app/property/external/kosis_api.py)

⚠️ 가격지수는 오픈API로 월단위만 제공됨 (2026-09-08 확인, 주간 오픈API 자체가 없음).
⚠️ 지수 값은 금액이 아니므로 원/만원 변환(to_won) 대상이 아니다.

2026-09-09 프론트 요구사항 반영: 3/12/36개월 배열로 반환 (기존엔 최신값 1개만 반환했음).
"""
from datetime import date, timedelta
from fastapi import APIRouter, Query
from app.property.external.reb_api import fetch_price_index_by_region
from app.property.external.kosis_api import fetch_supply_demand

router = APIRouter(prefix="/macro", tags=["macro"])

# KOSIS statisticsParameterData 표준 필드명 후보 (공식 문서 기준 관례명).
# 실제 응답을 아직 눈으로 확인 못 해서, 여러 후보를 순서대로 시도한다.
KOSIS_FIELD_CANDIDATES = [
    {"region": "C1_NM", "item": "ITM_NM", "period": "PRD_DE", "value": "DT"},
    {"region": "C1_NM", "item": "ITM_NM", "period": "PRD_DE", "value": "DT_VAL"},
]


def _parse_kosis_rows(raw, region: str) -> tuple[list[dict], str | None]:
    """KOSIS 응답에서 (지역, 매매수급) 항목만 걸러서 기간순 배열로 반환.
    여러 필드명 후보를 시도하고, 전부 실패하면 진단 정보를 에러 메시지에 담는다.

    ⚠️ 2026-09-09 발견: KOSIS는 상황에 따라 응답 형태가 다르다.
       - 정상: 딕셔너리로 이루어진 리스트
       - 에러/결과없음: 딕셔너리 하나만 오거나, 문자열이 섞여서 오기도 함
       그래서 리스트인지, 각 원소가 딕셔너리인지 먼저 검사해야 안전하다.
    """
    if isinstance(raw, dict):
        # 에러 응답이 {"err": "...", "errMsg": "..."} 형태로 딕셔너리 하나만 오는 경우
        err_msg = raw.get("errMsg") or raw.get("err")
        return [], f"KOSIS가 에러를 반환함: {err_msg or raw}"

    if not isinstance(raw, list) or not raw:
        return [], f"예상치 못한 응답 형태입니다: {type(raw).__name__} / {raw}"

    # 딕셔너리가 아닌 원소(문자열 등)는 걸러내고 진행
    dict_rows = [r for r in raw if isinstance(r, dict)]
    if not dict_rows:
        return [], f"응답에 딕셔너리가 하나도 없습니다. 원본: {raw[:3]}"

    for fields in KOSIS_FIELD_CANDIDATES:
        matched = [
            r for r in dict_rows
            if region in str(r.get(fields["region"], ""))
            and "매매" in str(r.get(fields["item"], ""))
            and r.get(fields["value"]) is not None
        ]
        if matched:
            matched.sort(key=lambda r: str(r.get(fields["period"], "")))
            series = [
                {"period": r.get(fields["period"]), "value": float(r.get(fields["value"]))}
                for r in matched
            ]
            return series, None

    # 전부 실패 — 진단용으로 실제 응답의 필드명(키 목록)을 그대로 보여줌
    sample_keys = list(dict_rows[0].keys())
    return [], (
        f"필드명 후보({KOSIS_FIELD_CANDIDATES})로 매칭 실패. "
        f"실제 응답의 필드명: {sample_keys}. 이 목록을 보고 코드를 수정해야 함."
    )


@router.get("/indices")
def get_macro_indices(
    region: str = Query("전국", description="지역명. 확인된 값: 전국(다른 지역명은 미검증)"),
    months: int = Query(12, description="3, 12, 36 중 선택 (2026-09-09 프론트 확정)"),
):
    """가격지수(월별 배열) + 수급지수(주별 배열) 함께 반환. 둘 다 최근 N개월 기준."""

    # --- 1. 매매가격지수 (월단위, R-ONE) ---
    today = date.today()
    start_period = f"{today.year - 5}{today.month:02d}"
    end_period = f"{today.year}{today.month:02d}"

    try:
        price_rows = fetch_price_index_by_region(start_period, end_period, region)
        price_index = [
            {"period": r.get("WRTTIME_IDTFR_ID"), "value": float(r.get("DTA_VAL"))}
            for r in price_rows if r.get("DTA_VAL") is not None
        ]
        price_index.sort(key=lambda x: x["period"])
        # months 파라미터로 최근 N개월만 자르기 (월단위이므로 그대로 개월 수 적용)
        price_index = price_index[-months:] if months < len(price_index) else price_index
        price_index_error = None
    except Exception as e:
        price_index = []
        price_index_error = str(e)

    # --- 2. 매매수급동향 (주단위, KOSIS) ---
    supply_demand = []
    supply_demand_error = None
    try:
        end_date = today.strftime("%Y%m%d")
        start_date = (today - timedelta(days=months * 31)).strftime("%Y%m%d")
        raw = fetch_supply_demand(start_date, end_date, region_name=region)
        supply_demand, supply_demand_error = _parse_kosis_rows(raw, region)
    except Exception as e:
        supply_demand_error = str(e)

    return {
        "region": region,
        "months": months,
        "price_index": price_index,
        "price_index_period": "월단위 (주간 오픈API 미제공, 팀 확인 완료)",
        "price_index_error": price_index_error,
        "supply_demand": supply_demand,
        "supply_demand_period": "주단위",
        "supply_demand_error": supply_demand_error,
    }
