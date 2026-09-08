"""KOSIS(국가통계포털) API 호출 모듈.

용도: 거시데이터 카드의 "아파트 매매/전세 수급동향" 표기용
출처: 「전국주택가격동향조사」, 한국부동산원 (KOSIS에 원자료 제공)

⚠️ 팀 문서에는 "분기별"이라고 되어 있었지만, 실제 확인 결과 이 통계는
   "일별(주간, 매주 목요일 기준)" 데이터입니다. 문서를 수정해야 합니다.

확인된 값 (2026-09-07, 실제 KOSIS 다운로드 파일로 확인):
- orgId: 408 (한국부동산원)
- tblId: DT_304004_WEEK_013_A (아파트 수급동향)
- 조회 형식: [일] YYYYMMDD (매주 목요일 날짜, 예: 20251201)
- 값 해석: 0에 가까우면 공급우위, 100이 기준선, 200에 가까우면 수요우위
"""
import requests
from app.config import KOSIS_API_KEY

KOSIS_BASE_URL = "https://kosis.kr/openapi/Param/statisticsParameterData.do"

ORG_ID = "408"
TBL_ID = "DT_304004_WEEK_013_A"


def fetch_supply_demand(start_date: str, end_date: str, region_name: str = "전국") -> dict:
    """아파트 수급동향(매매/전세) 조회.

    start_date, end_date: "YYYYMMDD" 형식 (예: "20251201")
    region_name: "전국", "수도권", "지방" 등 — 실제 objL1 코드는 아직 미확인이라
                 지금은 이름으로만 받아두고, 다음 단계에서 코드 매핑 필요.

    ⚠️ itmId(매매수급/전세수급 항목 코드), objL1(지역 코드)의 정확한 값은
       아직 못 구했습니다. 지금은 파라미터 없이 전체를 받아서 파이썬에서
       필터링하는 방식으로 우선 구현합니다. 나중에 정확한 코드를 알면
       요청 자체에서 필터링하도록 최적화 가능.
    """
    params = {
        "method": "getList",
        "apiKey": KOSIS_API_KEY,
        "orgId": ORG_ID,
        "tblId": TBL_ID,
        "prdSe": "D",  # 일 단위 (주간 데이터가 이 형식으로 제공됨)
        "startPrdDe": start_date,
        "endPrdDe": end_date,
        "format": "json",
        "jsonVD": "Y",
    }
    res = requests.get(KOSIS_BASE_URL, params=params, timeout=10)
    res.raise_for_status()
    return res.json()


if __name__ == "__main__":
    # 실제 호출 테스트 — 실행해서 실제 응답 구조를 눈으로 확인하세요.
    print("=== KOSIS 아파트 수급동향 호출 테스트 ===")
    result = fetch_supply_demand("20251201", "20260202")
    print(f"응답 타입: {type(result)}")
    if isinstance(result, list) and result:
        print(f"\n총 {len(result)}건 응답됨")
        print("\n첫 번째 항목:")
        print(result[0])
        print("\n[확인할 것] 지역명(C1_NM 등)과 항목명(ITM_NM 등) 필드가 어떻게 오는지 보고,")
        print("전국/매매수급만 걸러내려면 어떤 코드값을 쓰면 되는지 확인하세요.")
    else:
        print(result)
