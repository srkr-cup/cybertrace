# CyberTrace AI Enhancement Checklist

This tracks the requested roadmap honestly. The full master prompt is not yet complete; completed items below describe only the changes made in this implementation pass.

## Current Audit Status

| Requirement area | Status | Verified state |
|---|---|---|
| Security Overview | Partially implemented | Database-driven stats, search/filter, refresh time, severity and status views exist; community shortcuts and briefing are absent. |
| Investigation workflow | Partially implemented | Cases, evidence upload/extraction, graph, timeline, and reports exist; evidence removal and persistent analysis history are absent. |
| Evidence Correlation | Partially implemented | Documented structural links, provenance, search/type filters, zoom/reset, and JSON export exist; phone indicators are extracted from message analysis but are not yet represented as graph nodes. |
| Seven analyzers | Partially implemented | All seven endpoints and result explanations exist; save-to-case is message-only and more validation/provider handling remains. |
| Threat Intelligence | Partially implemented | VirusTotal, AbuseIPDB, and URLhaus clients exist; connectivity status and malformed-target handling need more work. |
| Cybercrime Knowledge Centre | Completed and tested | Public backend endpoint and searchable bilingual detail UI cover 20 topics; content is code-maintained, not persisted in the database. |
| Indian/global news, advisories, newsletters, weekly summary | Not implemented | No publication models, ingestion APIs, cache, or pages exist. |
| Local daily news sync | Not implemented | No scheduler or refresh job exists. |
| Official contact directory | Partially implemented | Public searchable/filterable directory has actionable Indian and international contacts, source links, and verification labels; CERT-In direct details and the CISA reporting destination are explicitly not verified, and contact data is code-maintained. |
| Citizen Safety Portal | Partially implemented | Public bilingual SMS/WhatsApp and URL checks use existing backend analysis, show extracted URLs/domains/phones, and link to lessons/help; broader safety modules remain open. |
| Academy and quiz | Partially implemented | Twenty bilingual guide-based Academy lessons each include a comprehension check; a separate ten-question bilingual quiz is backend-scored. Lesson/quiz progress is not persisted. |
| Cybercrime Reporting Assistant | Partially implemented | Public bilingual guides cover six incident types and distinguish India 1930 financial response; no complaint submission occurs and other requested topics remain open. |
| English/Telugu support | Partially implemented | Knowledge Centre, Academy, quiz, citizen checker, contacts chrome, and reporting guide have bilingual UI/content; some international contact text and technical terms remain English. |
| Investigation reports | Partially implemented | Authenticated PDF/JSON case reports include case/evidence/indicators/relationships; analyzer/provider results and recommendations are not persisted into reports. |
| Database/migrations | Partially implemented | Existing schema and additive incident metadata migration are present; education/news/contact/quiz persistence is absent. |
| Live external provider/news checks | Blocked/unverified | No live provider connectivity or news retrieval test has been performed; credentials configured locally do not prove that providers are reachable or keys are valid. |

## Status Definitions
- **Completed and tested**: implementation and an executable test verify the user-facing data flow.
- **Partially implemented**: some working functionality exists, but one or more requested behaviors are absent or unverified.
- **Not implemented**: no functional end-to-end feature is present.
- **Blocked by missing credentials or external services**: the local code cannot establish external operation without valid credentials or reachable sources; no result is assumed.

## Phase 1: Inspect Existing Application
- [x] Identify the React/Vite frontend, FastAPI backend, SQLAlchemy persistence, SQLite default, routes, authentication, and existing tests.
- [x] Confirm the existing analyzers, correlation engine, threat-intelligence clients, reports, and local configuration surfaces.
- [ ] Complete a route-by-route security and behavior audit.

## Phase 2: Dashboard
- [x] Keep dashboard statistics sourced from backend database queries.
- [x] Make statistic tiles navigate to investigations.
- [x] Add refresh timestamp and loading state.
- [x] Show status distribution and canonical severity buckets, keeping unknown values unclassified.
- [x] Add full investigation search and status filtering.
- [x] Group existing investigator navigation and add a collapsible mobile sidebar; stack the investigations layout on narrow screens.
- [ ] Add investigation quick actions, threat-intelligence summary, and community safety briefing/contact shortcuts.

## Phase 3: Investigations, Correlation, and Reports
- [x] Require authentication for stats, graph, timeline, report, and AI case-context routes.
- [x] Keep report downloads working through authenticated requests.
- [x] Add validated incident category/date fields, case title/description editing, and display the metadata in case reports.
- [ ] Add evidence removal confirmation, analysis history, and richer case detail views.
- [x] Expose recorded evidence sources and extraction timestamps on graph nodes; add search/type filters, zoom/reset, and JSON export.

