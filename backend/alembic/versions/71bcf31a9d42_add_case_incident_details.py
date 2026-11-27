"""add incident category and date to cases

Revision ID: 71bcf31a9d42
Revises: 2585e2a2a489
Create Date: 2026-11-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "71bcf31a9d42"
down_revision: Union[str, None] = "2585e2a2a489"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("incident_category", sa.String(), nullable=True))
    op.add_column("cases", sa.Column("incident_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "incident_date")
    op.drop_column("cases", "incident_category")