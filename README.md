# CyberTrace AI

CyberTrace AI is a cyber-safety and investigation platform built with React/Vite and FastAPI.

> **Team documentation:** Read [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for architecture, modules, roles, workflows, environment variables, deployment, security boundaries, testing, troubleshooting, and team responsibilities.

## Repository and hosted services

- GitHub: https://github.com/srkr-cup/cybertrace
- Vercel frontend: https://cybertrace-nu.vercel.app
- Render API: https://cybertrace-ai-api-90er.onrender.com

## Main features

- Public community safety pages in English/Telugu
- Authentication with investigator, viewer, and admin roles
- Investigation and evidence management
- Indicator extraction and structural correlation graphs
- Email, URL/domain, file/hash, PCAP, and text-message analyzers
- Optional threat-intelligence and AI-copilot integrations
- PDF/JSON investigation reports
- Attack timelines and admin activity history

## Local quick start

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

API documentation: `http://127.0.0.1:8022/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set:

```text
VITE_API_URL=http://127.0.0.1:8022
```

## Production deployment split

### Render

`render.yaml` creates the FastAPI API and a PostgreSQL database. It does not deploy the frontend.

Set the exact Vercel origin on the API:

```text
FRONTEND_ORIGINS=https://cybertrace-nu.vercel.app
```

### Vercel

Import `frontend` as the root directory and set:

```text
VITE_API_URL=https://cybertrace-ai-api-90er.onrender.com
```

`frontend/vercel.json` rewrites React Router paths to `index.html`.

## Testing

```bash
cd backend
pytest -q
```

```bash
cd frontend
npm run build
```

Tests use isolated temporary databases rather than the hosted or developer SQLite database.

## Safety and security

- Never commit `.env`, API keys, SQLite databases, evidence, or virtual environments.
- Review AI and threat-intelligence results as observations, not confirmed identity or intent.
- The free Render Postgres plan expires after 30 days and does not provide backups.
- Refresh-token and login-rate-limit state are process-memory state; production scaling requires Redis or database-backed storage.
- This project is an investigative aid and does not replace legal, forensic, or incident-response authorities.
