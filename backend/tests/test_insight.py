"""AI-01 종합분석 테스트.

⚠️ 실제 LLM을 부르지 않는다. 외부 API는 느리고(5~10초) 돈이 들며,
   같은 입력에도 답이 매번 달라서 테스트가 불안정해진다.
   LLM 호출부만 가짜로 바꾸고, 그 앞뒤의 우리 코드를 검증한다.

   실제 연동이 되는지는 별도로 한 번 확인했다(수동).
"""
import pytest

from app.insight import service
from tests.conftest import ITEMS_URL

INSIGHT_URL = "/api/v1/dashboard/insight"


@pytest.fixture
def fake_llm(monkeypatch):
    """LLM 응답을 가짜로 바꾼다. 마지막으로 보낸 프롬프트를 꺼내볼 수 있다."""
    captured = {}

    def _ask(system_prompt, user_prompt, response_schema):
        captured["system"] = system_prompt
        captured["user"] = user_prompt
        # 실제 LLM처럼 우리 목록에 없는 id를 섞어서 돌려준다
        return {
            "summary": "세 후보를 비교했습니다.",
            "items": [
                {"id": captured.get("first_id", 0), "strengths": ["평단가가 낮습니다"],
                 "weaknesses": ["거래가 적습니다"]},
                {"id": 999999, "strengths": ["없는 후보"], "weaknesses": []},
            ],
        }

    monkeypatch.setattr(service.llm, "ask_json", _ask)
    monkeypatch.setattr(service.llm, "is_configured", lambda: True)
    return captured


def test_requires_token(client):
    assert client.post(INSIGHT_URL, json={}).status_code == 401


def test_no_items_returns_400(client, auth, fake_llm):
    """후보가 하나도 없으면 분석할 게 없다. 사용자가 고칠 수 있는 상황이라 400."""
    res = client.post(INSIGHT_URL, headers=auth, json={})
    assert res.status_code == 400
    assert "후보" in res.json()["error"]["message"]


def test_returns_insight_for_each_item(client, auth, real_size_ids, fake_llm):
    """후보 수만큼 결과가 나온다. LLM이 빠뜨려도 우리 목록 기준으로 맞춘다."""
    ids = [client.post(ITEMS_URL, headers=auth, json={"size_id": s}).json()["id"]
           for s in real_size_ids]
    fake_llm["first_id"] = ids[0]

    body = client.post(INSIGHT_URL, headers=auth, json={}).json()
    assert body["summary"]
    assert [i["id"] for i in body["items"]] == ids     # 순서와 개수가 우리 목록과 같다
    assert body["items"][0]["strengths"] == ["평단가가 낮습니다"]
    assert body["items"][1]["strengths"] == []          # LLM이 안 준 후보는 빈 목록
    assert body["generated_at"]


def test_ignores_unknown_ids_from_llm(client, auth, real_size_ids, fake_llm):
    """LLM이 지어낸 id(999999)는 응답에 섞이지 않는다."""
    ids = [client.post(ITEMS_URL, headers=auth, json={"size_id": s}).json()["id"]
           for s in real_size_ids]
    fake_llm["first_id"] = ids[0]

    body = client.post(INSIGHT_URL, headers=auth, json={}).json()
    assert 999999 not in [i["id"] for i in body["items"]]


def test_item_ids_filters(client, auth, real_size_ids, fake_llm):
    """item_ids로 일부만 고를 수 있다."""
    ids = [client.post(ITEMS_URL, headers=auth, json={"size_id": s}).json()["id"]
           for s in real_size_ids]
    fake_llm["first_id"] = ids[0]

    body = client.post(INSIGHT_URL, headers=auth, json={"item_ids": [ids[0]]}).json()
    assert [i["id"] for i in body["items"]] == [ids[0]]


def test_other_users_item_ids_are_ignored(client, auth, real_size_ids, fake_llm):
    """남의 후보 id를 섞어 보내도 내 후보만 분석된다.

    get_items_with_metrics가 애초에 내 것만 가져오므로 소유권 검사가 자동으로 따라온다.
    """
    item_id = client.post(ITEMS_URL, headers=auth,
                          json={"size_id": real_size_ids[0]}).json()["id"]
    fake_llm["first_id"] = item_id

    body = client.post(INSIGHT_URL, headers=auth,
                       json={"item_ids": [item_id, 99999999]}).json()
    assert [i["id"] for i in body["items"]] == [item_id]


def test_prompt_contains_metrics_not_raw_trades(client, auth, real_size_ids, fake_llm):
    """LLM에 원본 거래 내역이 아니라 계산된 지표만 넘긴다 (팀 명세 규칙).

    프롬프트가 후보 수에 비례해 짧게 유지되는지도 함께 본다.
    """
    client.post(ITEMS_URL, headers=auth, json={"size_id": real_size_ids[0]})
    client.post(INSIGHT_URL, headers=auth, json={})

    prompt = fake_llm["user"]
    assert "대표가" in prompt or "시세 지표 없음" in prompt
    # 거래 수백 건을 넘기면 수만 자가 된다. 후보 1건이면 훨씬 짧아야 한다.
    assert len(prompt) < 2000


def test_llm_failure_returns_503(client, auth, real_size_ids, monkeypatch):
    """LLM이 죽어도 503으로 안내한다. 분석 실패로 500이 나면 안 된다."""
    from app.insight import llm as llm_module

    def _boom(*a, **kw):
        raise llm_module.LLMUnavailable("AI 분석 서버에 연결하지 못했습니다.")

    monkeypatch.setattr(service.llm, "ask_json", _boom)
    monkeypatch.setattr(service.llm, "is_configured", lambda: True)

    client.post(ITEMS_URL, headers=auth, json={"size_id": real_size_ids[0]})
    res = client.post(INSIGHT_URL, headers=auth, json={})
    assert res.status_code == 503
