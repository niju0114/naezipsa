"""Create property inspections linked to existing dashboard candidates."""
from alembic import op
import sqlalchemy as sa

revision = "c71f9a2d830e"
down_revision = "98a4d5fa65f8"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "property_inspections",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("property_id", sa.BigInteger(), nullable=False),
        sa.Column("transport", sa.Integer(), nullable=True),
        sa.Column("commute_road", sa.Integer(), nullable=True),
        sa.Column("school", sa.Integer(), nullable=True),
        sa.Column("academy", sa.Integer(), nullable=True),
        sa.Column("convenience", sa.Integer(), nullable=True),
        sa.Column("noise", sa.Integer(), nullable=True),
        sa.Column("harmful_facility", sa.Integer(), nullable=True),
        sa.Column("parking", sa.Integer(), nullable=True),
        sa.Column("sunlight", sa.Integer(), nullable=True),
        sa.Column("natural_light", sa.Integer(), nullable=True),
        sa.Column("leak_mold", sa.Integer(), nullable=True),
        sa.Column("wallpaper", sa.Integer(), nullable=True),
        sa.Column("water_pressure", sa.Integer(), nullable=True),
        sa.Column("toilet_drain", sa.Integer(), nullable=True),
        sa.Column("drain_smell", sa.Integer(), nullable=True),
        sa.Column("window_condition", sa.Integer(), nullable=True),
        sa.Column("heating", sa.Integer(), nullable=True),
        sa.Column("floor_noise", sa.Integer(), nullable=True),
        sa.Column("overall_rating", sa.Integer(), nullable=False),
        sa.Column("memo", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["property_id"], ["dashboard_items.id"], name="fk_inspections_property", ondelete="RESTRICT"),
        sa.CheckConstraint("transport IN (1, 2, 3)", name="ck_inspections_transport"),
        sa.CheckConstraint("commute_road IN (1, 2, 3)", name="ck_inspections_commute_road"),
        sa.CheckConstraint("school IN (1, 2, 3)", name="ck_inspections_school"),
        sa.CheckConstraint("academy IN (1, 2, 3)", name="ck_inspections_academy"),
        sa.CheckConstraint("convenience IN (1, 2, 3)", name="ck_inspections_convenience"),
        sa.CheckConstraint("noise IN (1, 2, 3)", name="ck_inspections_noise"),
        sa.CheckConstraint("harmful_facility IN (0, 1)", name="ck_inspections_harmful_facility"),
        sa.CheckConstraint("parking IN (1, 2, 3)", name="ck_inspections_parking"),
        sa.CheckConstraint("sunlight IN (1, 2, 3)", name="ck_inspections_sunlight"),
        sa.CheckConstraint("natural_light IN (1, 2, 3)", name="ck_inspections_natural_light"),
        sa.CheckConstraint("leak_mold IN (1, 2, 3)", name="ck_inspections_leak_mold"),
        sa.CheckConstraint("wallpaper IN (1, 2, 3)", name="ck_inspections_wallpaper"),
        sa.CheckConstraint("water_pressure IN (1, 2, 3)", name="ck_inspections_water_pressure"),
        sa.CheckConstraint("toilet_drain IN (1, 2, 3)", name="ck_inspections_toilet_drain"),
        sa.CheckConstraint("drain_smell IN (1, 2, 3)", name="ck_inspections_drain_smell"),
        sa.CheckConstraint("window_condition IN (1, 2, 3)", name="ck_inspections_window_condition"),
        sa.CheckConstraint("heating IN (1, 2, 3)", name="ck_inspections_heating"),
        sa.CheckConstraint("floor_noise IN (1, 2, 3)", name="ck_inspections_floor_noise"),
        sa.CheckConstraint("overall_rating BETWEEN 1 AND 5", name="ck_inspections_rating"),
        sa.CheckConstraint("length(memo) <= 2000", name="ck_inspections_memo"),
    )
    op.create_index("ix_inspections_property_created", "property_inspections", ["property_id", "created_at"])


def downgrade():
    op.drop_index("ix_inspections_property_created", table_name="property_inspections")
    op.drop_table("property_inspections")
