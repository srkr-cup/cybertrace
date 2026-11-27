import os
import hashlib
from datetime import date, datetime
from typing import Optional, Literal

from dotenv import load_dotenv
load_dotenv()  # loads backend/.env if present — safe no-op if it doesn't exist

from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import init_db, get_db
from .models import Case, Evidence, Entity, EntityRelationship
from .correlation import extract_entities, build_relationships
from .audit import log_action
from . import auth as auth_module
from . import email_analyzer, url_analyzer, ip_analyzer, file_analyzer
from . import network_analyzer, log_analyzer, ai_copilot
from . import reports, timeline, audit_routes, jobs, message_analyzer, knowledge_base, education, contact_directory, threat_intel

app = FastAPI(title="CyberTrace AI API")

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# Module routers — each is independently real/working; see each file's
# docstring for exactly what requires an API key or live internet to activate.
app.include_router(auth_module.router)
app.include_router(email_analyzer.router)
app.include_router(url_analyzer.router)
app.include_router(ip_analyzer.router)
app.include_router(file_analyzer.router)
app.include_router(network_analyzer.router)
app.include_router(log_analyzer.router)
app.include_router(ai_copilot.router)
app.include_router(reports.router)
app.include_router(timeline.router)
app.include_router(audit_routes.router)
app.include_router(jobs.router)
app.include_router(message_analyzer.router)
app.include_router(knowledge_base.router)
app.include_router(education.router)
app.include_router(contact_directory.router)
app.include_router(threat_intel.router)


# ---------- Schemas ----------

IncidentCategory = Literal[
    "Phishing",
    "Fake OTP or Bank Message",
    "UPI Fraud",
    "Fake Job Offer",
    "Lottery Scam",
    "Fake Loan Application",
    "Social Media Account Compromise",
    "Cyberbullying",
    "Suspicious Website",
    "Other Cybercrime",
]


class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    incident_category: Optional[IncidentCategory] = None
    incident_date: Optional[date] = None
    severity: Literal["low", "medium", "high", "critical"] = "medium"


class CaseOut(BaseModel):
    id: str
    title: str
    description: str
    incident_category: Optional[str]
    incident_date: Optional[date]
    severity: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaseStatusUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    incident_category: Optional[IncidentCategory] = None
    incident_date: Optional[date] = None
    status: Optional[Literal["new", "investigating", "containment", "resolved", "closed"]] = None
    severity: Optional[Literal["low", "medium", "high", "critical"]] = None


# ---------- Cases ----------

@app.get("/api/cases", response_model=list[CaseOut])
def list_cases(db: Session = Depends(get_db),
              _user=Depends(auth_module.require_role("admin", "investigator", "viewer"))):
    return db.query(Case).order_by(Case.created_at.desc()).all()


