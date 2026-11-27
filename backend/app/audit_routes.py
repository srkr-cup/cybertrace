from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .auth import require_role
from .database import get_db
from .models import AuditLog

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("")
def list_audit_logs(limit: int = Query(100, ge=1, le=500),
                   db: Session = Depends(get_db),
                   _admin=Depends(require_role("admin"))):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {"id": r.id, "actor_email": r.actor_email, "action": r.action, "target_type": r.target_type,
         "target_id": r.target_id, "details": r.details, "created_at": str(r.created_at)}
        for r in rows
    ]
