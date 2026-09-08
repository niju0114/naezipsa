"""후보 매물·대시보드 API의 요청·응답 형태 (A 담당).

DB 모델(app/dashboard/model.py)이 "저장 형태"라면, 이 파일은 "주고받는 형태"다.
대시보드 집계 응답(A-09)이 프로필을 포함하므로 user 스키마를 가져다 쓴다.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.user.schema import ProfileResponse

ItemStatus = Literal["considering", "interested", "excluded"]
Direction = Literal[
    "north", "northeast", "east", "southeast",
    "south", "southwest", "west", "northwest",
]
InteriorState = Literal["none", "partial", "full"]


# --- A-03, A-06: 선택 매물정보 ---------------------------------------------

class ItemDetailsRequest(BaseModel):
    """선택 매물정보. 전부 생략 가능하고, null을 보내면 지워진다.

    "일단 단지만 담아두고 호가는 나중에" 가 가능해야 한다.
    """

    # 호가. 단위는 **만원** (예: 13.2억 -> 132000).
    #
    # 팀 합의(2026-09-08): 국토부 원본이 만원 단위이고 B의 deal_amount가 그 값을
    # 그대로 쓰므로, 변환 코드를 아예 두지 않기로 했다. 변환 지점이 없으면
    # 변환을 빠뜨리거나 두 번 하는 실수도 없다.
    # (팀 "변수명 통일" 표의 예시 1320000000은 원 단위였는데, 이 합의로 폐기됨)
    #
    # 상한을 둔 이유: 원 단위 습관으로 1320000000을 보내면 만원 단위로는 13.2조가
    # 되는데, 그대로 저장되면 B-04 호가 괴리율이 조용히 10,000배 어긋난다.
    # 1000억원(=10,000,000만원)을 넘는 아파트 호가는 없으므로 여기서 막는다.
    list_price: int | None = Field(
        default=None, ge=0, le=10_000_000,
        description="호가. 단위는 만원 (13.2억 -> 132000)",
    )
    floor: int | None = Field(default=None, ge=-5, le=200)
    dong: str | None = Field(default=None, max_length=20)
    ho: str | None = Field(default=None, max_length=20)
    direction: Direction | None = None
    interior_state: InteriorState | None = None
    memo: str | None = Field(default=None, max_length=500)


class DashboardItemCreateRequest(ItemDetailsRequest):
    """A-03: 후보 등록 요청. 필수값은 size_id 하나뿐이다.

    user_id와 status는 서버가 정한다. 요청으로 받지 않는다.
    """

    size_id: int = Field(gt=0, description="size_master.id (평형 식별자)")


class ItemStatusRequest(BaseModel):
    """A-07: 상태 변경 전용 요청.

    선택정보 수정(A-06)과 엔드포인트를 나눈 이유: 상태 변경은 카드에서 바로 누르는
    잦은 동작이고, 선택정보 수정은 폼을 열어서 하는 별개 흐름이기 때문이다.
    """

    status: ItemStatus


# --- 응답 -----------------------------------------------------------------

class DashboardItemResponse(BaseModel):
    """후보 매물 한 건. 선택정보가 없으면 null로 나간다.

    ⚠️ 단지명·평수·시세 등 B의 분석값은 여기 없다.
       그것들을 합쳐 첫 화면을 구성하는 것은 A-09(GET /dashboard)이고,
       B의 size_master/complex_master가 이 DB로 이관된 뒤에 붙인다.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    size_id: int
    status: ItemStatus
    list_price: int | None = None
    floor: int | None = None
    dong: str | None = None
    ho: str | None = None
    direction: Direction | None = None
    interior_state: InteriorState | None = None
    memo: str | None = None
    created_at: datetime
    updated_at: datetime


class DashboardItemListResponse(BaseModel):
    """A-04: 후보 목록.

    배열을 그대로 주지 않고 count/max_count를 함께 감싼다.
    프론트가 "3 / 6" 같은 표시를 하려고 상한값을 하드코딩하지 않아도 되게 하려는 것이다.
    표시 순서는 프론트가 정하므로 백엔드는 등록순으로만 준다.
    """

    items: list[DashboardItemResponse]
    count: int
    max_count: int


class ItemDeletedResponse(BaseModel):
    """A-08: 삭제 결과."""

    deleted_id: int


class DashboardResponse(BaseModel):
    """A-09: 첫 화면용 집계 응답.

    프로필과 후보를 한 번의 호출로 내려준다.
    대시보드에서 프로필 표시 여부가 바뀌어도 이 응답을 그대로 재사용할 수 있도록
    profile을 항상 포함한다.
    """

    profile: ProfileResponse
    items: list[DashboardItemResponse]
    count: int
    max_count: int
