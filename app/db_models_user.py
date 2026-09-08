"""회원·후보매물 관련 SQLAlchemy ORM 모델 (A 담당).

B가 관리하는 실거래 데이터 모델(app/db_models.py)과 파일을 분리한 이유:
서로의 테이블 정의를 건드리지 않고 각자 작업하기 위해서다.

⚠️ 중요: 이 파일의 Base.metadata에 등록된 테이블만 Alembic이 관리한다.
   (alembic/env.py의 include_object 필터가 이 metadata를 기준으로 판단한다)
   여기에 없는 B의 테이블은 Alembic이 아예 보지 못한다.

--- 설계 메모 -------------------------------------------------------------

1) 로그인/비밀번호는 우리가 저장하지 않는다.
   Supabase Auth가 auth 스키마의 auth.users 테이블에 관리한다.
   profiles는 거기에 없는 "우리 서비스만의 정보"를 담는 보조 테이블이고,
   id를 auth.users.id와 같은 값으로 맞춘다.
   구글 같은 소셜 로그인을 붙여도 auth.users에 행이 생기는 건 똑같아서
   이 구조는 그대로 쓸 수 있다.

2) 외래키(ForeignKey)를 파이썬 코드에 선언하지 않은 이유.
   - auth.users 는 Supabase가 관리하는 다른 스키마의 테이블이고,
   - size_master 는 B의 metadata(app/db_models.py)에 있어서,
   둘 다 이 파일의 Base.metadata에서 참조를 해석할 수 없다.
   (SQLAlchemy가 NoReferencedTableError를 낸다)
   그래서 컬럼만 선언하고, 실제 FK 제약은 마이그레이션에서 직접 건다.

3) enum 성격의 컬럼은 PostgreSQL ENUM 타입 대신 String으로 저장한다.
   ENUM은 값 추가 시 ALTER TYPE이 트랜잭션 밖에서만 동작해서 마이그레이션이
   깨지고, Alembic autogenerate도 변경을 감지하지 못한다.
   값 검증은 애플리케이션(Pydantic) 쪽에서 한다.
"""
from sqlalchemy import (
    ARRAY,
    BigInteger,
    Column,
    DateTime,
    Index,
    Integer,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


# --- enum 대신 쓰는 허용값 목록 (검증은 Pydantic 스키마에서) ---------------

# 나이대. 사용자가 입력하지 않아도 되는 선택값이다.
AGE_GROUPS = ("20s", "30s", "40s", "50s", "60s+")

# 서비스 이용 목적. 복수 선택 가능.
# ⚠️ 팀 확정 필요: 명세의 예시가 [move, buy]뿐이라 나머지는 임의로 채웠다.
SERVICE_PURPOSES = ("move", "buy", "jeonse", "invest")

# 후보 매물의 검토 상태. 기본값은 서버가 정한다(사용자 입력이 아니다).
STATUS_CONSIDERING = "considering"  # 검토중 (기본값)
STATUS_INTERESTED = "interested"    # 관심
STATUS_EXCLUDED = "excluded"        # 제외
STATUSES = (STATUS_CONSIDERING, STATUS_INTERESTED, STATUS_EXCLUDED)

# 향. DB에는 영문으로 저장하고 한글 표시는 프론트에서 한다.
DIRECTIONS = ("north", "northeast", "east", "southeast",
              "south", "southwest", "west", "northwest")

# 인테리어 상태.
# ⚠️ 팀 확정 필요: 명세의 예시가 partial 하나뿐이라 나머지는 임의로 채웠다.
INTERIOR_STATES = ("none", "partial", "full")

# 한 사용자가 담을 수 있는 후보 매물 수 상한 (기획 규칙)
MAX_DASHBOARD_ITEMS = 6


class Profile(Base):
    """서비스 자체 회원 정보. auth.users와 1:1 대응.

    id는 새로 만들지 않고 Supabase Auth가 발급한 UUID를 그대로 쓴다.
    JWT의 sub 클레임에 들어있는 값이 바로 이 id다.

    닉네임·나이대·이용목적은 전부 선택값이다. 온보딩을 건너뛴 사용자도
    서비스를 그대로 쓸 수 있어야 하므로 NOT NULL을 걸지 않는다.
    """

    __tablename__ = "profiles"

    # auth.users.id 와 동일한 값. FK 제약은 마이그레이션에서 건다(설계 메모 2).
    id = Column(Uuid(as_uuid=True), primary_key=True)

    # 로그인 이메일 사본. auth.users에도 있지만 조인 없이 목록을 뽑기 위해 복제한다.
    email = Column(String(255), nullable=False)

    nickname = Column(String(30))

    # 나이 자체가 아니라 구간으로 저장한다. 생일이 지나도 값을 갱신할 필요가 없고,
    # 개인정보를 필요 이상으로 들고 있지 않기 위해서다.
    age_group = Column(String(10))

    # 이용 목적은 복수 선택이라 PostgreSQL 배열로 저장한다.
    # 별도 테이블로 빼지 않은 이유: 목적만으로 조회하거나 집계할 일이 없고,
    # 프로필과 항상 같이 읽고 같이 쓰기 때문이다.
    service_purposes = Column(ARRAY(String(30)))

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class DashboardItem(Base):
    """사용자가 대시보드에 올려둔 후보 매물 (최대 6개).

    필수값은 size_id 하나뿐이다. 나머지 매물 정보(호가·층·동·호·향·인테리어)는
    "일단 등록해두고 나중에 채우기"가 가능해야 하므로 전부 nullable이다.

    ⚠️ (user_id, size_id) 유니크 제약을 일부러 걸지 않았다.
       같은 단지·같은 평형이라도 동·호가 다르면 서로 다른 후보이기 때문이다.
       대신 "최대 6개" 규칙을 서비스 계층에서 검사한다.

    ⚠️ size_id는 B의 size_master.id를 가리킨다. 이 값의 안정성에 조건이 있다:
       - build_size_master.py 는 (complex_id, representative_area) 기준 upsert라
         여러 번 다시 돌려도 id가 유지된다.
       - 하지만 ingest/reset_data.py 는 TRUNCATE ... RESTART IDENTITY CASCADE 라서
         id가 1번부터 다시 매겨진다. 실행하면 기존 후보가 전부 엉뚱한 단지를
         가리키게 되고, FK CASCADE로 후보 행 자체가 삭제된다.
       실제 사용자가 생긴 뒤에는 reset_data.py를 절대 실행하면 안 된다.
    """

    __tablename__ = "dashboard_items"
    __table_args__ = (
        # "내 후보 목록" 조회가 주 사용 패턴이라 user_id에 인덱스를 건다.
        Index("ix_dashboard_items_user_id", "user_id"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # profiles.id (= auth.users.id). FK 제약은 마이그레이션에서 건다.
    user_id = Column(Uuid(as_uuid=True), nullable=False)

    # size_master.id. 등록 시 유일한 필수값.
    # FK 제약은 B의 실거래 테이블이 이 DB로 이관된 뒤에 추가한다.
    size_id = Column(BigInteger, nullable=False)

    # 검토 상태. ENUM이 아니라 VARCHAR로 저장한다(설계 메모 3).
    status = Column(String(20), nullable=False, server_default=STATUS_CONSIDERING)

    # --- 여기부터 선택 매물정보. 전부 나중에 채우거나 수정할 수 있다. ---

    # 호가.
    # ⚠️ 단위 주의 — 팀 "변수명 통일" 표 기준으로 **원 단위**로 저장한다.
    #    (표의 예시: list_price = 1320000000 -> 13.2억원)
    #    그런데 B의 raw_trades_sale.deal_amount는 **만원 단위**다.
    #    B-04(호가 괴리율)에 이 값을 그대로 넘기면 10,000배 어긋난다.
    #    변환 지점을 어디에 둘지 B와 합의가 필요하다.
    list_price = Column(BigInteger)

    floor = Column(Integer)
    dong = Column(String(20))          # 동 (예: "101")
    ho = Column(String(20))            # 호 (예: "1203")
    direction = Column(String(10))       # 향. 영문 저장 (예: "south")
    interior_state = Column(String(20))  # 인테리어 상태 (예: "partial")

    memo = Column(String(500))

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
