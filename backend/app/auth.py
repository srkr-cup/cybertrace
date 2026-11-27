import os
import re
import time
import datetime
import uuid
from typing import Optional
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from passlib.context import CryptContext
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .audit import log_action

SECRET_KEY = os.environ.get("CYBERTRACE_SECRET_KEY", "dev-insecure-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15          # short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS = 14            # longer-lived refresh token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/api/auth", tags=["auth"])

PASSWORD_MIN_LENGTH = 10

# --- simple in-process login rate limiter -----------------------------------
# Keyed by (ip, email). For production scale (multiple workers), replace this
# with a Redis-backed limiter (the app already depends on redis for Celery) —
# this in-memory version is genuinely enforced but resets on process restart
# and does not share state across multiple backend processes.
_LOGIN_ATTEMPTS: dict[str, deque] = defaultdict(deque)
LOGIN_WINDOW_SECONDS = 15 * 60
LOGIN_MAX_ATTEMPTS = 5

# --- in-memory refresh-token store ------------------------------------------
# Maps refresh token -> user_id. A real production deployment should persist
# this (e.g. a refresh_tokens DB table) so rotation/revocation survives a
# restart and works across multiple backend processes; this still gives
# genuine rotation + single-use enforcement within one running process.
_REFRESH_TOKENS: dict[str, str] = {}


def _rate_limit_key(request: Optional[Request], email: str) -> str:
    ip = request.client.host if request and request.client else "unknown"
    return f"{ip}:{email.lower()}"


def check_login_rate_limit(request: Optional[Request], email: str):
    key = _rate_limit_key(request, email)
    now = time.time()
    attempts = _LOGIN_ATTEMPTS[key]
    while attempts and now - attempts[0] > LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= LOGIN_MAX_ATTEMPTS:
        retry_in = int(LOGIN_WINDOW_SECONDS - (now - attempts[0]))
        raise HTTPException(429, f"Too many login attempts. Try again in {max(retry_in, 1)} seconds.")


def record_login_attempt(request: Optional[Request], email: str):
    key = _rate_limit_key(request, email)
    _LOGIN_ATTEMPTS[key].append(time.time())


def clear_login_attempts(request: Optional[Request], email: str):
    key = _rate_limit_key(request, email)
    _LOGIN_ATTEMPTS.pop(key, None)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters.")
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain both letters and numbers.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    email: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def issue_refresh_token(user_id: str) -> str:
    """Opaque, single-use refresh token (rotated on every use)."""
    token = uuid.uuid4().hex + uuid.uuid4().hex
    _REFRESH_TOKENS[token] = user_id
    return token


def issue_token_pair(user: User) -> "TokenOut":
    access = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    refresh = issue_refresh_token(user.id)
    return TokenOut(access_token=access, refresh_token=refresh, role=user.role, email=user.email)


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """
    Dependency that enforces authentication. Note: not wired onto every
    endpoint in this prototype's other routers yet (see README) — this is
    the real mechanism; applying it project-wide is a one-line Depends()
    addition per route once you're ready to lock the API down.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_role(*roles: str):
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, f"Requires role in {roles}, you have '{user.role}'")
        return user
    return dep


@router.post("/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")
    user = User(email=payload.email, hashed_password=hash_password(payload.password), role="investigator")
    db.add(user)
    db.commit()
    db.refresh(user)
    return issue_token_pair(user)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    check_login_rate_limit(request, payload.email)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        record_login_attempt(request, payload.email)
        raise HTTPException(401, "Invalid email or password")
    clear_login_attempts(request, payload.email)
    return issue_token_pair(user)


@router.post("/refresh", response_model=TokenOut)
def refresh_token(payload: RefreshIn, db: Session = Depends(get_db)):
    user_id = _REFRESH_TOKENS.pop(payload.refresh_token, None)  # single-use: pop, don't peek
    if not user_id:
        raise HTTPException(401, "Invalid or already-used refresh token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, "User not found")
    return issue_token_pair(user)  # rotation: old refresh token is now dead, a new one is issued


@router.post("/logout")
def logout(payload: RefreshIn):
    _REFRESH_TOKENS.pop(payload.refresh_token, None)
    return {"status": "ok"}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role}


class RoleUpdateIn(BaseModel):
    role: str


@router.patch("/users/{user_id}/role")
def update_user_role(user_id: str, payload: RoleUpdateIn,
                    admin: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    if payload.role not in ("admin", "investigator", "viewer"):
        raise HTTPException(422, "Role must be admin, investigator, or viewer")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    old_role = user.role
    user.role = payload.role
    db.commit()
    db.refresh(user)
    log_action(db, "auth.role_change", actor_email=admin.email,
               target_type="user", target_id=user.id,
               details=f"{user.email}: {old_role} to {payload.role}")
    return {"id": user.id, "email": user.email, "role": user.role}
