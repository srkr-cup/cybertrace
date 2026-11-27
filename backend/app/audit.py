from sqlalchemy.orm import Session
from .models import AuditLog


def log_action(db: Session, action: str, actor_email: str = None, target_type: str = None,
                target_id: str = None, details: str = ""):
    entry = AuditLog(
        actor_email=actor_email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
    db.commit()
    return entry
