"""
Attack Timeline.

Built directly from real timestamps already in the database (evidence
upload times, entity first-seen times). No synthetic events are added to
complete a narrative — gaps are left as gaps.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .auth import require_role
from .database import get_db
from .models import Case, Evidence, Entity

router = APIRouter(prefix="/api/cases", tags=["timeline"])


@router.get("/{case_id}/timeline")
def get_timeline(case_id: str, db: Session = Depends(get_db),
                 _user=Depends(require_role("admin", "investigator", "viewer"))):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    events = []
    events.append({"timestamp": str(case.created_at), "type": "case_created", "detail": f"Case '{case.title}' created."})

    for e in db.query(Evidence).filter(Evidence.case_id == case_id).all():
        events.append({
            "timestamp": str(e.uploaded_at), "type": "evidence_uploaded",
            "detail": f"Evidence '{e.filename}' uploaded (SHA-256 {e.sha256[:12]}…).",
            "evidence_id": e.id,
        })

    for ent in db.query(Entity).filter(Entity.case_id == case_id).all():
        events.append({
            "timestamp": str(ent.created_at), "type": "indicator_extracted",
            "detail": f"{ent.entity_type.upper()} indicator '{ent.value}' extracted.",
            "entity_id": ent.id,
        })

    events.sort(key=lambda e: e["timestamp"])
    return {"case_id": case_id, "event_count": len(events), "events": events,
            "note": "Only events with a known timestamp are shown; nothing is inferred to fill gaps."}
