"""한국부동산원 R-ONE(부동산통계정보시스템) API 호출 모듈.

용도: 거시데이터 카드 상단의 "월별 매매가격지수" 그래프용
(하단의 수급동향은 KOSIS에서 가져옴 — app/services/kosis_api.py 참고)

✅ 확인 완료 (2026-09-08): 아래 파라미터로 실제 호출 성공(INFO-000 정상 처리).
- STATBL_ID: A_2024_00045 (아파트 매매가격지수)
- DTACYCLE_CD: MM (월간) — 팀 문서엔 "주단위"라 되어 있었지만 실제로는 월단위. 문서 수정 필요.
- 지역: CLS_NM 필드로 구분됨 (예: "전국", "서울", "강남지역" 등 위계 구조)
- 값: DTA_VAL 필드 (매매가격지수)

⚠️ 미해결: 5년치를 요청했는데 응답에 1개월치(2024년 12월)만 나옴.
   list_total_count=4566인데 실제 온 건수는 훨씬 적어서, 페이지네이션이
   필요해 보임. 국토부 API처럼 pIndex/pSize 같은 페이지 파라미터가
   있을 것으로 추정되나 정확한 이름은 미확인 — 아래에서 시도 중.
"""
import requests
from app.config import REB_API_KEY

REB_BASE_URL = "https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do"

STATBL_ID = "A_2024_00045"


def fetch_price_index_page(start_period: str, end_period: str, page_index: int = 1, page_size: int = 1000) -> dict:
    """아파트 매매가격지수 조회 (1페이지).
    page_index, page_size: 페이지네이션 파라미터 이름이 정확한지 미확인 상태.
    """
    params = {
        "KEY": REB_API_KEY,
        "STATBL_ID": STATBL_ID,
        "DTACYCLE_CD": "MM",
        "START_WRTTIME": start_period,
        "END_WRTTIME": end_period,
        "type": "json",
        "pIndex": page_index,
        "pSize": page_size,
    }
    res = requests.get(REB_BASE_URL, params=params, timeout=10)
    res.raise_for_status()
    return res.json()


def extract_rows(raw_response: dict) -> list[dict]:
    """응답 JSON에서 실제 데이터 행(row)만 뽑아내는 헬퍼."""
    try:
        blocks = raw_response["SttsApiTblData"]
        for block in blocks:
            if "row" in block:
                return block["row"]
        return []
    except (KeyError, TypeError):
        return []


def fetch_price_index_national(start_period: str, end_period: str) -> list[dict]:
    """전국(CLS_NM == '전국') 매매가격지수만 월별로 뽑아서 반환.
    여러 페이지에 걸쳐 있을 수 있어 total_count만큼 다 모일 때까지 반복.
    """
    all_rows = []
    page = 1
    while True:
        raw = fetch_price_index_page(start_period, end_period, page_index=page)
        rows = extract_rows(raw)
        if not rows:
            break
        all_rows.extend(rows)
        # head 블록에서 total_count 확인
        total_count = None
        for block in raw.get("SttsApiTblData", []):
            if "head" in block:
                for item in block["head"]:
                    if "list_total_count" in item:
                        total_count = item["list_total_count"]
        if total_count is None or len(all_rows) >= total_count:
            break
        page += 1
        if page > 50:  # 무한루프 방지 안전장치
            break

    national_only = [r for r in all_rows if r.get("CLS_NM") == "전국"]
    return national_only


if __name__ == "__main__":
    print("=== 1단계: 페이지네이션 파라미터(pIndex/pSize) 시도 ===")
    raw = fetch_price_index_page("202108", "202607", page_index=1)
    rows = extract_rows(raw)
    months_found = sorted(set(r.get("WRTTIME_IDTFR_ID") for r in rows))
    print(f"1페이지에서 받은 건수: {len(rows)}")
    print(f"1페이지에 포함된 월: {months_found}")
    print("→ 위 월이 여러 개면 pIndex/pSize가 먹힌 것입니다.")
    print("→ 여전히 1개월만 나오면, 페이지 파라미터 이름이 다른 것이니 팀/문서 확인 필요.")

    print("\n=== 2단계: 전국 데이터만 전체 기간 수집 시도 ===")
    national = fetch_price_index_national("202108", "202607")
    print(f"전국 데이터 {len(national)}건 수집됨")
    for r in national[:5]:
        print(f"  {r.get('WRTTIME_DESC')}: {r.get('DTA_VAL')}")
