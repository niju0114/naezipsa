"""[A] group · schema — 그룹 API 요청·응답 모양 (Phase 4)."""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.dashboard.model import MAX_DASHBOARD_ITEMS
from app.dashboard.schema import DashboardItemWithMetrics
from app.group.model import MAX_GROUP_NAME_LENGTH


def _clean_name(value: str) -> str:
    name = value.strip()
    if not name:
        raise ValueError("그룹 이름을 입력해 주세요.")
    return name


def _unique_ids(value: list[int]) -> list[int]:
    if len(set(value)) != len(value):
        raise ValueError("같은 후보가 중복으로 들어 있습니다.")
    return value


class GroupCreateRequest(BaseModel):
    """그룹 만들기. item_ids를 생략하면 빈 그룹이다.

    - 전체 후보에서 고른 후보로 만들기  -> 고른 후보의 id
    - 기존 그룹의 후보로 새 그룹 만들기 -> 그 그룹 상세의 item_ids (원래 그룹은 그대로 남는다)
    """

    name: str = Field(min_length=1, max_length=MAX_GROUP_NAME_LENGTH)
    item_ids: list[int] = Field(default_factory=list, max_length=MAX_DASHBOARD_ITEMS)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return _clean_name(value)

    @field_validator("item_ids")
    @classmethod
    def reject_duplicate_ids(cls, value: list[int]) -> list[int]:
        return _unique_ids(value)


class GroupRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_GROUP_NAME_LENGTH)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return _clean_name(value)


class GroupItemsAddRequest(BaseModel):
    """기존 그룹에 후보 추가. 이미 그 그룹에 있는 후보가 섞여 있으면 하나도 넣지 않고 409."""

    item_ids: list[int] = Field(min_length=1, max_length=MAX_DASHBOARD_ITEMS)

    @field_validator("item_ids")
    @classmethod
    def reject_duplicate_ids(cls, value: list[int]) -> list[int]:
        return _unique_ids(value)


class GroupSummary(BaseModel):
    id: int
    name: str
    item_count: int
    created_at: datetime
    updated_at: datetime


class GroupListResponse(BaseModel):
    groups: list[GroupSummary]
    count: int
    max_count: int


class GroupDetailResponse(GroupSummary):
    """그룹 상세. item_ids는 그룹에 넣은 순서, items는 같은 순서의 후보 정보(기존 후보 응답과 같은 모양)."""

    item_ids: list[int]
    items: list[DashboardItemWithMetrics]


class GroupDeletedResponse(BaseModel):
    deleted_id: int
