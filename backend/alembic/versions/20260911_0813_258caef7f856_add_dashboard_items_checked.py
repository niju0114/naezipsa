"""add dashboard_items checked column

Revision ID: 258caef7f856
Revises: 98a4d5fa65f8
Create Date: 2026-09-11 08:13:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '258caef7f856'
down_revision: Union[str, Sequence[str], None] = '98a4d5fa65f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    dashboard_items.checked 컬럼 추가.

    대시보드 카드의 체크박스(차트 비교에 포함할지 여부)는 지금까지 프론트
    로컬 상태로만 관리됐다 - 그래서 로그아웃 후 재로그인하면 서버에서 새로
    불러온 항목은 항상 checked=true로 초기화돼, 사용자가 꺼뒀던 체크가
    풀리는 문제가 있었다. status(검토중/관심/제외)와는 다른 개념이라
    (하나는 "차트에 보일지", 하나는 "이 매물을 어떻게 생각하는지") 별도
    컬럼으로 둔다.

    server_default='true'로 둬서, 기존에 이미 저장돼 있던 행(체크 여부를
    저장할 컬럼이 아예 없었던 시절 데이터)도 지금까지의 프론트 기본값과
    동일하게 전부 체크된 상태로 채워진다.
    """
    op.add_column(
        "dashboard_items",
        sa.Column("checked", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("dashboard_items", "checked")
