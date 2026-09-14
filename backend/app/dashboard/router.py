"""[dashboard] router — 후보 매물·대시보드 엔드포인트 (A-03~A-09).

흐름   main ▶ security ▶ deps ▶ ★router ▶ service ▶ model / schema
경로   /api/v1/dashboard, /api/v1/dashboard/items[/{id}[/details|/status]]
소유   A

A-03~A-09: 후보 매물 CRUD와 대시보드 집계.

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
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_profile
from app.core.database import get_db
from app.dashboard.model import (
    MAX_DASHBOARD_GROUPS,
    MAX_DASHBOARD_ITEMS,
    DashboardItem,
    DashboardItemGroup,
    DashboardShare,
)
from app.inspection.model import PropertyInspection
from app.dashboard.service import (
    enrich_snapshot_items,
    get_items_with_metrics,
    replace_dashboard_items,
    size_exists,
    snapshot_current_items,
)
from app.user.model import Profile
from app.dashboard.schema import (

    DashboardItemCreateRequest,
    DashboardItemGroupCreateRequest,
    DashboardItemGroupListResponse,
    DashboardItemGroupRenameRequest,
    DashboardItemGroupSummary,
    DashboardItemListResponse,
    DashboardItemResponse,
    DashboardResponse,
    DashboardShareCreateResponse,
    DashboardShareResponse,
    ItemDeletedResponse,
    ItemDetailsRequest,
    ItemStatusRequest,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _my_items(db: Session, user_id):
    """내 후보 전체를 등록순으로, 단지명·시세 지표까지 붙여서.

    표시 순서는 프론트가 정하므로 백엔드는 등록순만 준다.
    지표를 붙이는 방법은 app/dashboard/service.py 참고.
    """
    return get_items_with_metrics(db, user_id)


def _get_owned_item(db: Session, user_id, item_id: int, *, lock: bool = False) -> DashboardItem:
    """내 후보 한 건. 없거나 남의 것이면 404.

    "없음"과 "남의 것"을 구분하지 않고 똑같이 404를 준다.
    구분해서 알려주면 "그 id는 존재한다"는 정보가 새어 나간다.
    """
    query = select(DashboardItem).where(
        DashboardItem.id == item_id,
        DashboardItem.user_id == user_id,
    )
    if lock:
        query = query.with_for_update()
    item = db.execute(query).scalar_one_or_none()

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

    프로필 + 내 후보 + 각 후보의 단지명·평형·시세 지표를 한 번에 돌려준다.
    프론트가 후보마다 B의 API를 따로 부르지 않아도 되도록 만든 것이다.

    지표는 B가 미리 계산해 둔 item_metrics_cache에서 읽는다.
    B-03(평형 기본지표)과 같은 출처라 화면 간 숫자가 어긋나지 않는다.
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
    """A-04: 내 후보 목록. 현재 로그인 사용자의 것만 나온다.

    각 후보에 단지명·평형·시세 지표가 함께 담긴다.
    아직 지표가 계산되지 않은 평형은 metrics가 null로 나간다.
    """
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

    # DB에 외래키가 있어 없는 평형은 어차피 저장되지 않지만,
    # 그대로 두면 IntegrityError가 500으로 나가 원인을 알 수 없다.
    # 미리 확인해서 404로 알려준다.
    if not size_exists(db, payload.size_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"존재하지 않는 평형입니다. (size_id={payload.size_id})",
        )

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
    item = _get_owned_item(db, profile.id, item_id, lock=True)
    if db.scalar(select(PropertyInspection.id).where(
        PropertyInspection.property_id == item.id
    ).limit(1)) is not None:
        raise HTTPException(
            status_code=409,
            detail="임장 기록이 있는 후보 매물은 삭제할 수 없습니다. 제외 상태로 변경해 주세요.",
        )
    db.delete(item)
    db.commit()
    return ItemDeletedResponse(deleted_id=item_id)


# --- 그룹 저장/불러오기 -----------------------------------------------------
#
# "그룹"은 그 시점의 관심 매물 전체를 이름 붙여 떠둔 스냅샷이다.
# 저장은 서버가 "지금 dashboard_items"에서 직접 스냅샷을 뜨고(프론트가
# 항목을 다시 보낼 필요 없음), 불러오기는 그 스냅샷으로 dashboard_items를
# 통째로 교체한다(사용자 확정: 부분 병합이 아니라 완전 교체).

@router.get("/groups", response_model=DashboardItemGroupListResponse)
def list_groups(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """저장된 그룹 목록. 하위 버튼엔 이름만 필요해서 항목은 안 담는다."""
    groups = db.execute(
        select(DashboardItemGroup)
        .where(DashboardItemGroup.user_id == profile.id)
        .order_by(DashboardItemGroup.created_at)
    ).scalars().all()
    return DashboardItemGroupListResponse(
        groups=groups, count=len(groups), max_count=MAX_DASHBOARD_GROUPS,
    )


@router.post("/groups", response_model=DashboardItemGroupSummary, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: DashboardItemGroupCreateRequest,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """지금 관심 매물을 이름 붙여 그룹으로 저장."""
    count = db.execute(
        select(func.count())
        .select_from(DashboardItemGroup)
        .where(DashboardItemGroup.user_id == profile.id)
    ).scalar_one()
    if count >= MAX_DASHBOARD_GROUPS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"그룹은 최대 {MAX_DASHBOARD_GROUPS}개까지 저장할 수 있습니다. "
                   "기존 그룹을 삭제한 뒤 다시 시도해 주세요.",
        )

    items = snapshot_current_items(db, profile.id)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="저장할 관심 매물이 없습니다. 먼저 매물을 추가해 주세요.",
        )

    group = DashboardItemGroup(user_id=profile.id, name=payload.name, items=items)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.post("/groups/{group_id}/rename", response_model=DashboardItemGroupSummary)
def rename_group(
    group_id: int,
    payload: DashboardItemGroupRenameRequest,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """그룹 이름만 바꾼다 - 저장된 매물 스냅샷(items)은 그대로 둔다."""
    group = db.execute(
        select(DashboardItemGroup).where(
            DashboardItemGroup.id == group_id,
            DashboardItemGroup.user_id == profile.id,
        )
    ).scalar_one_or_none()
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 그룹을 찾을 수 없습니다.",
        )
    group.name = payload.name
    db.commit()
    db.refresh(group)
    return group


@router.post("/groups/{group_id}/save", response_model=DashboardItemGroupSummary)
def save_group(
    group_id: int,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """지금 관심 매물 상태를 이 그룹에 덮어써 갱신한다 - 새 그룹을 만드는
    게 아니라 기존 스냅샷 자체를 교체한다. 다른 그룹을 불러온 뒤 편집한
    내용을 원래 그룹에 반영하고 싶을 때 쓴다(자동저장은 하지 않음 - 그룹은
    사용자가 명시적으로 눌러야만 바뀌는 고정 스냅샷이어야 나중에 비교
    기준으로 쓸 수 있다)."""
    group = db.execute(
        select(DashboardItemGroup).where(
            DashboardItemGroup.id == group_id,
            DashboardItemGroup.user_id == profile.id,
        )
    ).scalar_one_or_none()
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 그룹을 찾을 수 없습니다.",
        )

    items = snapshot_current_items(db, profile.id)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="저장할 관심 매물이 없습니다. 먼저 매물을 추가해 주세요.",
        )

    group.items = items
    db.commit()
    db.refresh(group)
    return group


@router.post("/groups/{group_id}/load", response_model=DashboardItemListResponse)
def load_group(
    group_id: int,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """그룹 불러오기. 지금 관심 매물 목록을 그룹 내용으로 완전히 교체한다."""
    group = db.execute(
        select(DashboardItemGroup).where(
            DashboardItemGroup.id == group_id,
            DashboardItemGroup.user_id == profile.id,
        )
    ).scalar_one_or_none()
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 그룹을 찾을 수 없습니다.",
        )

    replace_dashboard_items(db, profile.id, group.items)
    items = _my_items(db, profile.id)
    return DashboardItemListResponse(
        items=items, count=len(items), max_count=MAX_DASHBOARD_ITEMS,
    )


@router.delete("/groups/{group_id}", response_model=ItemDeletedResponse)
def delete_group(
    group_id: int,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    group = db.execute(
        select(DashboardItemGroup).where(
            DashboardItemGroup.id == group_id,
            DashboardItemGroup.user_id == profile.id,
        )
    ).scalar_one_or_none()
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 그룹을 찾을 수 없습니다.",
        )
    db.delete(group)
    db.commit()
    return ItemDeletedResponse(deleted_id=group_id)


# --- 공유 --------------------------------------------------------------
#
# 공유 링크는 "그 시점의 관심 매물"을 로그인 없이도 볼 수 있게 토큰 하나로
# 공개하는 스냅샷이다. 만든 사람만 만들 수 있지만(로그인 필요), 열람은
# 누구나 가능해야 링크 전달이라는 목적에 맞으므로 조회 엔드포인트에는
# get_current_profile을 걸지 않는다.

@router.post("/shares", response_model=DashboardShareCreateResponse, status_code=status.HTTP_201_CREATED)
def create_share(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """지금 관심 매물로 공유 링크(토큰)를 만든다. URL 조립은 프론트가 한다."""
    items = snapshot_current_items(db, profile.id)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="공유할 관심 매물이 없습니다. 먼저 매물을 추가해 주세요.",
        )

    # 추측 불가능한 랜덤 토큰. 순차 id를 그대로 노출하면 1,2,3... 순회로
    # 남의 공유를 엿볼 수 있어서 별도 컬럼으로 둔다.
    token = secrets.token_urlsafe(12)
    share = DashboardShare(token=token, owner_user_id=profile.id, items=items)
    db.add(share)
    db.commit()
    return DashboardShareCreateResponse(token=token)


@router.get("/shares/{token}", response_model=DashboardShareResponse)
def get_share(token: str, db: Session = Depends(get_db)):
    """공유 링크 미리보기. 로그인 불필요 - 링크만 있으면 누구나 조회 가능."""
    share = db.execute(
        select(DashboardShare).where(DashboardShare.token == token)
    ).scalar_one_or_none()
    if share is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="존재하지 않거나 만료된 공유 링크입니다.",
        )

    items = enrich_snapshot_items(db, share.items)
    return DashboardShareResponse(items=items, count=len(items))
