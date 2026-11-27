import datetime
import uuid

from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, Integer, Float
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def gen_id():
    return str(uuid.uuid4())


class Case(Base):
    __tablename__ = "cases"
    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    incident_category = Column(String, nullable=True)
    incident_date = Column(Date, nullable=True)
    severity = Column(String, default="medium")  # low, medium, high, critical
    status = Column(String, default="new")  # new, investigating, containment, resolved, closed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="case", cascade="all, delete-orphan")
    relationships_ = relationship("EntityRelationship", back_populates="case", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(String, primary_key=True, default=gen_id)
    case_id = Column(String, ForeignKey("cases.id"))
    filename = Column(String)
    evidence_type = Column(String, default="text")  # email, text, log, generic
    size_bytes = Column(Integer, default=0)
    md5 = Column(String)
    sha1 = Column(String)
    sha256 = Column(String)
    raw_text = Column(Text, default="")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="evidence")


class Entity(Base):
    __tablename__ = "entities"
    id = Column(String, primary_key=True, default=gen_id)
    case_id = Column(String, ForeignKey("cases.id"))
    entity_type = Column(String)  # email, domain, url, ip, hash
    value = Column(String, index=True)
    first_seen_evidence_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="entities")


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="investigator")  # admin, investigator, viewer
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=gen_id)
    actor_email = Column(String, nullable=True)
    action = Column(String)  # e.g. "case.create", "evidence.upload", "case.status_change"
    target_type = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ThreatIntelLookup(Base):
    __tablename__ = "threat_intel_lookups"
    id = Column(String, primary_key=True, default=gen_id)
    case_id = Column(String, ForeignKey("cases.id"))
    entity_id = Column(String, nullable=True)
    indicator = Column(String)
    provider = Column(String)  # virustotal, abuseipdb, urlhaus
    status = Column(String, default="not_configured")  # ok, error, not_configured
    result_json = Column(Text, default="{}")
    looked_up_at = Column(DateTime, default=datetime.datetime.utcnow)


class EntityRelationship(Base):
    __tablename__ = "entity_relationships"
    id = Column(String, primary_key=True, default=gen_id)
    case_id = Column(String, ForeignKey("cases.id"))
    source_entity_id = Column(String, ForeignKey("entities.id"))
    target_entity_id = Column(String, ForeignKey("entities.id"))
    relationship_type = Column(String)  # e.g. EMAIL_CONTAINS_URL, ARTIFACT_FOUND_IN_EVIDENCE
    evidence_id = Column(String, nullable=True)
    confidence = Column(String, default="observed")  # observed, inferred, unverified
    explanation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="relationships_")
