"""A-01~A-09 사용자 API 테스트.

기획 규칙이 실제로 강제되는지를 본다.
  - 후보 최대 6개
  - 등록 필수값은 size_id 하나뿐
  - 같은 평형을 동/호만 달리해 여러 번 담을 수 있음
  - 남의 후보는 보이지도 지워지지도 않음
"""
from tests.conftest import DASHBOARD_URL, ITEMS_URL, PROFILE_URL

MAX_ITEMS = 6


# --- A-01, A-02: 프로필 ----------------------------------------------------

def test_profile_is_created_on_first_call(client, auth, test_user):
    """A-01: 첫 호출에 profiles 행이 자동으로 만들어진다.

    Supabase Auth는 auth.users에만 기록하므로, 우리 테이블은 이 시점에 채워진다.
    """
    res = client.get(PROFILE_URL, headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == test_user["id"]
    # 응답 키는 명세("변수명 통일" 표) 그대로여야 한다.
    assert set(body) == {
        "user_id", "nickname", "age_group", "service_purposes", "created_at", "updated_at",
    }


def test_profile_fields_are_all_optional(client, auth):
    """온보딩을 건너뛴 사용자도 서비스를 쓸 수 있어야 한다."""
    body = client.get(PROFILE_URL, headers=auth).json()
    assert body["nickname"] is None
    assert body["age_group"] is None
    assert body["service_purposes"] is None


def test_profile_update(client, auth):
    """A-02: 닉네임·나이대·이용목적을 한 번에 저장."""
    res = client.patch(
        PROFILE_URL,
        headers=auth,
        json={"nickname": "홍길동", "age_group": "30s", "service_purposes": ["move", "buy"]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["nickname"] == "홍길동"
    assert body["age_group"] == "30s"
    assert body["service_purposes"] == ["move", "buy"]


def test_profile_partial_update_keeps_other_fields(client, auth):
    """PATCH는 보낸 필드만 바꾼다. 안 보낸 필드는 그대로 남는다."""
    client.patch(PROFILE_URL, headers=auth, json={"nickname": "홍길동", "age_group": "30s"})
    res = client.patch(PROFILE_URL, headers=auth, json={"nickname": "김철수"})
    assert res.json()["nickname"] == "김철수"
    assert res.json()["age_group"] == "30s"      # 안 보냈으므로 유지


def test_profile_explicit_null_clears_field(client, auth):
    """null을 명시적으로 보내면 지운다. '안 보냄'과 구분된다."""
    client.patch(PROFILE_URL, headers=auth, json={"nickname": "홍길동"})
    res = client.patch(PROFILE_URL, headers=auth, json={"nickname": None})
    assert res.json()["nickname"] is None


def test_profile_rejects_invalid_enum(client, auth):
    """허용값이 아닌 age_group / service_purposes 는 422."""
    assert client.patch(PROFILE_URL, headers=auth, json={"age_group": "99s"}).status_code == 422
    res = client.patch(PROFILE_URL, headers=auth, json={"service_purposes": ["로또당첨"]})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    # 어느 필드가 틀렸는지 프론트가 바로 알 수 있어야 한다.
    assert res.json()["error"]["details"][0]["field"].startswith("body.service_purposes")


# --- A-03: 등록 -----------------------------------------------------------

def test_create_item_with_size_id_only(client, auth):
    """A-03: 필수값은 size_id 하나뿐. 선택정보는 전부 생략 가능."""
    res = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318})
    assert res.status_code == 201
    body = res.json()
    assert body["size_id"] == 1318
    assert body["status"] == "considering"        # 서버가 기본값을 정한다
    for optional in ("list_price", "floor", "dong", "ho", "direction", "interior_state", "memo"):
        assert body[optional] is None


def test_create_item_with_all_details(client, auth):
    res = client.post(ITEMS_URL, headers=auth, json={
        "size_id": 1318, "list_price": 1320000000, "floor": 12,
        "dong": "105", "ho": "1203", "direction": "south",
        "interior_state": "partial", "memo": "남향, 재건축 기대",
    })
    assert res.status_code == 201
    assert res.json()["dong"] == "105"
    # 동/호는 문자열로 저장한다. 숫자로 두면 "0105" 같은 선행 0이 사라진다.
    assert isinstance(res.json()["ho"], str)


def test_same_size_id_can_be_added_twice(client, auth):
    """같은 단지·같은 평형이라도 동/호가 다르면 다른 후보다.

    (user_id, size_id) 유니크 제약을 걸지 않은 이유가 이것이다.
    """
    first = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318, "dong": "101"})
    second = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318, "dong": "105"})
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]


def test_create_requires_size_id(client, auth):
    res = client.post(ITEMS_URL, headers=auth, json={})
    assert res.status_code == 422
    assert res.json()["error"]["details"][0]["field"] == "body.size_id"


