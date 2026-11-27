# CyberTrace AI — Project and Team Guide

## 1. Purpose

CyberTrace AI is a cyber-safety and investigation platform combining:

- Public cyber-safety information and reporting guidance.
- Authenticated case and evidence management.
- Automated extraction and structural correlation of indicators.
- Plain-language artifact analysis.
- Reports, timelines, audit history, and optional AI-assisted investigation summaries.

The platform is intended for investigators, analysts, administrators, and the public. It does not replace law enforcement, forensic procedures, incident response teams, or professional security judgment.

## 2. Architecture

```text
Vercel: React + Vite frontend
                 |
                 | HTTPS / REST / JSON
                 v
Render: FastAPI backend
                 |
                 | SQLAlchemy
                 v
Render PostgreSQL: users, cases, evidence, entities, relationships
```

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Deployed on Vercel
- Uses `VITE_API_URL` to identify the FastAPI backend
- SPA routes are rewired to `index.html` through `frontend/vercel.json`

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic migrations
- JWT access tokens and rotating refresh tokens
- SQLite for local development
- PostgreSQL for hosted production
- Deployed on Render

## 3. User Groups and Roles

### Public or unauthenticated users

Public users can access:

- Community Safety Home
- Citizen Safety Portal
- Cybercrime Knowledge Centre
- Cyber Helpdesk and Official Contacts
- Cyber Safety Academy
- Cyber Awareness Quiz
- Cybercrime Reporting Assistant
- Login and registration

Public features do not require an investigation account. Public checks provide educational guidance and are not legal or forensic determinations.

### Investigator

The default role assigned during registration.

Investigators can:

- View investigations and evidence
- Create investigations
- Edit investigation metadata and status
- Upload or paste evidence
- View correlation graphs and timelines
- Download PDF and JSON reports
- Run supported standalone analyzers
- Ask the AI investigation copilot
- Save supported message-analysis evidence

### Admin

Admins receive the same investigation capabilities as investigators, plus:

- Access to Activity History
- The ability to view audit-log entries
- Administrative account-role handling where the role-management API/UI is available

### Viewer

The viewer role can open protected investigation data and review evidence, but is intended to be read-only. The frontend disables editing controls for viewers.

## 4. Main Modules

### Community Safety Home

Provides entry points into the public cyber-safety features and directs users to the Citizen Safety Portal, reporting resources, academy, quiz, knowledge centre, and contacts.

### Security Overview

The overview is database-driven and shows:

- Total cases
- Open investigations
- Evidence artifacts
- Extracted indicators
- Severity distribution
- Case-status distribution
- Indicator-type distribution
- Recent investigations
- Search and status filtering

All figures reflect current database state after refresh.

### Investigations

Investigators can:

- Create a case with title, description, incident category, incident date, and severity.
- Change status: `new`, `investigating`, `containment`, `resolved`, or `closed`.
- Edit title and description.
- Upload text or files as evidence.
- Review stored evidence and SHA-256 hashes.
- View attack timelines derived from uploaded and recorded events.
- Generate PDF or JSON reports.
- Ask the AI copilot about the selected case.

The current cleaned deployment state should contain only records intentionally retained by the team. Users should not assume hosted data is copied from local SQLite: local and hosted databases are separate environments.

### Evidence Correlation

The correlation engine extracts indicators including:

- Domains
- Email addresses
- IP addresses
- URLs

It builds evidence relationships only from structural observations. It does not infer a DNS resolution or attacker identity merely because values appear together. The graph supports search, entity-type filtering, zoom/reset controls, provenance, and JSON export.

### Standalone Analyzers

The currently exposed UI analyzers are:

| Analyzer | Usage |
|---|---|
| Email | Paste complete headers and body; identify authentication results and suspicious structural observations. |
| URL / Domain | Parse structure, resolve DNS, and optionally perform registration/WHOIS checks. |
| File / Hash | Upload a file; calculate hashes, detect format from magic bytes, and compare YARA rules. |
| Network / PCAP | Upload `.pcap` or `.pcapng`; identify protocols and structural observations. |
| WhatsApp / Text Message | Paste a message; check warning signs and safe next steps, and optionally save the text as case evidence. |

The Logs and IP Intelligence tabs are not displayed in the current analyzer interface. Their legacy backend modules may remain present for API compatibility and should not be considered part of the supported team-facing UI unless explicitly re-enabled.

### Threat Intelligence

The separate threat-intelligence module supports:

- VirusTotal
- AbuseIPDB
- URLhaus

Provider keys are optional and should be stored in backend environment variables:

- `VIRUSTOTAL_API_KEY`
- `ABUSEIPDB_API_KEY`

With no key, the provider reports `not_configured` rather than a fabricated verdict. URLhaus is a public API integration. Live results must be treated as external-provider observations, not definitive attribution.

### AI Investigation Copilot

