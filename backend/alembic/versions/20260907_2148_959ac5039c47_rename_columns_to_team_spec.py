"""rename columns to team spec

Revision ID: 959ac5039c47
Revises: 9cd63fe5b46e
Create Date: 2026-09-07 21:48:08.237078

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '959ac5039c47'
down_revision: Union[str, Sequence[str], None] = '9cd63fe5b46e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    팀 "변수명 통일" 표에 맞춰 컬럼 이름을 바꾼다.
    autogenerate는 이름 변경을 "삭제 후 추가"로 만들어서 데이터가 날아가므로
    alter_column(new_column_name=...)으로 직접 작성했다.
    """
    op.alter_column("profiles", "purposes", new_column_name="service_purposes")
    op.alter_column("dashboard_items", "interior", new_column_name="interior_state")
    op.alter_column(
        "dashboard_items", "interior_state",
        existing_type=sa.String(length=50), type_=sa.String(length=20),
        existing_nullable=True,
    )
    # 상태 기본값을 팀 명세 표기(considering)로 맞춘다.
    op.alter_column(
        "dashboard_items", "status",
        existing_type=sa.String(length=20), existing_nullable=False,
        server_default="considering",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "dashboard_items", "status",
        existing_type=sa.String(length=20), existing_nullable=False,
        server_default="reviewing",
    )
    op.alter_column(
        "dashboard_items", "interior_state",
        existing_type=sa.String(length=20), type_=sa.String(length=50),
        existing_nullable=True,
    )
    op.alter_column("dashboard_items", "interior_state", new_column_name="interior")
    op.alter_column("profiles", "service_purposes", new_column_name="purposes")
