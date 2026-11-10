# Emergency Response & Disaster Management Platform (CRISISPULSE)
**Round 1: Emergency Incident Reporting & Monitoring**

A real-time emergency incident reporting and monitoring platform built for rapid crisis triage, algorithmic severity assessment, and command dispatch.

---

## Quick Start Setup

Ensure you have Node.js 18+ installed.

```bash
# 1. Install dependencies
npm install

# 2. Run Prisma database migrations (SQLite)
npx prisma migrate dev

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Severity Classification Logic (`lib/severity.ts`)

The severity of an emergency incident is determined by a pure, deterministic scoring function:

$$\text{Severity Score} = \text{Category Base} + \text{People Affected Score} + \text{Keyword Boost}$$

### 1. Category Base Score
- **Building Collapse**: +4
- **Fire Emergency**: +3
- **Medical Emergency**: +3
- **Flood**: +3
- **Road Accident**: +2
- **Other Emergencies**: +1

### 2. People Affected Score
- **0 affected**: +0
- **1 – 2 affected**: +1
- **3 – 9 affected**: +2
- **10 – 49 affected**: +3
- **50+ affected**: +4

### 3. Critical Keyword Boost (+1 each, capped at +3)
Case-insensitive pattern matching across incident title and description for:
`trapped`, `unconscious`, `explosion`, `fatal`, `dead`, `death`, `bleeding`, `children`, `collapsed`, `spreading`, `gas leak`.

### 4. Severity Mapping
- **$\le$ 3**: `LOW` (Green badge)
- **4 – 5**: `MEDIUM` (Yellow badge)
- **6 – 7**: `HIGH` (Orange badge)
- **$\ge$ 8**: `CRITICAL` (Red pulsing badge, pinned to top of incident table, red-tinted highlight)

The calculation breakdown reasons are returned as an array and displayed on the incident detail dossier (`/admin/incidents/[id]`).

---

## API Endpoints

- `POST /api/incidents` — Validates input, calculates severity, logs report.
- `GET /api/incidents` — Lists all incidents (critical incidents prioritized to top, then newest first; supports category/status/severity query filters).
- `GET /api/incidents/[id]` — Retrieves incident details with full severity scoring breakdown reasons.
- `PATCH /api/incidents/[id]` — Immediately updates status (`REPORTED` | `PENDING` | `IN_PROGRESS` | `RESOLVED`).
- `DELETE /api/incidents/[id]` — Permanently deletes an incident record.
- `GET /api/stats` — Returns aggregate counts (total, critical, pending, resolved) and category counts for charts.

---

## Reusable Components

- [`SeverityBadge`](components/SeverityBadge.tsx): Visual status pills with ping animation for `CRITICAL`.
- [`StatusBadge`](components/StatusBadge.tsx): Status indicators for Reported, Pending, In Progress, Resolved.
- [`CategoryIcon`](components/CategoryIcon.tsx): Distinct Lucide icons for each of the 6 emergency categories.
- [`StatCard`](components/StatCard.tsx): Operational KPI metrics cards.
- [`IncidentTable`](components/IncidentTable.tsx): Sortable, filterable incident feed with inline status updating and deletion modals.
- [`CategoryChart`](components/CategoryChart.tsx): Recharts visualization of incidents by emergency category.
- [`ConfirmModal`](components/ConfirmModal.tsx): Modal dialog for safe record deletion.