@app.post("/api/cases", response_model=CaseOut)
def create_case(payload: CaseCreate, db: Session = Depends(get_db),
               user=Depends(auth_module.require_role("admin", "investigator"))):
    case = Case(
        title=payload.title,
        description=payload.description,
        incident_category=payload.incident_category,
        incident_date=payload.incident_date,
        severity=payload.severity,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    log_action(db, "case.create", actor_email=user.email, target_type="case", target_id=case.id,
               details=f"title={payload.title}, category={payload.incident_category}")
    return case


@app.get("/api/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db),
            _user=Depends(auth_module.require_role("admin", "investigator", "viewer"))):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case


@app.patch("/api/cases/{case_id}", response_model=CaseOut)
def update_case(case_id: str, payload: CaseStatusUpdate, db: Session = Depends(get_db),
               user=Depends(auth_module.require_role("admin", "investigator"))):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    if payload.title is not None:
        case.title = payload.title
    if "description" in payload.model_fields_set:
        case.description = payload.description or ""
    if "incident_category" in payload.model_fields_set:
        case.incident_category = payload.incident_category
    if "incident_date" in payload.model_fields_set:
        case.incident_date = payload.incident_date
    if payload.status:
        case.status = payload.status
    if payload.severity:
        case.severity = payload.severity
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    log_action(db, "case.update", actor_email=user.email, target_type="case", target_id=case.id,
               details=f"status={payload.status}, severity={payload.severity}, category={payload.incident_category}")
    return case


# ---------- Evidence upload + correlation ----------

@app.post("/api/cases/{case_id}/evidence")
async def upload_evidence(
    case_id: str,
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    evidence_type: str = Form("text"),
    db: Session = Depends(get_db),
    user=Depends(auth_module.require_role("admin", "investigator")),
):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    if file is not None:
        content_bytes = await file.read()
        filename = file.filename
        try:
            text_content = content_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text_content = ""
    elif raw_text is not None:
        content_bytes = raw_text.encode("utf-8")
        filename = "pasted-text.txt"
        text_content = raw_text
    else:
        raise HTTPException(400, "Provide a file or raw_text")

    ev = Evidence(
        case_id=case_id,
        filename=filename,
        evidence_type=evidence_type,
        size_bytes=len(content_bytes),
        md5=hashlib.md5(content_bytes).hexdigest(),
        sha1=hashlib.sha1(content_bytes).hexdigest(),
        sha256=hashlib.sha256(content_bytes).hexdigest(),
        raw_text=text_content,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    # --- Correlation: extract entities from this evidence and link into the case graph ---
    found = extract_entities(text_content)
    entities_by_type_and_id = {}
    new_entity_count = 0

    for etype, values in found.items():
        entities_by_type_and_id.setdefault(etype, {})
        for val in values:
            existing = (
                db.query(Entity)
                .filter(Entity.case_id == case_id, Entity.entity_type == etype, Entity.value == val)
                .first()
            )
            if existing:
                entities_by_type_and_id[etype][val] = existing.id
                continue
            ent = Entity(case_id=case_id, entity_type=etype, value=val, first_seen_evidence_id=ev.id)
            db.add(ent)
            db.flush()
            entities_by_type_and_id[etype][val] = ent.id
            new_entity_count += 1

            # link entity to this piece of evidence
            db.add(EntityRelationship(
                case_id=case_id,
                source_entity_id=ent.id,
                target_entity_id=ent.id,
                relationship_type="ARTIFACT_FOUND_IN_EVIDENCE",
                evidence_id=ev.id,
                confidence="observed",
                explanation=f"'{val}' extracted directly from evidence '{filename}'.",
            ))

    # also link pre-existing entities re-found in this evidence
    for etype, values in found.items():
        for val in values:
            eid = entities_by_type_and_id[etype][val]
            already = (
                db.query(EntityRelationship)
                .filter(
                    EntityRelationship.case_id == case_id,
                    EntityRelationship.source_entity_id == eid,
                    EntityRelationship.evidence_id == ev.id,
                    EntityRelationship.relationship_type == "ARTIFACT_FOUND_IN_EVIDENCE",
                )
                .first()
            )
            if not already:
                db.add(EntityRelationship(
                    case_id=case_id,
                    source_entity_id=eid,
                    target_entity_id=eid,
                    relationship_type="ARTIFACT_FOUND_IN_EVIDENCE",
                    evidence_id=ev.id,
                    confidence="observed",
                    explanation=f"'{val}' also found in evidence '{filename}'.",
                ))

    structural_rels = build_relationships(entities_by_type_and_id)
    for source_id, target_id, rtype, confidence, explanation in structural_rels:
        exists = (
            db.query(EntityRelationship)
            .filter(
                EntityRelationship.source_entity_id == source_id,
                EntityRelationship.target_entity_id == target_id,
                EntityRelationship.relationship_type == rtype,
            )
            .first()
        )
        if not exists:
            db.add(EntityRelationship(
                case_id=case_id,
                source_entity_id=source_id,
                target_entity_id=target_id,
                relationship_type=rtype,
                evidence_id=ev.id,
                confidence=confidence,
                explanation=explanation,
            ))

    db.commit()
    log_action(db, "evidence.upload", actor_email=user.email, target_type="evidence", target_id=ev.id,
               details=f"case={case_id}, filename={filename}, sha256={ev.sha256}")

    return {
        "evidence_id": ev.id,
        "filename": filename,
        "sha256": ev.sha256,
        "sha1": ev.sha1,
        "md5": ev.md5,
        "size_bytes": ev.size_bytes,
        "entities_extracted": new_entity_count,
        "entities_found_total": sum(len(v) for v in found.values()),
    }


@app.get("/api/cases/{case_id}/evidence")
def list_evidence(case_id: str, db: Session = Depends(get_db),
                 _user=Depends(auth_module.require_role("admin", "investigator", "viewer"))):
    items = db.query(Evidence).filter(Evidence.case_id == case_id).order_by(Evidence.uploaded_at.desc()).all()
    return [
        {"id": e.id, "filename": e.filename, "evidence_type": e.evidence_type,
         "size_bytes": e.size_bytes, "md5": e.md5, "sha1": e.sha1, "sha256": e.sha256,
         "uploaded_at": e.uploaded_at}
        for e in items
    ]


# ---------- Correlation graph ----------

@app.get("/api/cases/{case_id}/graph")
def get_graph(case_id: str, db: Session = Depends(get_db),
              _user=Depends(auth_module.require_role("admin", "investigator", "viewer"))):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    artifact_links = (
        db.query(EntityRelationship, Evidence)
        .join(Evidence, EntityRelationship.evidence_id == Evidence.id)
        .filter(
            EntityRelationship.case_id == case_id,
            EntityRelationship.relationship_type == "ARTIFACT_FOUND_IN_EVIDENCE",
        )
        .order_by(Evidence.uploaded_at.asc())
        .all()
    )
    sources_by_entity = {}
    for relationship, evidence in artifact_links:
        sources_by_entity.setdefault(relationship.source_entity_id, []).append({
            "evidence_id": evidence.id,
            "filename": evidence.filename,
            "uploaded_at": evidence.uploaded_at,
        })
    rels = (
        db.query(EntityRelationship)
        .filter(EntityRelationship.case_id == case_id, EntityRelationship.relationship_type != "ARTIFACT_FOUND_IN_EVIDENCE")
        .all()
    )

    nodes = [
        {
            "id": e.id,
            "type": e.entity_type,
            "value": e.value,
            "first_seen_at": e.created_at,
            "first_seen_evidence_id": e.first_seen_evidence_id,
            "sources": sources_by_entity.get(e.id, []),
        }
        for e in entities
    ]
    edges = [
        {
            "source": r.source_entity_id,
            "target": r.target_entity_id,
            "type": r.relationship_type,
            "confidence": r.confidence,
            "explanation": r.explanation,
        }
        for r in rels
        if r.source_entity_id != r.target_entity_id
    ]

    return {"nodes": nodes, "edges": edges}


# ---------- Dashboard stats ----------

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db),
              _user=Depends(auth_module.require_role("admin", "investigator", "viewer"))):
    total_cases = db.query(func.count(Case.id)).scalar() or 0
    open_cases = db.query(func.count(Case.id)).filter(Case.status.in_(["new", "investigating", "containment"])).scalar() or 0
    resolved_cases = db.query(func.count(Case.id)).filter(Case.status.in_(["resolved", "closed"])).scalar() or 0
    total_evidence = db.query(func.count(Evidence.id)).scalar() or 0
    total_entities = db.query(func.count(Entity.id)).scalar() or 0
    severity_rows = db.query(Case.severity, func.count(Case.id)).group_by(Case.severity).all()
    status_rows = db.query(Case.status, func.count(Case.id)).group_by(Case.status).all()
    entity_type_rows = db.query(Entity.entity_type, func.count(Entity.id)).group_by(Entity.entity_type).all()

    recent_cases = (
        db.query(Case).order_by(Case.updated_at.desc()).limit(5).all()
    )

    return {
        "total_cases": total_cases,
        "open_cases": open_cases,
        "resolved_cases": resolved_cases,
        "total_evidence": total_evidence,
        "total_entities": total_entities,
        "severity_distribution": {s: c for s, c in severity_rows},
        "status_distribution": {s: c for s, c in status_rows},
        "entity_type_distribution": {t: c for t, c in entity_type_rows},
        "recent_cases": [
            {"id": c.id, "title": c.title, "status": c.status, "severity": c.severity, "updated_at": c.updated_at}
            for c in recent_cases
        ],
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "CyberTrace AI API"}
