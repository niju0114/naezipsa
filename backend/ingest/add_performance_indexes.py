"""서울/경기로 데이터가 커질 때를 대비한 조회 성능용 인덱스 추가.
get_trades_for_size/get_rents_for_size가 (sgg_cd, umd_nm, jibun, apt_nm)로
매번 조회하는데, 지금은 인덱스가 없어서 데이터가 많아지면 전체 스캔이 돼서 느려진다.

실행: python ingest/add_performance_indexes.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from app.core.database import get_session

INDEXES = [
    ("idx_raw_sale_complex_key",
     "CREATE INDEX idx_raw_sale_complex_key ON raw_trades_sale (sgg_cd, umd_nm, jibun, apt_nm)"),
    ("idx_raw_rent_complex_key",
     "CREATE INDEX idx_raw_rent_complex_key ON raw_trades_rent (sgg_cd, umd_nm, jibun, apt_nm)"),
    ("idx_complex_sgg",
     "CREATE INDEX idx_complex_sgg ON complex_master (sgg_cd)"),
]


def add_indexes():
    with get_session() as session:
        for name, sql in INDEXES:
            try:
                session.execute(text(sql))
                session.commit()
                print(f"[{name}] 생성 완료")
            except ProgrammingError as e:
                session.rollback()
                if "already exists" in str(e):
                    print(f"[{name}] 이미 있어서 건너뜀")
                else:
                    print(f"[{name}] 에러: {e}")
    print("=== 완료 ===")


if __name__ == "__main__":
    add_indexes()
