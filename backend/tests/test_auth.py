"""인증(JWT 검증) 테스트.

여기서 확인하는 것은 하나다: **비밀키를 모르는 사람은 아무것도 할 수 없다.**

JWT의 페이로드는 암호화가 아니라 Base64 인코딩이라 누구나 열어보고 고칠 수 있다.
안전성은 "내용을 숨기는 것"이 아니라 "비밀키 없이는 유효한 서명을 만들 수 없다"에서
나온다. test_tampered_sub_is_rejected 가 그 핵심을 확인한다.
"""
import uuid

import pytest

from tests.conftest import DASHBOARD_URL, ITEMS_URL, PROFILE_URL, make_token

# 로그인이 필요한 모든 엔드포인트
PROTECTED = [
    ("get", PROFILE_URL, None),
    ("patch", PROFILE_URL, {}),
    ("get", DASHBOARD_URL, None),
    ("get", ITEMS_URL, None),
    ("post", ITEMS_URL, {"size_id": 1}),
    ("get", f"{ITEMS_URL}/1", None),
    ("patch", f"{ITEMS_URL}/1/details", {}),
    ("patch", f"{ITEMS_URL}/1/status", {"status": "interested"}),
    ("delete", f"{ITEMS_URL}/1", None),
]


@pytest.mark.parametrize("method,url,body", PROTECTED)
def test_requires_token(client, method, url, body):
    """토큰 없이 부르면 전부 401. 하나라도 빠지면 그 엔드포인트는 공개 상태다."""
    res = getattr(client, method)(url, **({"json": body} if body is not None else {}))
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_wrong_secret_is_rejected(client):
    """다른 비밀키로 서명한 토큰은 거부된다."""
    token = make_token(str(uuid.uuid4()), secret="attacker-guessed-wrong-secret")
    res = client.get(PROFILE_URL, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_expired_token_is_rejected(client, test_user):
    """만료된 토큰은 거부된다."""
    token = make_token(test_user["id"], expires_in=-10)
    res = client.get(PROFILE_URL, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "만료" in res.json()["error"]["message"]


def test_wrong_audience_is_rejected(client, test_user):
    """다른 서비스용으로 발급된 토큰은 거부된다."""
    token = make_token(test_user["id"], aud="some-other-service")
    res = client.get(PROFILE_URL, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_malformed_token_is_rejected(client):
    """JWT 형식이 아닌 문자열은 거부된다."""
    res = client.get(PROFILE_URL, headers={"Authorization": "Bearer not.a.jwt"})
    assert res.status_code == 401


def test_unknown_user_is_rejected(client):
    """서명은 정상이지만 auth.users에 없는 사용자는 거부된다.

    탈퇴한 계정의 토큰을 아직 들고 있는 경우가 여기에 해당한다.
    profiles -> auth.users 외래키가 실제로 걸려 있어야 이 테스트가 통과한다.
    """
    token = make_token(str(uuid.uuid4()))
    res = client.get(PROFILE_URL, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "존재하지 않는 계정" in res.json()["error"]["message"]


def test_tampered_sub_is_rejected(client, test_user):
    """서명은 그대로 두고 페이로드의 sub만 남의 것으로 바꿔치기 -> 거부.

    JWT의 핵심을 확인하는 테스트다. 페이로드는 누구나 고칠 수 있지만
    고치는 순간 서명이 맞지 않게 된다.
    """
    import base64
    import json

    good = make_token(test_user["id"], test_user["email"])
    header, payload, signature = good.split(".")

    decoded = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    decoded["sub"] = str(uuid.uuid4())  # 남의 계정으로 바꿔치기
    forged = base64.urlsafe_b64encode(json.dumps(decoded).encode()).decode().rstrip("=")

    res = client.get(
        PROFILE_URL, headers={"Authorization": f"Bearer {header}.{forged}.{signature}"}
    )
    assert res.status_code == 401
