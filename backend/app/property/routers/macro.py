"""거시 데이터(매매가격지수 + 매매수급동향지수) 엔드포인트 (B-10).

가격지수: 한국부동산원 R-ONE, 월단위 (app/property/external/reb_api.py)
수급동향: KOSIS, 주단위 (app/property/external/kosis_api.py)

⚠️ 가격지수는 오픈API로 월단위만 제공됨 (2026-09-08 확인, 주간 오픈API 자체가 없음).
⚠️ 지수 값은 금액이 아니므로 원/만원 변환(to_won) 대상이 아니다.

2026-09-09 프론트 요구사항 반영: 3/12/36개월 배열로 반환 (기존엔 최신값 1개만 반환했음).
"""
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from fastapi import APIRouter, Query
from app.property.external.reb_api import fetch_price_index_by_region
from app.property.external.kosis_api import fetch_supply_demand

router = APIRouter(prefix="/macro", tags=["macro"])

# 캐싱 (2026-09, 프론트 로딩 속도 개선 요청): 매매가격지수는 월 단위,
# 수급동향은 주 단위로만 갱신되는 지표라 요청마다 REB/KOSIS 외부 API를
# 새로 부를 필요가 없다. 프로세스 메모리에 (region, months)별로
# CACHE_TTL_SECONDS만큼 결과를 캐싱한다.
# ⚠️ uvicorn --reload로 코드가 바뀌면 워커가 재시작되며 캐시도 같이
# 초기화된다(로컬 개발 환경에선 문제 없음). 나중에 워커/프로세스를 여러 개
# 띄우는 배포로 가면 워커마다 캐시가 따로 생기므로 Redis 같은 공유 캐시로
# 바꿔야 하는데, 지금 스프린트 규모에선 오버엔지니어링이라 일단 메모리
# 캐시로 둔다.
CACHE_TTL_SECONDS = 6 * 60 * 60  # 6시간

_macro_cache: dict[tuple[str, int], tuple[float, dict]] = {}


def _get_cached(key: tuple[str, int]) -> dict | None:
    entry = _macro_cache.get(key)
    if entry is None:
        return None
    cached_at, data = entry
    if time.time() - cached_at > CACHE_TTL_SECONDS:
        return None
    return data


def _set_cached(key: tuple[str, int], data: dict) -> None:
    _macro_cache[key] = (time.time(), data)


# a) 기간 제한 (2026-09, 프론트 로딩 속도 개선): 예전엔 months 값과 무관하게
# R-ONE에 항상 "최근 5년치"를 요청한 뒤 파이썬에서 최근 N개월만 잘라 썼다
# (5년치는 페이지네이션으로 최대 5번 순차 호출됨 — 그 자체가 느렸음).
# 이제는 필요한 기간만 요청한다. 최신월이 아직 안 올라와 있거나 중간에
# 결측월이 있을 수 있어 BUFFER_MONTHS만큼 여유를 더 요청하고, 응답을 받은
# 뒤에도 여전히 최근 months개로 한 번 더 자른다(로직은 기존과 동일).
BUFFER_MONTHS = 3


def _period_months_ago(today: date, months_back: int) -> str:
    """today로부터 months_back개월 전을 R-ONE이 쓰는 "YYYYMM" 문자열로."""
    total_months = today.year * 12 + (today.month - 1) - months_back
    year, month0 = divmod(total_months, 12)
    return f"{year}{month0 + 1:02d}"


def _fetch_price_index(region: str, months: int, today: date) -> tuple[list[dict], str | None]:
    """매매가격지수(월단위, R-ONE) — months+여유분만 요청."""
    start_period = _period_months_ago(today, months + BUFFER_MONTHS)
    end_period = f"{today.year}{today.month:02d}"
    try:
        price_rows = fetch_price_index_by_region(start_period, end_period, region)
        price_index = [
            {"period": r.get("WRTTIME_IDTFR_ID"), "value": float(r.get("DTA_VAL"))}
            for r in price_rows if r.get("DTA_VAL") is not None
        ]
        price_index.sort(key=lambda x: x["period"])
        price_index = price_index[-months:] if months < len(price_index) else price_index
        return price_index, None
    except Exception as e:
        return [], str(e)


def _fetch_supply_demand_series(region: str, months: int, today: date) -> tuple[list[dict], str | None]:
    """매매수급동향(주단위, KOSIS)."""
    try:
        end_date = today.strftime("%Y%m%d")
        start_date = (today - timedelta(days=months * 31)).strftime("%Y%m%d")
        raw = fetch_supply_demand(start_date, end_date, region_name=region)
        return _parse_kosis_rows(raw, region)
    except Exception as e:
        return [], str(e)


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

    cache_key = (region, months)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    today = date.today()

    # b) 병렬 호출 (2026-09, 프론트 로딩 속도 개선): REB(가격지수)와
    # KOSIS(수급동향)는 서로 무관한 별개의 외부 API라 순서대로 기다릴
    # 이유가 없다. 둘 다 requests(동기/블로킹) 호출이라 async로 바꾸는
    # 대신 스레드 2개로 동시에 실행 — 전체 대기 시간이 "REB + KOSIS"가
    # 아니라 "둘 중 더 오래 걸리는 쪽"만큼으로 줄어든다.
    with ThreadPoolExecutor(max_workers=2) as executor:
        price_future = executor.submit(_fetch_price_index, region, months, today)
        supply_future = executor.submit(_fetch_supply_demand_series, region, months, today)
        price_index, price_index_error = price_future.result()
        supply_demand, supply_demand_error = supply_future.result()

    result = {
        "region": region,
        "months": months,
        "price_index": price_index,
        "price_index_period": "월단위 (주간 오픈API 미제공, 팀 확인 완료)",
        "price_index_error": price_index_error,
        "supply_demand": supply_demand,
        "supply_demand_period": "주단위",
        "supply_demand_error": supply_demand_error,
    }

    # 둘 다 성공했을 때만 캐싱한다 — 일시적인 외부 API 에러까지 6시간 동안
    # 그대로 캐싱해버리면 다음 요청도 계속 에러만 반환하게 되기 때문.
    if price_index_error is None and supply_demand_error is None:
        _set_cached(cache_key, result)

    return result
