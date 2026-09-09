"""[insight] service — 후보들을 LLM에 넘길 형태로 정리하고 결과를 조립한다.

흐름   router ▶ ★service ▶ llm ▶ 외부 LLM API
참조   app/dashboard/service.py (같은 A 소유)
소유   A (대시보드 담당)

⚠️ 팀 명세 규칙: "원본 수백 건을 LLM에 직접 전달하지 않는다."
   거래 내역을 통째로 넘기면 비용이 크고 느리며, LLM이 숫자를 잘못 세기도 한다.
   이미 계산된 지표(대표가·평단가·전세가율 등)만 표로 만들어 넘긴다.
   계산은 코드가 하고, LLM은 해석만 한다.
"""
import datetime as dt

from sqlalchemy.orm import Session

from app.dashboard.service import get_items_with_metrics
from app.insight import llm
from app.insight.schema import InsightResponse, ItemInsight

_SYSTEM_PROMPT = """당신은 한국 아파트 매매를 돕는 분석가입니다.
사용자가 후보로 담아둔 매물들의 지표를 보고 비교 분석을 제공합니다.

반드시 지킬 것:
- 주어진 숫자만 근거로 삼습니다. 데이터에 없는 사실(학군, 교통, 개발 호재 등)을
  지어내지 않습니다.
- 금액 단위는 원입니다. 사용자에게 보여줄 때는 "3억 2,000만원"처럼 읽기 쉽게 씁니다.
- 강점과 약점은 각각 1~3개, 한 줄씩 씁니다.
- 지표가 없는(null) 항목은 "거래가 적어 판단이 어렵다"고 솔직히 씁니다.
- 투자를 권유하거나 단정하지 않습니다. 판단 근거만 제시합니다.
- 모든 답변은 한국어로 씁니다."""

# LLM이 이 형태로만 답하도록 강제한다. 줄글로 오면 프론트가 파싱할 수 없다.
_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "strengths": {"type": "array", "items": {"type": "string"}},
                    "weaknesses": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["id", "strengths", "weaknesses"],
            },
        },
    },
    "required": ["summary", "items"],
}


def _describe(item) -> str:
    """후보 한 건을 LLM이 읽을 한 줄로 만든다.

    JSON을 그대로 던지지 않고 사람이 읽는 문장으로 바꾸는 이유:
    같은 정보라도 이쪽이 토큰을 덜 쓰고 LLM이 덜 헷갈린다.
    """
    parts = [f"[후보 id={item.id}]"]
    parts.append(f"{item.complex_name or '단지명 미상'}"
                 f"({item.legal_dong_name or '-'}, {item.build_year or '?'}년 준공)")
    if item.representative_area:
        parts.append(f"전용 {item.representative_area}㎡({item.pyeong}평)")

    if item.list_price:
        parts.append(f"내 호가 {item.list_price:,}원")
    for label, value in (("층", item.floor), ("동", item.dong), ("향", item.direction),
                         ("인테리어", item.interior_state)):
        if value:
            parts.append(f"{label} {value}")
    if item.memo:
        parts.append(f"내 메모: {item.memo}")

    m = item.metrics
    if m is None:
        parts.append("시세 지표 없음(거래 데이터 부족)")
    else:
        if m.recent_median_price:
            parts.append(f"최근 대표가 {m.recent_median_price:,}원")
        if m.min_price and m.max_price:
            parts.append(f"거래범위 {m.min_price:,}~{m.max_price:,}원")
        if m.price_per_pyeong:
            parts.append(f"평단가 {m.price_per_pyeong:,}원")
        if m.trade_count_3y is not None:
            parts.append(f"3년 거래 {m.trade_count_3y}건")
        if m.jeonse_ratio is not None:
            parts.append(f"전세가율 {m.jeonse_ratio}%")
        if m.last_trade_date:
            parts.append(f"최종거래 {m.last_trade_date}")

    return " / ".join(parts)


def build_insight(db: Session, user_id, item_ids: list[int] | None) -> InsightResponse:
    """내 후보들을 분석해 요약과 항목별 강점·약점을 만든다.

    item_ids를 줘도 "내 후보 중에서" 고른다. 남의 후보 id를 섞어 보내도
    애초에 목록에 없으므로 걸러진다(소유권 검사가 자동으로 따라온다).
    """
    items = get_items_with_metrics(db, user_id)
    if item_ids:
        wanted = set(item_ids)
        items = [i for i in items if i.id in wanted]

    if not items:
        raise ValueError("분석할 후보가 없습니다. 먼저 관심 매물을 담아 주세요.")

    lines = "\n".join(_describe(i) for i in items)
    user_prompt = (
        f"아래는 사용자가 담아둔 후보 매물 {len(items)}건입니다.\n\n"
        f"{lines}\n\n"
        "각 후보의 강점과 약점을 정리하고, 전체를 비교한 요약을 작성해 주세요.\n"
        "items의 id는 위 '후보 id=' 값을 그대로 사용하세요."
    )

    raw = llm.ask_json(_SYSTEM_PROMPT, user_prompt, _RESPONSE_SCHEMA)

    # LLM이 없는 id를 만들어내거나 빠뜨릴 수 있으므로 우리 목록 기준으로 맞춘다.
    by_id = {int(r["id"]): r for r in raw.get("items", []) if str(r.get("id", "")).isdigit()}
    results = [
        ItemInsight(
            id=i.id,
            strengths=by_id.get(i.id, {}).get("strengths", []),
            weaknesses=by_id.get(i.id, {}).get("weaknesses", []),
        )
        for i in items
    ]

    return InsightResponse(
        summary=raw.get("summary", ""),
        items=results,
        generated_at=dt.datetime.now(dt.timezone.utc),
    )