def test_create_rejects_invalid_direction(client, auth):
    """향은 영문 enum으로 받는다. 한글 표시는 프론트 몫."""
    res = client.post(ITEMS_URL, headers=auth, json={"size_id": 1, "direction": "남향"})
    assert res.status_code == 422


def test_max_items_limit(client, auth):
    """A-03: 7번째 등록은 409로 막힌다."""
    for i in range(MAX_ITEMS):
        assert client.post(ITEMS_URL, headers=auth, json={"size_id": 1000 + i}).status_code == 201

    res = client.post(ITEMS_URL, headers=auth, json={"size_id": 9999})
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "CONFLICT"
    assert str(MAX_ITEMS) in res.json()["error"]["message"]


# --- A-04, A-05: 목록 / 상세 -----------------------------------------------

def test_list_items(client, auth):
    """A-04: 프론트가 상한값을 하드코딩하지 않도록 count/max_count를 함께 준다."""
    client.post(ITEMS_URL, headers=auth, json={"size_id": 1318})
    client.post(ITEMS_URL, headers=auth, json={"size_id": 1319})

    body = client.get(ITEMS_URL, headers=auth).json()
    assert body["count"] == 2
    assert body["max_count"] == MAX_ITEMS
    assert len(body["items"]) == 2


def test_get_item_detail(client, auth):
    """A-05: 선택정보가 없으면 null로 나간다."""
    item_id = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318}).json()["id"]
    res = client.get(f"{ITEMS_URL}/{item_id}", headers=auth)
    assert res.status_code == 200
    assert res.json()["list_price"] is None


def test_get_missing_item_returns_404(client, auth):
    res = client.get(f"{ITEMS_URL}/99999999", headers=auth)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


# --- A-06, A-07: 수정 ------------------------------------------------------

def test_update_details_partially(client, auth):
    """A-06: 보낸 필드만 바뀐다."""
    item_id = client.post(ITEMS_URL, headers=auth, json={
        "size_id": 1318, "dong": "105", "list_price": 1320000000}).json()["id"]

    res = client.patch(f"{ITEMS_URL}/{item_id}/details", headers=auth,
                       json={"list_price": 1400000000})
    assert res.status_code == 200
    assert res.json()["list_price"] == 1400000000
    assert res.json()["dong"] == "105"           # 안 보냈으므로 유지


def test_update_details_null_clears(client, auth):
    """null을 보내면 선택정보를 지운다."""
    item_id = client.post(ITEMS_URL, headers=auth,
                          json={"size_id": 1318, "memo": "지울 메모"}).json()["id"]
    res = client.patch(f"{ITEMS_URL}/{item_id}/details", headers=auth, json={"memo": None})
    assert res.json()["memo"] is None


def test_update_details_cannot_change_size_id(client, auth):
    """size_id 변경은 수정이 아니라 '지우고 새로 담기'다. 보내도 무시된다."""
    item_id = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318}).json()["id"]
    res = client.patch(f"{ITEMS_URL}/{item_id}/details", headers=auth, json={"size_id": 9999})
    assert res.json()["size_id"] == 1318


def test_update_status(client, auth):
    """A-07: 상태만 바꾸는 전용 엔드포인트."""
    item_id = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318}).json()["id"]
    res = client.patch(f"{ITEMS_URL}/{item_id}/status", headers=auth,
                       json={"status": "interested"})
    assert res.status_code == 200
    assert res.json()["status"] == "interested"


def test_update_status_rejects_invalid_value(client, auth):
    item_id = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318}).json()["id"]
    res = client.patch(f"{ITEMS_URL}/{item_id}/status", headers=auth, json={"status": "보류"})
    assert res.status_code == 422


# --- A-08: 삭제 -----------------------------------------------------------

def test_delete_item(client, auth):
    """A-08: 삭제하면 deleted_id를 돌려준다."""
    item_id = client.post(ITEMS_URL, headers=auth, json={"size_id": 1318}).json()["id"]

    res = client.delete(f"{ITEMS_URL}/{item_id}", headers=auth)
    assert res.status_code == 200
    assert res.json() == {"deleted_id": item_id}

    # 같은 id로 다시 지우면 404
    assert client.delete(f"{ITEMS_URL}/{item_id}", headers=auth).status_code == 404


# --- A-09: 대시보드 집계 ---------------------------------------------------

def test_dashboard_aggregates_profile_and_items(client, auth):
    """A-09: 첫 화면을 한 번의 호출로 구성한다.

    ⚠️ 아직 B의 지표(단지명·평수·최근 대표가)는 포함되지 않는다.
       size_master가 이 DB로 이관된 뒤에 붙인다.
    """
    client.patch(PROFILE_URL, headers=auth, json={"nickname": "홍길동"})
    client.post(ITEMS_URL, headers=auth, json={"size_id": 1318})

    res = client.get(DASHBOARD_URL, headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"profile", "items", "count", "max_count"}
    assert body["profile"]["nickname"] == "홍길동"
    assert body["count"] == 1
