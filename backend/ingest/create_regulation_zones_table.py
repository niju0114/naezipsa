"""B-12: regulation_zones 테이블만 새로 만드는 1회성 스크립트.
(create_tables.py를 다시 통째로 돌리지 않고, 이 테이블 하나만 추가하기 위함)

이미 테이블이 있으면 조용히 건너뛴다(checkfirst=True).

실행: python ingest/create_regulation_zones_table.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_session
from app.property.model import Base, RegulationZone

if __name__ == "__main__":
    session = get_session()
    engine = session.get_bind()
    Base.metadata.create_all(engine, tables=[RegulationZone.__table__], checkfirst=True)
    print("regulation_zones 테이블 준비 완료 (이미 있었다면 그대로 유지됨)")
    session.close()
