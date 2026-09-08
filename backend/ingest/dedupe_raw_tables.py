"""raw_trades_sale, raw_trades_rent에 남아있는 완전 중복 행을 지우는 스크립트.
(같은 거래가 똑같은 값으로 여러 번 저장된 것들 — 유니크 제약을 걸기 전에 반드시 먼저 실행)

각 자연키(지역+아파트명+면적+층+금액+연월일) 조합마다 1개만 남기고 나머지는 삭제한다.

실행: python ingest/dedupe_raw_tables.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import get_session

DEDUPE_SALE_SQL = """
DELETE FROM raw_trades_sale a USING raw_trades_sale b
WHERE a.ctid < b.ctid
  AND a.sgg_cd = b.sgg_cd
  AND a.umd_nm = b.umd_nm
  AND a.jibun = b.jibun
  AND a.apt_nm = b.apt_nm
  AND a.exclu_use_ar = b.exclu_use_ar
  AND a.floor = b.floor
  AND a.deal_amount = b.deal_amount
  AND a.deal_year = b.deal_year
  AND a.deal_month = b.deal_month
  AND a.deal_day = b.deal_day
"""

DEDUPE_RENT_SQL = """
DELETE FROM raw_trades_rent a USING raw_trades_rent b
WHERE a.ctid < b.ctid
  AND a.sgg_cd = b.sgg_cd
  AND a.umd_nm = b.umd_nm
  AND a.jibun = b.jibun
  AND a.apt_nm = b.apt_nm
  AND a.exclu_use_ar = b.exclu_use_ar
  AND a.floor = b.floor
  AND a.deposit = b.deposit
  AND a.monthly_rent = b.monthly_rent
  AND a.deal_year = b.deal_year
  AND a.deal_month = b.deal_month
"""


def dedupe():
    with get_session() as session:
        print("매매 테이블 중복 제거 중...")
        result = session.execute(text(DEDUPE_SALE_SQL))
        session.commit()
        print(f"  매매: {result.rowcount}건 삭제됨")

        print("전월세 테이블 중복 제거 중...")
        result = session.execute(text(DEDUPE_RENT_SQL))
        session.commit()
        print(f"  전월세: {result.rowcount}건 삭제됨")

    print("=== 중복 제거 완료 ===")
    print("다음 단계: python ingest/add_unique_constraints.py 를 실행하세요.")


if __name__ == "__main__":
    dedupe()
