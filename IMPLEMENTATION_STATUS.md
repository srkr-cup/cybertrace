# CyberTrace AI Enhancement and Deployment Status

## Current confirmed state

| Area | Status | Verified state |
|---|---|---|
| Frontend | Deployed on Vercel | `https://cybertrace-nu.vercel.app` |
| Backend | Deployed on Render | `https://cybertrace-ai-api-90er.onrender.com` |
| Database | Render PostgreSQL reference in Blueprint | Free Postgres plan; 30-day expiration limit |
| Source repository | Pushed to GitHub | `https://github.com/srkr-cup/cybertrace` |
| Auth | Working when API URL/CORS are correctly configured | Registration and login tests pass with isolated databases |
| Investigations | Cleaned to intended records | Only the retained Phishing investigation should remain in hosted/local controlled data; future cases are database-backed |
| Analyzers | Partially supported | Logs and IP Intelligence removed from the current frontend UI; other analyzer tabs remain |
| Overview | Database-driven | Counts, search/filter, distributions, and recent investigations reflect current database state |
| Community/public modules | Implemented | Citizen portal, knowledge centre, academy, quiz, reporting assistant, and contacts |
| Deployment configuration | Render API/Postgres and Vercel frontend split | `render.yaml` and `frontend/vercel.json` prepared |

## Deployment configuration

- Render Blueprint deploys only the API and PostgreSQL database.
- Vercel serves the React/Vite frontend.
- Vercel requires `VITE_API_URL=https://cybertrace-ai-api-90er.onrender.com`.
- Render requires `FRONTEND_ORIGINS=https://cybertrace-nu.vercel.app`.
- CORS has also been prepared to accept `*.vercel.app` origins.
- Vercel SPA routes are rewritten to `index.html`.
- The `.env`, SQLite database, virtual environment, and build output are excluded from GitHub.

## Security and operations

- JWT access and rotating refresh tokens are used.
- Passwords are bcrypt-hashed.
- Login attempts are rate-limited in process memory.
- Refresh-token state is process-memory state and does not survive restart or scale across processes.
- Uploaded evidence is structurally correlated; unsupported relationships are not invented.
- AI evidence is treated as untrusted data.
- External provider keys and AI keys must be Render environment secrets.
- Free Render Postgres has no backups and expires after 30 days.

## Remaining implementation work

- Add evidence deletion confirmation and persistent analysis history.
- Complete route-by-route authorization and evidence isolation review.
- Move refresh-token storage and rate limiting to PostgreSQL or Redis.
- Persist news/advisory records, contact records, quiz attempts, and lesson progress.
- Add stronger upload size and storage limits.
- Complete provider connectivity and timeout review.
- Review translations with a fluent Telugu reviewer.
- Complete the route-by-route security audit.

## Validation summary

- Frontend: `npm run build` passes.
- Vercel SPA configuration: valid.
- Render Blueprint syntax: valid.
- Render API: reachable at `https://cybertrace-ai-api-90er.onrender.com`.
- CORS: Vercel origin is allowed.
- Backend auth tests: 6 auth tests pass using isolated temporary databases.
- Full backend suite: latest local run found 39 passed and 1 existing URL-analyzer test mismatch.

See `PROJECT_DOCUMENTATION.md` for the complete team guide.
