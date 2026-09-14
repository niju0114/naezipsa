"""소유권 확인 후 조회·저장한다. 저장 실패 시 전체 트랜잭션을 롤백한다."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard.model import DashboardItem
from app.inspection.model import PropertyInspection
from app.inspection.schema import InspectionCreate, InspectionCreated, InspectionProperty
from app.property.model import ComplexMaster, SizeMaster


def get_property(db: Session, user_id, property_id: int) -> InspectionProperty:
    row = db.execute(
        select(DashboardItem, SizeMaster, ComplexMaster)
        .outerjoin(SizeMaster, SizeMaster.id == DashboardItem.size_id)
        .outerjoin(ComplexMaster, ComplexMaster.id == SizeMaster.complex_id)
        .where(DashboardItem.id == property_id, DashboardItem.user_id == user_id)
    ).first()
    if row is None:
        raise HTTPException(404, "해당 후보 매물을 찾을 수 없습니다.")
    item, size, complex_ = row
    return InspectionProperty(
        id=item.id, size_id=item.size_id,
        complex_name=complex_.apt_nm if complex_ else None,
        dong=item.dong, ho=item.ho, floor=item.floor, list_price=item.list_price,
        representative_area=size.representative_area if size else None,
        pyeong=size.pyeong if size else None,
    )


def save_inspection(db: Session, user_id, property_id: int, payload: InspectionCreate):
    try:
        # 후보 삭제와 저장이 경합해도 소유권 확인부터 INSERT까지 일관되게 처리한다.
        item = db.execute(
            select(DashboardItem)
            .where(DashboardItem.id == property_id, DashboardItem.user_id == user_id)
            .with_for_update()
        ).scalar_one_or_none()
        if item is None:
            raise HTTPException(404, "해당 후보 매물을 찾을 수 없습니다.")
        record = PropertyInspection(property_id=item.id, **payload.model_dump())
        db.add(record)
        db.flush()
        result = InspectionCreated.model_validate(record)
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise
