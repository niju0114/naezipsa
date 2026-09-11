"""경기도 지역코드 검증용 — 딱 1개 지역, 최근 3개월치만 시험 조회.
DB에 저장하지 않고, 화면에만 결과를 찍어서 코드가 맞는지 눈으로 확인하는 용도.

사용법: python ingest/test_gyeonggi_code.py <지역명> <법정동코드>
예시:   python ingest/test_gyeonggi_code.py 과천시 41290
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from app.property.external.molit_api import fetch_sale_trades_all


def recent_months(n: int) -> list[str]:
    today = date.today()
    months = []
    y, m = today.year, today.month
    for _ in range(n):
        months.append(f"{y}{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return months


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("사용법: python ingest/test_gyeonggi_code.py <지역명> <법정동코드>")
        print("예시:   python ingest/test_gyeonggi_code.py 과천시 41290")
        sys.exit(1)

    region_name = sys.argv[1]
    sgg_cd = sys.argv[2]

    print(f"=== '{region_name}'({sgg_cd}) 코드 검증 — 최근 3개월 매매 실거래 조회 ===")
    total = 0
    for ymd in recent_months(3):
        try:
            trades = fetch_sale_trades_all(sgg_cd, ymd)
        except Exception as e:
            print(f"  {ymd}: 에러 발생 - {e}")
            continue
        total += len(trades)
        print(f"  {ymd}: {len(trades)}건")
        if trades:
            sample = trades[0]
            print(f"    예시 동 이름: {sample.get('umdNm', '?')}")
            print(f"    예시 단지명: {sample.get('aptNm', '?')}")

    print(f"\n총 {total}건 조회됨.")
    if total == 0:
        print("⚠️ 0건입니다 — 이 코드는 틀렸을 가능성이 높습니다. 다시 확인하세요.")
    else:
        print(f"✅ 데이터가 나왔습니다. 위 '예시 동 이름'이 실제 {region_name}에 있는 동인지")
        print(f"   눈으로 확인해서 코드가 맞는지 최종 판단하세요.")
