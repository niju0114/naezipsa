"""SQLAlchemy ORM 모델. ingest/schema.sql과 동일한 구조를 파이썬 클래스로 정의.

이 파일의 모델로 테이블을 만들면(ingest/create_tables.py 실행),
Supabase SQL Editor에 수동으로 SQL을 붙여넣을 필요가 없다.
"""
from sqlalchemy import Column, BigInteger, Integer, String, Numeric, Date, TIMESTAMP, ForeignKey, UniqueConstraint, Boolean, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class RawTradeSale(Base):
    __tablename__ = "raw_trades_sale"
    __table_args__ = (
        UniqueConstraint(
            "sgg_cd", "umd_nm", "jibun", "apt_nm", "exclu_use_ar",
            "floor", "deal_amount", "deal_year", "deal_month", "deal_day",
            name="uq_raw_trade_sale_natural_key",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sgg_cd = Column(String(5))
    umd_nm = Column(String(50))
    jibun = Column(String(20))
    apt_nm = Column(String(100))
    build_year = Column(Integer)
    exclu_use_ar = Column(Numeric(6, 2))
    floor = Column(Integer)
    deal_amount = Column(BigInteger)
    deal_year = Column(Integer)
    deal_month = Column(Integer)
    deal_day = Column(Integer)
    dealing_gbn = Column(String(20))
    cdeal_type = Column(String(10))
    cdeal_day = Column(String(20))
    created_at = Column(TIMESTAMP, server_default=func.now())


class RawTradeRent(Base):
    __tablename__ = "raw_trades_rent"
    __table_args__ = (
        UniqueConstraint(
            "sgg_cd", "umd_nm", "jibun", "apt_nm", "exclu_use_ar",
            "floor", "deposit", "monthly_rent", "deal_year", "deal_month",
            name="uq_raw_trade_rent_natural_key",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sgg_cd = Column(String(5))
    umd_nm = Column(String(50))
    jibun = Column(String(20))
    apt_nm = Column(String(100))
    exclu_use_ar = Column(Numeric(6, 2))
    floor = Column(Integer)
    deposit = Column(BigInteger)
    monthly_rent = Column(BigInteger)
    deal_year = Column(Integer)
    deal_month = Column(Integer)
    contract_type = Column(String(10))
    created_at = Column(TIMESTAMP, server_default=func.now())


class ComplexMaster(Base):
    __tablename__ = "complex_master"
    __table_args__ = (UniqueConstraint("sgg_cd", "umd_nm", "jibun", "apt_nm"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sgg_cd = Column(String(5))
    umd_nm = Column(String(50))
    jibun = Column(String(20))
    apt_nm = Column(String(100))
    build_year = Column(Integer)
    household_cnt = Column(Integer)  # K-apt 없이는 비워둠


class SizeMaster(Base):
    __tablename__ = "size_master"
    __table_args__ = (UniqueConstraint("complex_id", "representative_area"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    complex_id = Column(BigInteger, ForeignKey("complex_master.id"))
    representative_area = Column(Numeric(6, 2))
    pyeong = Column(Integer)


class RegulationZone(Base):
    """B-12: 투기과열지구/조정대상지역 지정 여부 (정적 테이블).
    ⚠️ 국토교통부가 API가 아니라 '고시/공고문'으로 발표하는 데이터라, 자동 갱신 불가능.
       ingest/build_regulation_zones.py로 수동 채워넣고, 정부 발표 나올 때마다 사람이
       다시 그 스크립트를 고쳐서 재실행해야 함. (2026-02 기준 최신 확인, 조사 근거는
       info.md 'B-12 참고' 섹션 참고)
    sgg_cd가 이 테이블에 아예 없으면 = 대상 아님(두 값 다 False)으로 간주.
    """
    __tablename__ = "regulation_zones"

    sgg_cd = Column(String(5), primary_key=True)
    sgg_name = Column(String(50))  # 사람이 알아보기 위한 참고용 (예: "서초구", "성남시 분당구")
    is_speculation_overheated = Column(Boolean, default=False)
    is_adjustment_target = Column(Boolean, default=False)
    updated_at = Column(TIMESTAMP, server_default=func.now())


class ItemMetricsCache(Base):
    __tablename__ = "item_metrics_cache"

    size_id = Column(BigInteger, ForeignKey("size_master.id"), primary_key=True)
    recent_median_price = Column(BigInteger)  # 팀 정책: 평균이 아니라 중앙값 (구 이름: recent_avg_price)
    min_price = Column(BigInteger)
    max_price = Column(BigInteger)
    price_per_pyeong = Column(BigInteger)
    trade_count_3y = Column(Integer)
    last_trade_date = Column(String(7))  # "YYYY-MM" 형태로 통일 (다른 엔드포인트와 형식 맞춤)
    jeonse_ratio = Column(Numeric(5, 2))
    updated_at = Column(TIMESTAMP, server_default=func.now())
