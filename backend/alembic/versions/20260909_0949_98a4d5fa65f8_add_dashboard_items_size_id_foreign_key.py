"""add dashboard_items size_id foreign key

Revision ID: 98a4d5fa65f8
Revises: 959ac5039c47
Create Date: 2026-09-09 09:49:38.303131

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98a4d5fa65f8'
down_revision: Union[str, Sequence[str], None] = '959ac5039c47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    dashboard_items.size_id -> size_master.id 외래키를 건다.

    B의 실거래 데이터가 이 DB로 이관되기 전에는 참조 대상이 없어서 미뤄뒀던 것이다.
    이제 size_master가 채워졌으므로(17,477행) 걸 수 있다.

    이 제약이 하는 일:
      - 존재하지 않는 평형을 후보로 담는 것을 DB 차원에서 막는다.
        (지금까지는 size_id=99999 같은 값도 그대로 저장됐다)
      - size_master에서 평형이 사라지면 그 후보도 함께 삭제된다(CASCADE).

    ⚠️ CASCADE라서 ingest/reset_data.py를 실행하면 사용자 후보가 전부 삭제된다.
       TRUNCATE ... RESTART IDENTITY CASCADE 이므로 실사용자가 생긴 뒤에는
       절대 실행하면 안 된다. (README "지켜야 할 것" 참고)

    모델에 ForeignKey로 선언하지 않은 이유는 app/dashboard/model.py 주석 참고.
    (참조 대상이 B의 metadata에 있어서 A의 Base가 해석하지 못한다)
    alembic/env.py의 HAND_MANAGED_CONSTRAINTS에 이름을 등록해 두었으므로
    autogenerate가 이 제약을 삭제하려 들지 않는다.
    """
    op.create_foreign_key(
        "fk_dashboard_items_size",
        source_table="dashboard_items", referent_table="size_master",
        local_cols=["size_id"], remote_cols=["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_dashboard_items_size", "dashboard_items", type_="foreignkey")