The copilot receives only the selected case's evidence and extracted relationships. Evidence is treated as untrusted data and the model is instructed not to follow instructions contained inside submitted evidence.

The response format separates:

- Observation
- Evidence references
- Interpretation
- Confidence
- Limitations
- Recommended next action

A valid provider API key must be configured in Render:

- `GOOGLE_API_KEY` — first choice
- `OPENAI_API_KEY` — second choice
- `ANTHROPIC_API_KEY` — final fallback

If no provider is configured, the UI explains that AI is unavailable. AI answers must be reviewed by a human investigator.

### Incident Reports

Authenticated users can download:

- JSON reports containing case metadata, evidence, indicators, relationships, and report metadata.
- PDF reports containing case details and collected findings.

Reports contain database facts and explicitly state limitations. They do not convert uncertain observations into confirmed facts.

### Citizen Safety Portal

Public bilingual tools cover:

- SMS and WhatsApp message checks
- URL checks
- Extracted links, domains, and phone indicators
- Links to lessons and official reporting guidance

External reputation is opt-in for URL checks.

### Cybercrime Knowledge Centre

Provides searchable bilingual guidance for cybercrime topics. Its content is maintained in backend code and not stored in a database in the current implementation.

### Cyber Safety Academy

Provides bilingual lessons with:

- Warning signs
- Examples
- Prevention steps
- Incident-response steps
- Per-lesson comprehension checks

Lesson progress is not persisted.

### Quiz

Provides a backend-scored bilingual quiz with explanations and retry support. Quiz attempts and progress are not persisted.

### Reporting Assistant

Provides guided information for:

- Financial fraud
- Phishing
- Account compromise
- Cyberbullying
- Identity misuse
- Suspicious contact

It helps users prepare and navigate official reporting channels. It does not submit complaints automatically.

### Cyber Helpdesk and Official Contacts

Provides searchable official contacts, categories, country labels, source links, and verification labels. It uses curated code-maintained records and is not yet persisted in the database.

Users must verify all emergency or official contact details with the relevant organization. CERT-In and CISA details that were not safely verified remain omitted or labeled.

### Activity History

Visible only to admins in the workspace shell.

Records important account, case, evidence, and status actions with:

- Actor email
- Action
- Target type and ID
- Details
- Timestamp

The log is intended for accountability. It does not replace an immutable enterprise audit system.

## 5. Authentication

Registration requirements:

- Valid email format
- Password of at least 10 characters
- Password containing a letter and a digit

Authentication uses:

- 15-minute bearer access tokens
- 14-day rotating refresh tokens
- bcrypt password hashing
- Login rate limiting by IP and email
- Single-use refresh-token rotation

Refresh tokens and login-rate limits are currently process-memory structures. A restart resets them. For production at scale, migrate refresh tokens and rate limiting to PostgreSQL or Redis.

## 6. Data Model

### Primary tables

| Table | Purpose |
|---|---|
| `users` | Account, password hash, role |
| `cases` | Investigation title, description, category, date, severity, status |
| `evidence` | Uploaded text/file metadata and raw text |
| `entities` | Extracted domains, emails, IPs, URLs, and hashes |
| `entity_relationships` | Proven structural relationships and evidence provenance |
| `audit_logs` | Administrative and case/evidence activity |
| `threat_intel_lookups` | Provider lookup results |

### Cascade behavior

Deleting a case should remove its evidence, entities, relationships, and associated case lookup records. Evidence should be deleted with explicit authorization and confirmation. Investigators and admins should verify retention obligations before deletion.

## 7. Local Development

### Prerequisites

- Python 3.12 or compatible
- Node.js and npm
- Git
- Optional Redis for Celery jobs

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8022
```

Backend documentation: `http://127.0.0.1:8022/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set the frontend environment file:

```text
VITE_API_URL=http://127.0.0.1:8022
```

Vite normally serves the UI on `http://localhost:5173`.

### Tests

```bash
cd backend
pytest -q
```

The test suite uses temporary SQLite databases and does not reuse the developer's normal database state.

### Frontend validation

```bash
cd frontend
npm run build
```

## 8. Hosted Deployment

### Render: API and database

The `render.yaml` Blueprint creates:

- `cybertrace-ai-api` — FastAPI web service
- `cybertrace-ai-db` — managed PostgreSQL database

Render environment variables:

- `DATABASE_URL` — supplied by Render database reference
- `CYBERTRACE_SECRET_KEY` — generated by Blueprint
- `FRONTEND_ORIGINS` — set to the exact Vercel URL
- Optional provider keys

Actual API URL in use:

```text
https://cybertrace-ai-api-90er.onrender.com
```

Render requires the backend to start with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Vercel: frontend

Repository import settings:

- Root directory: `frontend`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Vercel environment variable:

```text
VITE_API_URL=https://cybertrace-ai-api-90er.onrender.com
```

The production frontend URL:

```text
https://cybertrace-nu.vercel.app
```

