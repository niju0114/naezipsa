"""[A] group · service — 그룹 DB 로직 (Phase 4).

흐름   router ▶ ★service ▶ model
소유   A

모든 조회·변경은 "내 그룹"과 "내 후보"로 한정한다(IDOR 방지). 남의 그룹이나 후보는
없는 것과 똑같이 취급해 존재 여부를 드러내지 않는다.

어떤 함수도 dashboard_items를 지우거나 새로 만들지 않는다. 그룹이 바뀌어도 후보 id는 그대로다.
"""
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dashboard.model import DashboardItem
from app.dashboard.service import get_items_with_metrics
from app.group.model import MAX_GROUPS_PER_USER, Group, GroupItem


class GroupNotFound(Exception):
    """없거나 남의 그룹."""


class CandidateNotFound(Exception):
    """없거나 남의 후보, 또는 그룹에 들어 있지 않은 후보."""


class GroupLimitReached(Exception):
    """그룹 수 상한."""


class DuplicateGroupItem(Exception):
    """이미 그 그룹에 들어 있는 후보."""


def _owned_group(db: Session, user_id, group_id: int, *, lock: bool = False) -> Group:
    query = select(Group).where(Group.id == group_id, Group.owner_user_id == user_id)
    if lock:
        # 같은 그룹에 동시에 후보를 넣는 요청을 줄 세운다(중복 검사와 삽입 사이의 경쟁 방지).
        query = query.with_for_update()
    group = db.execute(query).scalar_one_or_none()
    if group is None:
        raise GroupNotFound()
    return group


def _require_owned_items(db: Session, user_id, item_ids: list[int]) -> None:
    if not item_ids:
        return
    owned = set(db.execute(
        select(DashboardItem.id).where(
            DashboardItem.user_id == user_id, DashboardItem.id.in_(item_ids)
        )
    ).scalars())
    if owned != set(item_ids):
        raise CandidateNotFound()


def _member_ids(db: Session, group_id: int) -> list[int]:
    # 한 요청으로 여러 후보를 넣으면 created_at이 같으므로 후보 id를 두 번째 기준으로 둔다.
    return list(db.execute(
        select(GroupItem.dashboard_item_id)
        .where(GroupItem.group_id == group_id)
        .order_by(GroupItem.created_at, GroupItem.dashboard_item_id)
    ).scalars())


def _add_members(db: Session, group: Group, item_ids: list[int]) -> None:
    db.add_all(GroupItem(group_id=group.id, dashboard_item_id=item_id) for item_id in item_ids)


def list_groups(db: Session, user_id) -> list[tuple[Group, int]]:
    rows = db.execute(
        select(Group, func.count(GroupItem.dashboard_item_id))
        .outerjoin(GroupItem, GroupItem.group_id == Group.id)
        .where(Group.owner_user_id == user_id)
        .group_by(Group.id)
        .order_by(Group.created_at, Group.id)
    ).all()
    return [(group, count) for group, count in rows]


def get_group(db: Session, user_id, group_id: int) -> Group:
    return _owned_group(db, user_id, group_id)


def group_detail(db: Session, user_id, group: Group) -> tuple[list[int], list]:
    """그룹에 넣은 순서대로 후보 id와 후보 정보(단지명·지표 포함)를 돌려준다."""
    member_ids = _member_ids(db, group.id)
    by_id = {item.id: item for item in get_items_with_metrics(db, user_id)}
    items = [by_id[item_id] for item_id in member_ids if item_id in by_id]
    return member_ids, items


def create_group(db: Session, user_id, name: str, item_ids: list[int]) -> Group:
    # 후보 등록(최대 6개)과 같은 방식으로 세어 보고 막는다.
    count = db.execute(
        select(func.count()).select_from(Group).where(Group.owner_user_id == user_id)
    ).scalar_one()
    if count >= MAX_GROUPS_PER_USER:
        raise GroupLimitReached()
    _require_owned_items(db, user_id, item_ids)

    group = Group(owner_user_id=user_id, name=name)
    db.add(group)
    db.flush()  # group.id 확보
    _add_members(db, group, item_ids)
    db.commit()
    db.refresh(group)
    return group


def rename_group(db: Session, user_id, group_id: int, name: str) -> Group:
    group = _owned_group(db, user_id, group_id)
    group.name = name
    db.commit()
    db.refresh(group)
    return group


def delete_group(db: Session, user_id, group_id: int) -> None:
    group = _owned_group(db, user_id, group_id)
    # 외래키 CASCADE가 없는 환경에서도 관계가 남지 않게 먼저 지운다. 후보(dashboard_items)는 건드리지 않는다.
    db.execute(delete(GroupItem).where(GroupItem.group_id == group.id))
    db.delete(group)
    db.commit()


def add_items(db: Session, user_id, group_id: int, item_ids: list[int]) -> Group:
    group = _owned_group(db, user_id, group_id, lock=True)
    _require_owned_items(db, user_id, item_ids)

    already = db.execute(
        select(GroupItem.dashboard_item_id).where(
            GroupItem.group_id == group.id, GroupItem.dashboard_item_id.in_(item_ids)
        )
    ).first()
    if already is not None:
        raise DuplicateGroupItem()

    _add_members(db, group, item_ids)
    group.updated_at = func.now()
    try:
        db.commit()
    except IntegrityError:
        # 검사와 삽입 사이에 다른 요청이 같은 후보를 먼저 넣은 경우. 복합 PK가 최종적으로 막는다.
        db.rollback()
        raise DuplicateGroupItem()
    db.refresh(group)
    return group


def remove_item(db: Session, user_id, group_id: int, item_id: int) -> Group:
    group = _owned_group(db, user_id, group_id)
    result = db.execute(
        delete(GroupItem).where(
            GroupItem.group_id == group.id, GroupItem.dashboard_item_id == item_id
        )
    )
    if result.rowcount == 0:
        db.rollback()
        raise CandidateNotFound()
    group.updated_at = func.now()
    db.commit()
    db.refresh(group)
    return group
