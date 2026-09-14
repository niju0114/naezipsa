"""add dashboard_item_groups and dashboard_shares tables

Revision ID: 667be58b68d8
Revises: 258caef7f856
Create Date: 2026-09-11 08:39:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '667be58b68d8'
down_revision: Union[str, Sequence[str], None] = '258caef7f856'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    관심 매물 "그룹 저장"과 "공유하기" 기능을 위한 두 테이블 추가.

    - dashboard_item_groups: 사용자가 이름 붙여 저장해둔 관심 매물 스냅샷
      (최대 8개). 항목은 JSONB 한 컬럼에 통째로 담는다 - dashboard_items처럼
      실제로 조회/수정/삭제되는 살아있는 행이 아니라 "그 시점의 스냅샷"이라
      관계형으로 쪼갤 이유가 없다.
    - dashboard_shares: 관심 매물을 로그인 없이도 볼 수 있게 링크로 공개하는
      스냅샷. 순차 id 대신 추측 불가능한 토큰으로 조회하므로 token 컬럼에
      유니크 인덱스를 건다.

    두 테이블 다 size_master/dashboard_items에 FK를 걸지 않는다 - 스냅샷
    안의 size_id는 "그 시점에 존재했던" 참조일 뿐이고, 나중에 그룹을
    불러오거나 공유를 열어볼 때 애플리케이션 코드가 직접 존재 여부를
    확인한다(app/dashboard/service.py의 enrich_snapshot_items/
    replace_dashboard_items 참고).
    """
    op.create_table(
        "dashboard_item_groups",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_dashboard_item_groups_user_id", "dashboard_item_groups", ["user_id"], unique=False
    )

    op.create_table(
        "dashboard_shares",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("token", sa.String(length=32), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_dashboard_shares_token", "dashboard_shares", ["token"], unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_dashboard_shares_token", table_name="dashboard_shares")
    op.drop_table("dashboard_shares")
    op.drop_index("ix_dashboard_item_groups_user_id", table_name="dashboard_item_groups")
    op.drop_table("dashboard_item_groups")
