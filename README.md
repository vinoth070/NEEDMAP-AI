# NEEDMAP AI

**"From Scattered Feedback to Evidence-Backed Action."**

NEEDMAP AI is a multilingual (**English + தமிழ்**), location-aware (**Leaflet + OpenStreetMap**), dark/light-themed public issue reporting, department dispatch, field-worker resolution, workforce vacancy, and Gemini AI feedback prioritization platform built with React 19, TypeScript, Tailwind CSS v4, and Express.

---

## Key Capabilities

1. **Citizen Complaint & Service Request Portal (`Report a Problem` & `My Complaints`)**
   - Guided complaint submission with automatic category-to-department routing preview and target SLA.
   - Real interactive **Leaflet + OpenStreetMap** pin selection, browser GPS location detection, or honest **Address-Only** submission (never fabricating map coordinates when none exist).
   - Validated supporting evidence uploads (**JPG, PNG, WEBP, PDF** with automatic client-side image compression for safe `localStorage` persistence).
   - Explicit **Public vs. Private** field boundaries and **Anonymous Reporting Mode** (stripping reporter identity from both public views and staff projections).
   - Unique reference ID (`CMP-2026-XXXX`) issued strictly after local storage persistence succeeds.
   - Chronological status timeline, follow-up evidence uploads, cancellation, and **Citizen Satisfaction Confirmation** (`Closed` with 1–5 rating vs. `Reopened` when unresolved).

2. **Role-Based Department & Field Worker Portals**
   - Data-layer access control (`src/services/accessControl.ts`) enforcing permissions across `Citizen`, `Department Admin`, `Field Worker`, and `Platform Admin` roles—never relying on hidden UI buttons alone.
   - **Smart Worker Matcher** (`src/utils/routingEngine.ts`) scoring field workers by department, category skill match, campus/civic service zone, availability (`Available`, `Busy`, `Off Duty`), and active task load, with honest unassigned queue explanations when no worker is free.
   - Field Worker task execution (`Accepted` → `In Progress` → `More Info Required` → `Resolved — Awaiting Confirmation`) with resolution notes and completion photos.

3. **Real Gemini AI Feedback Clustering & Evidence Verification**
   - Server-side `@google/genai` proxy (`/api/analyze` in `server.ts`) powered by `gemini-3.1-flash-lite` (with automatic `gemini-3.8-flash` fallback) for fast, structured JSON synthesis without exposing secrets to the browser.
   - Lexical sentiment calculation (`positive`, `neutral`, `negative`) and sentiment filtering in **Feedback Inbox**.
   - Deterministic quote and ID grounding (`src/utils/evidenceVerifier.ts`) checking every AI-cited `feedbackId` and quote against real inbox entries.

4. **Deterministic Priority Engine + Audited Staff Overrides**
   - Application code (`src/utils/priorityEngine.ts`) computes every opportunity score deterministically:
     $$\text{Score} = (\text{Frequency} \times w_f) + (\text{Impact} \times w_i) + (\text{Urgency} \times w_u) + (\text{Confidence} \times w_c)$$
   - Default weights: **30% Frequency / 30% User-Reported Impact / 25% Urgency / 15% Evidence Confidence** (unknown factors receive a documented neutral `50/100` score).
   - Authorized admins can record **Audited Priority Overrides** with mandatory justification while preserving the original calculated score side-by-side.

5. **Interactive Opportunity & Hotspot Map (`Opportunity Map`)**
   - Unified **Map + Ranked List**, **List Only**, and **Matrix** views plotting real geocoded complaints and grounded opportunity clusters with zoom-responsive marker clustering and honest counts for unmapped (`address_only`) records.

6. **Jobs, Fellowships & Workforce Demand Portal (`Jobs & Vacancies`)**
   - Searchable openings explicitly badged as **Sample Demo Opening** vs. **Admin-Managed Workspace Role**, in-app application submission & tracking, admin role publishing, and clearly labeled **Inferred Workforce Demand** signals derived from recurring complaint volume.

7. **Bilingual Interface (`EN | தமிழ்`) & Full Dark / Light / System Theme**
   - Instant top-bar language switching (`English` and `தமிழ்`) persisted in `localStorage` and synced to `<html lang="...">`, while preserving citizen-submitted evidence verbatim.
   - Complete Light, Dark, and System theme support across all 13 views, modals, charts, and map popups.

---

## Architecture & Directory Structure

```text
├── server.ts                         # Express + Vite server; /api/health & /api/analyze Gemini proxy
├── src/
│   ├── App.tsx                       # Root state, sticky flex shell, 13 views & guarded handlers
│   ├── i18n/                         # English & Tamil translation dictionaries + I18nProvider
│   ├── theme/                        # Light / Dark / System ThemeProvider
│   ├── types/needmap.ts              # Complete TypeScript domain models
│   ├── data/                         # Sample Northbridge Campus dataset (36 feedback + 6 complaints)
│   ├── services/
│   │   ├── accessControl.ts          # Role & privacy authorization guards
│   │   └── analysisService.ts        # Batch Gemini client, timeout handling & geo grounding
│   ├── utils/
│   │   ├── priorityEngine.ts         # Deterministic 30/30/25/15 scoring + override transparency
│   │   ├── routingEngine.ts          # Category-to-department routing, worker matcher & demand
│   │   ├── evidenceVerifier.ts       # Exact & token-overlap quote verification
│   │   ├── sentiment.ts              # Lexical feedback sentiment analyzer
│   │   ├── fileUpload.ts             # MIME/size validation & client-side image compression
│   │   ├── csvParser.ts              # RFC-compliant CSV parser & sample template generator
│   │   ├── exporters.ts              # Privacy-safe CSV, JSON backup & printable HTML exports
│   │   └── storage.ts                # Versioned localStorage persistence with v1->v2 migration
│   └── components/
│       ├── Common/                   # LeafletMapCanvas, AnalysisBanner, ConfirmDialog
│       ├── Layout/                   # Sticky Sidebar & responsive TopBar
│       └── Views/                    # All 13 citizen, operations & analytical workspace views
```

---

## Local Setup & Configuration

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure `GEMINI_API_KEY`**:
   - **In Google AI Studio**: Open **Settings > Secrets** and ensure `GEMINI_API_KEY` is attached.
   - **Local development**: Copy `.env.example` to `.env` and set `GEMINI_API_KEY="your_key_here"`.
   - API keys are read exclusively on the server (`server.ts`) and are never exposed or requested in client UI forms.

3. **Start the full-stack server (Port 3000)**:
   ```bash
   npm run dev
   ```

4. **Production build check**:
   ```bash
   npm run lint
   npm run build
   ```

---

## Data & Privacy Disclosure

- **Local Persistence**: Demo complaints, feedback items, uploaded attachments, language (`en`/`ta`), and theme preferences are stored in your browser's `localStorage` on the current device—never silently uploaded to external third-party cloud storage.
- **Honest Sample Labeling**: Preloaded Northbridge Campus complaints, 36 feedback entries, and sample job openings are explicitly badged as **Sample Demo** records so they are never confused with live municipal feeds.
