"""[insight] schema — AI 종합분석의 요청·응답 형태 (AI-01).

흐름   router 가 입력 검증과 출력 변환에 사용
소유   A (대시보드 담당)

응답 구조를 LLM이 자유롭게 쓴 글이 아니라 고정된 형태로 못 박은 이유:
프론트가 "요약 문단 하나 + 후보별 강점/약점 목록"으로 화면을 그려야 하는데,
줄글로 받으면 파싱이 매번 깨진다. LLM에게도 이 형태로 답하라고 지시한다.
"""
from datetime import datetime

from pydantic import BaseModel, Field


class InsightRequest(BaseModel):
    """AI-01 요청. 전부 선택값이다."""

    # 특정 후보만 비교하고 싶을 때 지정한다. 생략하면 내 후보 전체.
    item_ids: list[int] | None = Field(
        default=None,
        max_length=6,
        description="분석할 후보의 id 목록. 생략하면 내 후보 전체를 분석합니다.",
    )


class ItemInsight(BaseModel):
    """후보 한 건에 대한 분석."""

    id: int
    strengths: list[str] = Field(default_factory=list, description="강점")
    weaknesses: list[str] = Field(default_factory=list, description="약점")


class InsightResponse(BaseModel):
    """AI-01 응답.

    generated_at을 함께 주는 이유: 분석은 그 시점의 시세를 기준으로 한 것이라
    나중에 다시 보면 값이 달라질 수 있다. 프론트가 "몇 시 기준" 표시를 할 수 있게 한다.
    """

    summary: str = Field(description="후보 전체를 비교한 요약")
    items: list[ItemInsight]
    generated_at: datetime
