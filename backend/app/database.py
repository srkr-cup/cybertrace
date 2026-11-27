import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base

# Defaults to local SQLite for zero-setup development. For production, set:
#   DATABASE_URL=postgresql+psycopg2://user:password@host:5432/cybertrace
# No model or query changes are needed either way — SQLAlchemy abstracts it.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./cybertrace.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
