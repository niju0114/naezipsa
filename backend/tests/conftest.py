"""테스트 공통 준비물.

⚠️ 이 테스트들은 가짜 DB가 아니라 **실제 Supabase 개발 DB**에 붙어서 돈다.
   테이블 구조·외래키·JWT 비밀키가 실제로 맞물려 도는지 확인하는 것이 목적이라
   그렇게 했다. 대신 아래 두 가지를 지킨다.

     - 후보 매물은 매 테스트 전후로 지운다 (auto_cleanup 픽스처)
     - 프로필의 선택 항목도 테스트가 끝나면 원래대로(비움) 되돌린다

   실행 조건이 갖춰지지 않으면 실패가 아니라 skip 된다.
     - .env에 DATABASE_URL / SUPABASE_JWT_SECRET 이 없을 때
     - auth.users 에 계정이 하나도 없을 때
       (Supabase 대시보드 -> Authentication -> Users -> Add user 로 만들면 된다)
"""
import datetime as dt

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import DATABASE_URL, SUPABASE_JWT_SECRET

PROFILE_URL = "/api/v1/users/me/profile"
ITEMS_URL = "/api/v1/dashboard/items"
DASHBOARD_URL = "/api/v1/dashboard"


@pytest.fixture(scope="session")
def client() -> TestClient:
    """예외를 그대로 터뜨리지 않고 500 응답으로 받기 위해 raise_server_exceptions=False."""
    from app.main import app

    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(scope="session")
def test_user():
    """auth.users의 첫 계정. 없으면 이 파일의 테스트를 전부 건너뛴다."""
    if not DATABASE_URL or not SUPABASE_JWT_SECRET:
        pytest.skip(".env에 DATABASE_URL / SUPABASE_JWT_SECRET 이 필요합니다.")

    from app.core.database import get_engine

    with get_engine().connect() as conn:
        row = conn.execute(
            text("select id, email from auth.users order by created_at limit 1")
        ).first()

    if row is None:
        pytest.skip(
            "auth.users에 계정이 없습니다. "
            "Supabase 대시보드 -> Authentication -> Users -> Add user 로 만들어 주세요."
        )
    return {"id": str(row[0]), "email": row[1]}


def make_token(sub: str, email: str = "tester@example.com", **overrides) -> str:
    """Supabase가 발급하는 것과 같은 모양의 토큰을 만든다.

    실제 비밀키로 서명하므로 우리 검증 로직을 그대로 통과한다.
    overrides로 secret/aud/exp를 바꿔서 실패 케이스도 만들 수 있다.
    """
    import jwt

    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": sub,
        "email": email,
        "role": "authenticated",
        "aud": overrides.get("aud", "authenticated"),
        "iat": now,
        "exp": now + dt.timedelta(seconds=overrides.get("expires_in", 3600)),
    }
    return jwt.encode(payload, overrides.get("secret", SUPABASE_JWT_SECRET), algorithm="HS256")


@pytest.fixture
def auth(test_user) -> dict:
    """로그인한 사용자의 Authorization 헤더."""
    token = make_token(test_user["id"], test_user["email"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def auto_cleanup(request, client):
    """각 테스트 전후로 그 사용자의 후보 매물을 비운다.

    autouse지만 auth 픽스처를 쓰지 않는 테스트(인증 실패 케이스 등)에서는
    아무 일도 하지 않는다.
    """
    if "auth" not in request.fixturenames:
        yield
        return

    headers = request.getfixturevalue("auth")

    def wipe():
        res = client.get(ITEMS_URL, headers=headers)
        if res.status_code == 200:
            for item in res.json()["items"]:
                client.delete(f"{ITEMS_URL}/{item['id']}", headers=headers)

    wipe()
    yield
    wipe()
    # 프로필 선택 항목도 원래대로 비워 둔다.
    client.patch(
        PROFILE_URL,
        headers=headers,
        json={"nickname": None, "age_group": None, "service_purposes": None},
    )


@pytest.fixture(scope="session")
def real_size_ids():
    """실제로 존재하고 지표까지 계산된 size_id 두 개.

    후보 등록에 외래키가 걸려 있어서 아무 숫자나 쓸 수 없다.
    B의 실거래 데이터가 아직 이 DB에 없으면 관련 테스트를 건너뛴다.
    """
    from app.core.database import get_engine

    with get_engine().connect() as conn:
        ids = conn.execute(
            text(
                "select m.size_id from item_metrics_cache m "
                "where m.recent_median_price is not null order by m.size_id limit 2"
            )
        ).scalars().all()

    if len(ids) < 2:
        pytest.skip("실거래 데이터(item_metrics_cache)가 아직 없습니다.")
    return list(ids)
