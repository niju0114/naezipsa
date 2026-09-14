"""merge checked-groups and inspections heads

Revision ID: b449723601b1
Revises: 667be58b68d8, c71f9a2d830e
Create Date: 2026-09-14 17:06:10.232653

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b449723601b1'
down_revision: Union[str, Sequence[str], None] = ('667be58b68d8', 'c71f9a2d830e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
