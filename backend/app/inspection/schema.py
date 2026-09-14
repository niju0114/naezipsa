"""모바일 임장 API 입력과 응답. 매물 ID는 dashboard_items.id다."""
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

Score = Annotated[int, Field(strict=True, ge=1, le=3)]
Facility = Annotated[int, Field(strict=True, ge=0, le=1)]
Rating = Annotated[int, Field(strict=True, ge=1, le=5)]


class InspectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transport: Score | None = None
    commute_road: Score | None = None
    school: Score | None = None
    academy: Score | None = None
    convenience: Score | None = None
    noise: Score | None = None
    harmful_facility: Facility | None = None
    parking: Score | None = None
    sunlight: Score | None = None
    natural_light: Score | None = None
    leak_mold: Score | None = None
    wallpaper: Score | None = None
    water_pressure: Score | None = None
    toilet_drain: Score | None = None
    drain_smell: Score | None = None
    window_condition: Score | None = None
    heating: Score | None = None
    floor_noise: Score | None = None
    overall_rating: Rating
    memo: str = Field(default="", max_length=2000)


class InspectionCreated(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    property_id: int
    created_at: datetime


class InspectionProperty(BaseModel):
    id: int
    size_id: int
    complex_name: str | None
    dong: str | None
    ho: str | None
    representative_area: float | None
    pyeong: int | None
    floor: int | None
    list_price: int | None