## Phase 4: Analyzers
- [x] Add plain-language, result-derived summaries and retain collapsible technical JSON details.
- [x] Use insufficient-information language instead of treating absent findings as proof of safety.
- [x] Add message clear and opt-in save-to-investigation evidence flow.
- [ ] Review remaining analyzer validation, upload limits, provider metadata, and error handling end to end.

## Phase 5: Threat Intelligence
- [ ] Review provider request behavior, response detail, timeout/rate-limit handling, and configuration/connectivity states.

## Phase 6: Cybersecurity Intelligence Centre
- [ ] Verify official sources and implement local cached retrieval, refresh, deduplication, and scheduling.

## Phase 7: Cyber Helpdesk and Official Contacts
- [x] Add public backend directory API with country/category/search filtering and source/verification labels.
- [x] Verify National Cyber Crime Portal, 1930, current Andhra Pradesh directory row, UK NCSC, ENISA, and Australian ACSC links against official pages.
- [ ] Recheck CERT-In direct phone/email; currently omitted as unverified. CISA reporting destination redirected during verification and is explicitly not verified.
- [x] Add call, email, copy, and official website actions in the frontend.
- [ ] Persist directory records in the database; currently curated in backend code.

## Phase 8: Citizen Safety Portal
- [x] Publish standalone public routes for Citizen Safety, the bilingual Knowledge Centre, quiz, reporting assistant, and contacts directory.
- [x] Add bilingual guidance for 20 cybercrime categories with search, topic filters, and official reporting links.
- [x] Add SMS/WhatsApp message checking with real translated analyzer responses and a URL checker with external reputation explicitly opt-in.
- [x] Add quick links from the Citizen Safety Portal to localized crime-guide searches.
- [ ] Review Telugu translations with a fluent reviewer; several technical terms remain in English as identifiers or proper names.

## Phase 9: Academy, Telugu, and Quiz
- [x] Add 20 bilingual Academy lessons reusing the verified topic guidance, with warning signs, examples, prevention, incident steps, and a per-lesson comprehension check.
- [x] Add a public bilingual ten-question quiz with backend scoring, explanations, retry, and persistent language preference.
- [ ] Add persisted quiz attempts/progress tracking.

## Phase 10: Cybercrime Reporting Assistant
- [x] Add a public bilingual guided page covering financial fraud, phishing, account compromise, cyberbullying, identity misuse, and suspicious contact.
- [ ] Expand to all requested incident categories and persist user-generated incident notes only with explicit consent.

## Phase 11: Database, Security, and Testing
- [x] Add authentication regression coverage for protected case-derived endpoints.
- [x] Isolate API credentials in tests so local `.env` values cannot change provider-state assertions.
- [x] Add and apply an additive Alembic migration for case incident metadata.
- [ ] Review all routes for authorization, evidence isolation, safe uploads, and local data retention.
- [ ] Add migrations and focused tests for the remaining persisted modules.

## Validation This Pass
- Backend: `40 passed` with the existing backend virtual environment (279 deprecation warnings).
- Frontend: `npm run build` passed.
- Existing SQLite database migrated to `71bcf31a9d42`; only nullable case metadata columns were added.
- New endpoint: public `GET /api/knowledge/crimes?language=en|te&q=...`; no schema changes or database persistence were added for educational content.
- New quiz endpoints: public `GET /api/education/quiz?language=en|te` and `POST /api/education/quiz/score`; answers are scored server-side, but attempts are not persisted.
- Additional education endpoint: public `GET /api/education/reporting-guide?language=en|te`; six topic-specific guides and no automated complaint submission.
- Academy uses the public bilingual knowledge catalogue; each lesson has an interactive check derived from its prevention guidance.
- New contacts endpoint: public `GET /api/contacts` supports `q`, `country`, and `category` filters.
- New public routes: `/citizen`, `/knowledge`, `/academy`, `/quiz`, `/report-cybercrime`, and `/contacts`.
- Message analysis returns extracted URLs, domains, and normalized phone-number indicators; the citizen UI displays those values.
- URL analyzer accepts `check_reputation`; it defaults to enabled for compatibility, but the citizen URL checker defaults it off.
- Official-source verification: `https://cybercrime.gov.in/` confirms financial cyber fraud helpline 1930 and the live Andhra Pradesh state directory row; `https://www.cert-in.org.in/` confirms CERT-In's incident-response role. CISA's reporting destination could not be verified and is labeled accordingly.
- Live browser checks exercised bilingual knowledge content, Academy comprehension feedback, citizen message analysis and URL structure analysis with external reputation disabled, quiz scoring/retry, and sourced contact actions.
