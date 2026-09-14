"""로그인한 사용자의 후보 매물 조회와 모바일 임장 저장."""
from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_profile
from app.inspection import service
from app.inspection.schema import InspectionCreate, InspectionCreated, InspectionProperty
from app.user.model import Profile

router = APIRouter(prefix="/properties", tags=["inspection"])
PropertyId = Annotated[int, Path(gt=0, le=9223372036854775807)]


@router.get("/{property_id}", response_model=InspectionProperty)
def get_property(
    property_id: PropertyId,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    return service.get_property(db, profile.id, property_id)


@router.post("/{property_id}/inspection", response_model=InspectionCreated, status_code=201)
def save_inspection(
    property_id: PropertyId,
    payload: InspectionCreate,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    return service.save_inspection(db, profile.id, property_id, payload)
