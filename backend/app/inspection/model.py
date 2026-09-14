"""후보 매물별 임장 기록. 삭제 연쇄 없이 과거 기록을 보존한다."""
from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, Text, func

from app.core.database import Base


class PropertyInspection(Base):
    __tablename__ = "property_inspections"
    __table_args__ = (
        CheckConstraint("transport IN (1, 2, 3)", name="ck_inspections_transport"),
        CheckConstraint("commute_road IN (1, 2, 3)", name="ck_inspections_commute_road"),
        CheckConstraint("school IN (1, 2, 3)", name="ck_inspections_school"),
        CheckConstraint("academy IN (1, 2, 3)", name="ck_inspections_academy"),
        CheckConstraint("convenience IN (1, 2, 3)", name="ck_inspections_convenience"),
        CheckConstraint("noise IN (1, 2, 3)", name="ck_inspections_noise"),
        CheckConstraint("harmful_facility IN (0, 1)", name="ck_inspections_harmful_facility"),
        CheckConstraint("parking IN (1, 2, 3)", name="ck_inspections_parking"),
        CheckConstraint("sunlight IN (1, 2, 3)", name="ck_inspections_sunlight"),
        CheckConstraint("natural_light IN (1, 2, 3)", name="ck_inspections_natural_light"),
        CheckConstraint("leak_mold IN (1, 2, 3)", name="ck_inspections_leak_mold"),
        CheckConstraint("wallpaper IN (1, 2, 3)", name="ck_inspections_wallpaper"),
        CheckConstraint("water_pressure IN (1, 2, 3)", name="ck_inspections_water_pressure"),
        CheckConstraint("toilet_drain IN (1, 2, 3)", name="ck_inspections_toilet_drain"),
        CheckConstraint("drain_smell IN (1, 2, 3)", name="ck_inspections_drain_smell"),
        CheckConstraint("window_condition IN (1, 2, 3)", name="ck_inspections_window_condition"),
        CheckConstraint("heating IN (1, 2, 3)", name="ck_inspections_heating"),
        CheckConstraint("floor_noise IN (1, 2, 3)", name="ck_inspections_floor_noise"),
        CheckConstraint("overall_rating BETWEEN 1 AND 5", name="ck_inspections_rating"),
        CheckConstraint("length(memo) <= 2000", name="ck_inspections_memo"),
        Index("ix_inspections_property_created", "property_id", "created_at"),
    )

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    property_id = Column(BigInteger, ForeignKey("dashboard_items.id", name="fk_inspections_property", ondelete="RESTRICT"), nullable=False)
    transport = Column(Integer, nullable=True)
    commute_road = Column(Integer, nullable=True)
    school = Column(Integer, nullable=True)
    academy = Column(Integer, nullable=True)
    convenience = Column(Integer, nullable=True)
    noise = Column(Integer, nullable=True)
    harmful_facility = Column(Integer, nullable=True)
    parking = Column(Integer, nullable=True)
    sunlight = Column(Integer, nullable=True)
    natural_light = Column(Integer, nullable=True)
    leak_mold = Column(Integer, nullable=True)
    wallpaper = Column(Integer, nullable=True)
    water_pressure = Column(Integer, nullable=True)
    toilet_drain = Column(Integer, nullable=True)
    drain_smell = Column(Integer, nullable=True)
    window_condition = Column(Integer, nullable=True)
    heating = Column(Integer, nullable=True)
    floor_noise = Column(Integer, nullable=True)
    overall_rating = Column(Integer, nullable=False)
    memo = Column(Text, nullable=False, server_default="")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
