"""A-03~A-09: 후보 매물 CRUD와 대시보드 집계.

기획 규칙 세 가지를 서비스 계층에서 강제한다.

  1. 한 사용자당 최대 6개              -> 7번째 등록은 409로 차단
  2. 등록 필수값은 size_id 하나뿐      -> 나머지는 나중에 채울 수 있음
  3. 남의 후보는 조회·수정·삭제 불가   -> 모든 쿼리에 user_id 조건을 함께 건다

⚠️ user_id를 요청 body나 query로 절대 받지 않는다.
   받는 순간 "남의 id를 적어 보내면 남의 데이터가 보이는" 구멍이 된다.
   사용자 식별은 오직 검증된 토큰(get_current_profile)에서만 나온다.
   status도 마찬가지로 서버가 기본값을 정한다.

⚠️ 같은 단지·같은 평형이라도 동·호가 다르면 다른 후보이므로
   (user_id, size_id) 중복은 막지 않는다. 상한은 개수(6개)로만 건다.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_profile
from app.database import get_db
from app.db_models_user import MAX_DASHBOARD_ITEMS, DashboardItem, Profile
from app.models.schemas_user import (
    DashboardItemCreateRequest,
    DashboardItemListResponse,
    DashboardItemResponse,
    DashboardResponse,
    ItemDeletedResponse,
    ItemDetailsRequest,
    ItemStatusRequest,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _my_items(db: Session, user_id) -> list[DashboardItem]:
    """내 후보 전체를 등록순으로. 표시 순서는 프론트가 정하므로 등록순만 준다."""
    return list(
        db.execute(
            select(DashboardItem)
            .where(DashboardItem.user_id == user_id)
            .order_by(DashboardItem.created_at)
        ).scalars().all()
    )


def _get_owned_item(db: Session, user_id, item_id: int) -> DashboardItem:
    """내 후보 한 건. 없거나 남의 것이면 404.

    "없음"과 "남의 것"을 구분하지 않고 똑같이 404를 준다.
    구분해서 알려주면 "그 id는 존재한다"는 정보가 새어 나간다.
    """
    item = db.execute(
        select(DashboardItem).where(
            DashboardItem.id == item_id,
            DashboardItem.user_id == user_id,
        )
    ).scalar_one_or_none()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 후보 매물을 찾을 수 없습니다.",
        )
    return item


# --- A-09: 첫 화면 집계 ----------------------------------------------------

@router.get("", response_model=DashboardResponse)
def get_dashboard(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-09: 대시보드 첫 화면을 한 번의 호출로 구성.

    ⚠️ 미완성: 지금은 프로필 + 내 후보까지만 담는다.
       단지명·평수·최근 대표가 등 B의 지표를 각 후보에 붙이는 작업은
       B의 size_master/complex_master가 이 DB로 이관된 뒤에 추가한다.
       그때 B의 서비스 함수(app/services/analytics.py)를 HTTP 호출이 아니라
       내부 함수로 재사용한다.
    """
    items = _my_items(db, profile.id)
    return DashboardResponse(
        profile=profile,
        items=items,
        count=len(items),
        max_count=MAX_DASHBOARD_ITEMS,
    )


# --- A-03, A-04: 후보 등록 / 목록 ------------------------------------------

@router.get("/items", response_model=DashboardItemListResponse)
def list_items(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-04: 내 후보 목록. 현재 로그인 사용자의 것만 나온다."""
    items = _my_items(db, profile.id)
    return DashboardItemListResponse(
        items=items,
        count=len(items),
        max_count=MAX_DASHBOARD_ITEMS,
    )


@router.post("/items", response_model=DashboardItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: DashboardItemCreateRequest,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-03: 후보 등록. 필수값은 size_id 하나뿐이다.

    최대 6개 규칙은 DB 제약으로 표현할 수 없어서(개수 상한은 CHECK로 못 건다)
    여기서 세어 보고 막는다.
    """
    count = db.execute(
        select(func.count())
        .select_from(DashboardItem)
        .where(DashboardItem.user_id == profile.id)
    ).scalar_one()

    if count >= MAX_DASHBOARD_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"후보 매물은 최대 {MAX_DASHBOARD_ITEMS}개까지 등록할 수 있습니다. "
                   "기존 후보를 삭제한 뒤 다시 시도해 주세요.",
        )

    # status는 받지 않고 DB 기본값(considering)에 맡긴다.
    item = DashboardItem(user_id=profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# --- A-05: 상세 -----------------------------------------------------------

@router.get("/items/{item_id}", response_model=DashboardItemResponse)
def get_item(
    item_id: int,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-05: 후보 상세. 선택정보가 비어 있으면 null로 나간다."""
    return _get_owned_item(db, profile.id, item_id)


# --- A-06: 선택 매물정보 수정 ----------------------------------------------

@router.patch("/items/{item_id}/details", response_model=DashboardItemResponse)
def update_item_details(
    item_id: int,
    payload: ItemDetailsRequest,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-06: 선택 매물정보 수정. 보낸 필드만 바꾼다.

        {"list_price": 1320000000}   -> 호가만 입력 (단위: 원)
        {"dong": "105", "ho": "1203"} -> 동/호만 입력
        {"memo": null}               -> 메모 삭제

    size_id와 status는 여기서 바꿀 수 없다.
    size_id를 바꾸는 것은 수정이 아니라 "지우고 새로 담기"이고,
    status는 A-07 전용 엔드포인트에서 다룬다.
    """
    item = _get_owned_item(db, profile.id, item_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


# --- A-07: 상태 변경 -------------------------------------------------------

@router.patch("/items/{item_id}/status", response_model=DashboardItemResponse)
def update_item_status(
    item_id: int,
    payload: ItemStatusRequest,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-07: 후보 상태 변경 (considering / interested / excluded).

    우선순위·표시 순서는 백엔드에서 관리하지 않는다. 상태만 바꾼다.
    """
    item = _get_owned_item(db, profile.id, item_id)
    item.status = payload.status
    db.commit()
    db.refresh(item)
    return item


# --- A-08: 삭제 -----------------------------------------------------------

@router.delete("/items/{item_id}", response_model=ItemDeletedResponse)
def delete_item(
    item_id: int,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """A-08: 후보 삭제. 남의 후보 id를 찍어 보내도 404가 나고 지워지지 않는다.

    삭제 후 남은 후보의 재정렬은 하지 않는다(표시 순서는 프론트 몫).
    """
    item = _get_owned_item(db, profile.id, item_id)
    db.delete(item)
    db.commit()
    return ItemDeletedResponse(deleted_id=item_id)
