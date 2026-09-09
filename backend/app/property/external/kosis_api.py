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

✅ 2026-09-09 개선: KOSIS 공식 R 패키지(seokhoonj/kosis) 문서의 실제 사용 예시를
   확인한 결과, itmId·objL1을 명시하지 않으면 응답이 비거나 축소될 수 있다는 걸
   확인함. itmId="ALL", objL1="ALL"을 넘기도록 수정 (많은 KOSIS 통계표가 지원하는
   와일드카드 값). 필드명(C1_NM=지역명, ITM_NM=항목명, PRD_DE=기간, DT=값)은
   KOSIS 표준 관례이며 같은 문서로 재확인됨.
"""
import requests
from app.core.config import KOSIS_API_KEY

KOSIS_BASE_URL = "https://kosis.kr/openapi/Param/statisticsParameterData.do"

ORG_ID = "408"
TBL_ID = "DT_304004_WEEK_013_A"


def fetch_supply_demand(start_date: str, end_date: str, region_name: str = "전국") -> dict:
    """아파트 수급동향(매매/전세) 조회.

    start_date, end_date: "YYYYMMDD" 형식 (예: "20251201")
    region_name: 지금은 응답을 다 받아서 파이썬에서 필터링(macro.py 참고)

    ⚠️ itmId="ALL", objL1="ALL"이 이 통계표에서도 통하는 와일드카드인지는
       아직 실제 응답으로 검증 못함. 만약 여전히 비어있으면, 이 표만의
       구체적인 itmId 코드값(예: 매매수급=T1, 전세수급=T2 같은 형태)을
       SttsApiTblItm.do?STATBL_ID=DT_304004_WEEK_013_A 로 직접 조회해서
       알아내야 함 (R-ONE 때 A_2024_00900으로 했던 것과 같은 방식).
    """
    params = {
        "method": "getList",
        "apiKey": KOSIS_API_KEY,
        "orgId": ORG_ID,
        "tblId": TBL_ID,
        "itmId": "ALL",
        "objL1": "ALL",
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
