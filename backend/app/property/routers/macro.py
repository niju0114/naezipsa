"""거시 데이터(매매가격지수 + 매매수급동향지수) 엔드포인트 (B-10).

가격지수: 한국부동산원 R-ONE, 월단위 (app/services/reb_api.py)
수급동향: KOSIS, 주단위 (app/services/kosis_api.py)

⚠️ 팀 문서엔 "주단위 매매가격지수"라 되어 있었지만, 실제 확인 결과
   R-ONE 매매가격지수는 오픈API로 월단위만 제공됨 (2026-09-08, 공공데이터포털
   AI검색으로 재확인 — 주간 오픈API 자체가 없음, 수동 다운로드만 가능).
   그래서 가격지수는 월단위로, 수급동향만 주단위로 확정.

⚠️ 지수(가격지수, 수급동향 값)는 금액이 아니라 "지수"이므로 원/만원 단위
   변환 대상이 아님 — to_won()을 적용하지 않는다.
"""
from datetime import date, timedelta
from fastapi import APIRouter, Query
from app.property.external.reb_api import fetch_price_index_by_region
from app.property.external.kosis_api import fetch_supply_demand

router = APIRouter(prefix="/macro", tags=["macro"])


@router.get("/indices")
def get_macro_indices(region: str = Query("전국", description="지역명. 확인된 값: 전국(다른 지역명은 미검증)")):
    """가격지수(월별, 라인차트용) + 수급지수(주별, 뱃지용) 함께 반환."""

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
    except Exception as e:
        price_index = []
        price_index_error = str(e)
    else:
        price_index_error = None

    # --- 2. 매매수급동향 (주단위, KOSIS) ---
    # ⚠️ itmId(매매수급/전세수급), objL1(지역코드) 정확한 값 미확인 상태.
    #    이름 필드(C1_NM, ITM_NM 등 추정)로 최선을 다해 필터링하되,
    #    실제 KOSIS 응답 구조가 다르면 아래 파싱이 실패할 수 있음.
    supply_demand = None
    supply_demand_error = None
    try:
        end_date = today.strftime("%Y%m%d")
        start_date = (today - timedelta(days=60)).strftime("%Y%m%d")
        raw = fetch_supply_demand(start_date, end_date, region_name=region)

        if isinstance(raw, list) and raw:
            # 이름 필드 후보로 최대한 필터링 시도 (정확한 필드명 미확인 상태)
            candidates = [
                r for r in raw
                if ("매매" in str(r.get("ITM_NM", ""))) and (region in str(r.get("C1_NM", "")))
            ]
            pool = candidates if candidates else raw
            pool_sorted = sorted(pool, key=lambda r: r.get("PRD_DE", ""), reverse=True)
            if pool_sorted:
                latest = pool_sorted[0]
                value = float(latest.get("DT", 0))
                status = "매수세 우위" if value > 100 else ("매도세 우위" if value < 100 else "균형")
                trend = "상승" if len(pool_sorted) > 1 and value > float(pool_sorted[1].get("DT", value)) else "하락"
                supply_demand = {"value": value, "status": status, "trend": trend}
        if supply_demand is None:
            supply_demand_error = "응답은 받았으나 지역/항목 필터링에 실패했습니다. 실제 필드명 재확인 필요."
    except Exception as e:
        supply_demand_error = str(e)

    return {
        "region": region,
        "price_index": price_index,
        "price_index_period": "월단위 (주간 오픈API 미제공, 팀 확인 완료)",
        "price_index_error": price_index_error,
        "supply_demand": supply_demand,
        "supply_demand_period": "주단위",
        "supply_demand_error": supply_demand_error,
    }
