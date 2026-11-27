"""
Incident Report Generator.

JSON export reflects the database directly. PDF export is genuinely
rendered with reportlab (not a stub) — every section is built from the
same queried data as the JSON export, so the two can never drift.
"""
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

from .auth import require_role
from .database import get_db
from .models import Case, Evidence, Entity, EntityRelationship

router = APIRouter(prefix="/api/cases", tags=["reports"])


def gather_report_data(db: Session, case_id: str):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    evidence = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    rels = (
        db.query(EntityRelationship)
        .filter(EntityRelationship.case_id == case_id, EntityRelationship.relationship_type != "ARTIFACT_FOUND_IN_EVIDENCE")
        .all()
    )
    return {
        "report_generated_at": datetime.utcnow().isoformat(),
        "case": {
            "id": case.id, "title": case.title, "description": case.description,
            "incident_category": case.incident_category,
            "incident_date": case.incident_date.isoformat() if case.incident_date else None,
            "severity": case.severity, "status": case.status,
            "created_at": str(case.created_at), "updated_at": str(case.updated_at),
        },
        "evidence_collected": [
            {"id": e.id, "filename": e.filename, "type": e.evidence_type, "size_bytes": e.size_bytes,
             "md5": e.md5, "sha1": e.sha1, "sha256": e.sha256, "uploaded_at": str(e.uploaded_at)}
            for e in evidence
        ],
        "indicators": [{"id": e.id, "type": e.entity_type, "value": e.value} for e in entities],
        "relationships": [
            {"source": r.source_entity_id, "target": r.target_entity_id, "type": r.relationship_type,
             "confidence": r.confidence, "explanation": r.explanation}
            for r in rels
        ],
        "limitations": [
            "This report reflects only the evidence explicitly uploaded to this case.",
            "Relationships labeled 'inferred' or 'unverified' are hypotheses, not confirmed facts.",
            "No external threat-intelligence verdicts are included unless those integrations were configured.",
        ],
    }


@router.get("/{case_id}/report.json")
def export_json(case_id: str, db: Session = Depends(get_db),
                _user=Depends(require_role("admin", "investigator", "viewer"))):
    return gather_report_data(db, case_id)


@router.get("/{case_id}/report.pdf")
def export_pdf(case_id: str, db: Session = Depends(get_db),
               _user=Depends(require_role("admin", "investigator", "viewer"))):
    data = gather_report_data(db, case_id)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"CyberTrace AI — Investigation Report", styles["Title"]))
    story.append(Paragraph(data["case"]["title"], styles["Heading2"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Case Information", styles["Heading3"]))
    case_info = [
        ["Case ID", data["case"]["id"]],
        ["Incident category", data["case"]["incident_category"] or "Not recorded"],
        ["Incident date", data["case"]["incident_date"] or "Not recorded"],
        ["Status", data["case"]["status"]],
        ["Severity", data["case"]["severity"]],
        ["Created", data["case"]["created_at"]],
        ["Report generated", data["report_generated_at"]],
    ]
    t = Table(case_info, colWidths=[1.5 * inch, 4.5 * inch])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                            ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke)]))
    story.append(t)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Description", styles["Heading3"]))
    story.append(Paragraph(data["case"]["description"] or "—", styles["BodyText"]))
    story.append(Spacer(1, 16))

    story.append(Paragraph(f"Evidence Collected ({len(data['evidence_collected'])})", styles["Heading3"]))
    if data["evidence_collected"]:
        rows = [["Filename", "Type", "SHA-256", "Uploaded"]]
        for e in data["evidence_collected"]:
            rows.append([e["filename"], e["type"], e["sha256"][:20] + "…", e["uploaded_at"][:19]])
        t = Table(rows, colWidths=[1.6 * inch, 0.9 * inch, 2.2 * inch, 1.3 * inch])
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                                ("FONTSIZE", (0, 0), (-1, -1), 8)]))
        story.append(t)
    else:
        story.append(Paragraph("No evidence uploaded.", styles["BodyText"]))
    story.append(Spacer(1, 16))

    story.append(Paragraph(f"Indicators Extracted ({len(data['indicators'])})", styles["Heading3"]))
    if data["indicators"]:
        rows = [["Type", "Value"]]
        for i in data["indicators"]:
            rows.append([i["type"], i["value"]])
        t = Table(rows, colWidths=[1.2 * inch, 4.8 * inch])
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                                ("FONTSIZE", (0, 0), (-1, -1), 8)]))
        story.append(t)
    story.append(Spacer(1, 16))

    story.append(Paragraph(f"Evidence Relationships ({len(data['relationships'])})", styles["Heading3"]))
    for r in data["relationships"]:
        story.append(Paragraph(f"<b>{r['type']}</b> ({r['confidence']}) — {r['explanation']}", styles["BodyText"]))
    story.append(Spacer(1, 16))

    story.append(Paragraph("Limitations", styles["Heading3"]))
    for l in data["limitations"]:
        story.append(Paragraph(f"• {l}", styles["BodyText"]))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=case-{case_id[:8]}-report.pdf"},
    )