Render CORS must include:

```text
FRONTEND_ORIGINS=https://cybertrace-nu.vercel.app
```

A CORS regex also accepts `*.vercel.app` deployments. Preview and custom domains should be explicitly added to `FRONTEND_ORIGINS` if exact-origin restrictions are required.

After changing Vercel variables, trigger a new deployment. Vite variables are embedded at build time.

## 9. Environment Variables

### Backend

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | SQLite or PostgreSQL SQLAlchemy URL | Recommended production |
| `CYBERTRACE_SECRET_KEY` | JWT signing and sessions | Production |
| `FRONTEND_ORIGINS` | Allowed frontend origins | Production |
| `VIRUSTOTAL_API_KEY` | VirusTotal lookup | Optional |
| `ABUSEIPDB_API_KEY` | AbuseIPDB lookup | Optional |
| `GOOGLE_API_KEY` | Gemini copilot | Optional |
| `GOOGLE_MODEL` | Gemini model name | Optional |
| `OPENAI_API_KEY` | ChatGPT copilot fallback | Optional |
| `OPENAI_MODEL` | OpenAI model name | Optional |
| `ANTHROPIC_API_KEY` | Anthropic copilot fallback | Optional |
| `CELERY_BROKER_URL` | Redis queue URL | Optional |
| `CELERY_RESULT_BACKEND` | Redis result backend | Optional |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Public FastAPI base URL |

Never commit `.env` files or provider keys to GitHub.

## 10. Security and Privacy

### Existing controls

- bcrypt password hashing
- JWT bearer authentication
- Short-lived access tokens
- Rotating refresh tokens
- Login rate limiting
- Role checks for protected investigation endpoints
- CORS restrictions for production frontend origins
- Uploaded evidence is not executed
- File hashes provide integrity metadata
- AI evidence is fenced and treated as untrusted
- Structural correlation avoids unsupported DNS and identity claims

### Known limitations

- Refresh-token storage and login rate-limit state are in process memory.
- Evidence and case isolation require further route-by-route authorization review.
- Uploaded file size and storage limits may need stricter production controls.
- Activity history is not a tamper-proof enterprise audit trail.
- Provider and AI results require externally valid credentials and may be unavailable or rate-limited.
- No email verification or password-reset flow is implemented.
- Quiz attempts and academy progress are not persisted.
- Contact, news, and educational content is mostly code-maintained rather than database-managed.
- The free Render Postgres database expires after 30 days and has no backups.

## 11. Troubleshooting

### Login or register says “Failed to fetch”

1. Verify `VITE_API_URL` uses the actual public Render API URL.
2. Do not use `dashboard.render.com` or a `/web/srv-*` URL.
3. Redeploy Vercel after changing Vite variables.
4. Verify `FRONTEND_ORIGINS` on Render is the exact Vercel origin.
5. Check Render API `/openapi.json` is reachable.
6. Confirm no browser extension or network policy blocks the API.

### CORS error

Set the exact Vercel origin on Render without a trailing slash:

```text
https://cybertrace-nu.vercel.app
```

Then redeploy the API.

### Registration succeeds but login fails

Check password strength and registration response. Passwords need at least 10 characters, a letter, and a digit.

### Database tables are missing

Run migrations or ensure API startup initializes schema:

```bash
alembic upgrade head
```

### Hosted database is empty

Local SQLite is separate from Render PostgreSQL. Production data must be registered or migrated separately. Do not push SQLite files or sensitive evidence into GitHub.

### Frontend route gives 404

Ensure `frontend/vercel.json` is deployed and rewrites `/(.*)` to `/index.html`.

### API spins down

Free Render web services spin down after inactivity. The first request may take about one minute.

## 12. Repository and Operations

Repository:

```text
https://github.com/srkr-cup/cybertrace
```

Render API:

```text
https://cybertrace-ai-api-90er.onrender.com
```

Vercel frontend:

```text
https://cybertrace-nu.vercel.app
```

Deploy code changes:

```bash
git add -A
git commit -m "Describe the change"
git push origin main
```

Vercel deploys the frontend automatically after a push. Render Blueprint/API deploy behavior depends on configured auto-deploy settings.

## 13. Team Responsibilities

### Developer

- Keeps frontend and backend API contracts aligned.
- Runs frontend build and backend tests.
- Never commits secrets or evidence databases.

### Investigator

- Uses real evidence only where authorized.
- Records accurate case metadata.
- Reviews every AI, analyzer, and provider result manually.
- Does not treat indicators or geolocation as confirmed identity.

### Admin

- Controls account roles and reviews activity history.
- Applies retention and deletion policies.
- Reviews external provider credentials and API quotas.
- Monitors hosted database and service capacity.

### End user

- Uses public safety guidance and official reporting channels.
- Does not submit sensitive evidence to public demos or unsecured deployments.
- Does not interpret automated output as a legal or definitive cyber verdict.
