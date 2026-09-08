"""이미 만들어진 raw_trades_sale, raw_trades_rent 테이블에 중복 방지용
유니크 제약을 추가하는 1회성 마이그레이션 스크립트.

⚠️ 먼저 python ingest/dedupe_raw_tables.py 를 실행해서 중복 데이터를 지워야 한다.
   중복이 남아있으면 제약을 걸 때 IntegrityError(UniqueViolation)로 실패한다.

이미 제약이 있으면 조용히 건너뛴다(에러 없이).

실행: python ingest/add_unique_constraints.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError, IntegrityError
from app.database import get_session

SALE_CONSTRAINT_SQL = """
ALTER TABLE raw_trades_sale
ADD CONSTRAINT uq_raw_trade_sale_natural_key
UNIQUE (sgg_cd, umd_nm, jibun, apt_nm, exclu_use_ar, floor, deal_amount, deal_year, deal_month, deal_day)
"""

RENT_CONSTRAINT_SQL = """
ALTER TABLE raw_trades_rent
ADD CONSTRAINT uq_raw_trade_rent_natural_key
UNIQUE (sgg_cd, umd_nm, jibun, apt_nm, exclu_use_ar, floor, deposit, monthly_rent, deal_year, deal_month)
"""


def add_constraints():
    with get_session() as session:
        for name, sql in [("매매", SALE_CONSTRAINT_SQL), ("전월세", RENT_CONSTRAINT_SQL)]:
            try:
                session.execute(text(sql))
                session.commit()
                print(f"[{name}] 유니크 제약 추가 완료")
            except ProgrammingError as e:
                session.rollback()
                if "already exists" in str(e):
                    print(f"[{name}] 이미 제약이 있어서 건너뜀")
                else:
                    print(f"[{name}] 에러 발생: {e}")
                    raise
            except IntegrityError as e:
                session.rollback()
                print(f"[{name}] ❌ 실패 — 아직 중복 데이터가 남아있습니다.")
                print(f"       먼저 'python ingest/dedupe_raw_tables.py'를 실행한 뒤 다시 시도하세요.")
                print(f"       (에러 원문: {e})")
                raise
    print("=== 완료 ===")


if __name__ == "__main__":
    add_constraints()
