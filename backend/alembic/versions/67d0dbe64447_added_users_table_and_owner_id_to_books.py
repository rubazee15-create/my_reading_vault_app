"""added users table and owner_id to books

Revision ID: 67d0dbe64447
Revises: 36c698c76eb5
Create Date: 2026-03-09 13:38:06.780283
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '67d0dbe64447'
down_revision: Union[str, Sequence[str], None] = '36c698c76eb5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Add foreign keys to books
    op.create_foreign_key('fk_books_owner', 'books', 'users', ['owner_id'], ['id'])
    op.create_foreign_key('fk_books_author', 'books', 'authors', ['author_id'], ['id'])

def downgrade() -> None:
    op.drop_constraint('fk_books_author', 'books', type_='foreignkey')
    op.drop_constraint('fk_books_owner', 'books', type_='foreignkey')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')