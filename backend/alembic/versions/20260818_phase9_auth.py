"""phase 9 optional authentication and text-only history

Revision ID: 20260818_phase9
"""

from alembic import op
import sqlalchemy as sa

revision = "20260818_phase9"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "repair_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("summary_json", sa.Text(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_repair_history_owner_id", "repair_history", ["owner_id"])


def downgrade() -> None:
    op.drop_table("repair_history")
    op.drop_table("users")
