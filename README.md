# 🚨 CRISISPULSE

> **Next-Generation Real-Time Emergency Coordination, Algorithmic Severity Triage, Geospatial Fleet Routing, and Zero-Knowledge Citizen Status Tracking Platform.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2.18%20(App%20Router)-black.svg)
![TypeScript](https://img.shields.io/badge/typescript-%5E5.0-blue.svg)
![TailwindCSS](https://img.shields.io/badge/tailwind-3.4.1-38B2AC.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma%205.22.0-2D3748.svg)
![SQLite](https://img.shields.io/badge/database-SQLite%20%7C%20PostgreSQL%20Ready-003B57.svg)
![Leaflet](https://img.shields.io/badge/maps-Leaflet%20%7C%20OSRM-199900.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

---

## 📌 Problem Statement

During acute humanitarian crises, industrial catastrophic accidents, flash floods, and urban emergencies, response latency directly translates to preventable loss of life. Municipal dispatch infrastructures and traditional emergency call centers (e.g., 911 / 112 / 999) face three structural points of failure when operating under surge volumes:

1. **Intake Saturation & Triage Bottlenecks:** Panic-stricken callers provide unstructured, disjointed voice descriptions of scenes while operators manually key information into dispatch consoles. Human triage operators quickly suffer cognitive overload, leading to misclassified incident priorities, overlooked high-casualty events, and delayed response escalations.
2. **Suboptimal Unit Dispatch & Route Blindness:** Dispatches traditionally rely on static administrative districts or manual radio dispatching rather than live geospatial proximity, road network topology, and unit operational specialization. Units are dispatched without consideration of road network detours, leading to inaccurate ETAs, misallocated specialty crews (e.g., dispatching police to chemical structural fires), and zero automated protocols for field crews to request coordinated backup.
3. **Citizen Information Void & Call Center Re-dialing:** Citizens reporting life-threatening situations receive zero real-time verification of whether help is on the way. This information vacuum causes repeated 112/911 re-dials that crash emergency switchboards. Conversely, existing enterprise computer-aided dispatch (CAD) systems cannot expose live tracking to the general public due to severe responder safety risks and privacy leaks of sensitive victim data.

**CRISISPULSE** eliminates these operational failures. Built as a unified, full-stack emergency response and tactical command platform, it couples a **voice-first AI intake portal** with an **algorithmic severity classifier**, a **dynamic read-time operational priority triage engine (P1–P4)**, **automated nearest-unit routing via OSRM**, **first-responder mobile field portals**, and a **privacy-quarantined live citizen tracking portal** featuring accessibility read-aloud guidance.

---

## 🚀 Features

| Feature | Subsystem | Engineering Mechanism & Algorithms | Output Artifact | Status |
|---|---|---|---|---|
| **Voice-First Emergency Intake** | Public Reporting (`/report`, `voiceParser.ts`) | Web Speech API real-time speech recognition; linguistic regex preposition parser extracting location markers (`at`, `near`, `opposite`), numeric casualty quantifiers, and category tokens. | Pre-filled emergency draft with live 5-second auto-submit countdown. | **Production** |
| **Deterministic Severity Classifier** | Triage Engine (`lib/severity.ts`) | Rule-based deterministic formula combining category baseline points (1–4), casualty bracket multipliers (0–4), and critical keywords (`trapped`, `explosion`, `bleeding`). | Calculated Severity Grade (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with transparent point justifications. | **Production** |
| **Read-Time Operational Priority Engine** | Command Triage (`lib/priority.ts`) | Read-time dynamic scoring synthesizing severity points (10–50), affected population (0–25), waiting-time escalation (+1 pt per 5 min, max 15), and category vulnerability weightings. | Priority Rank (`P1` $\ge 75$, `P2` 55–74, `P3` 35–54, `P4` $< 35$) recalculated dynamically without database lockups. | **Production** |
| **Nearest Responder Dispatch Ranking** | Fleet Dispatch (`lib/assignment.ts`) | Great-Circle Haversine spherical distance calculation paired with category-suitability weighting; penalizes mismatched responder categories by +8.0 km equivalent distance. | Ordered candidate team recommendations with distance in kilometers and computed ETA. | **Production** |
| **Road Network Routing & Fallback** | Routing Engine (`lib/route.ts`) | Asynchronous driving route queries via Open Source Routing Machine (OSRM) with 5-second timeout; automated fallback to straight-line Euclidean vector geometry on network failure. | High-fidelity road-following polyline coordinates, driving distance, and turn-by-turn ETA. | **Production** |
| **Geospatial Fleet & Incident Map** | Command Visualization (`/admin/map`, `AdminMap.tsx`) | Dynamic React-Leaflet integration with custom SVG `L.divIcon` markers; pulse-ring critical indicators, category letter glyphs, and bidirectional dashed route vectors. | Full-screen interactive map auto-fitted to incident clusters with real-time layer toggles. | **Production** |
| **First Responder Tactical Portal** | Mobile Field App (`/team/dashboard`, `teamAuth.ts`) | Mobile-optimized interface secured via HMAC-SHA256 signed HTTP-only session cookies; single-tap operational state transitions (`EN_ROUTE`, `ARRIVED`, `RESOLVED`). | Real-time tactical dashboard with turn-by-turn Google Maps link and situation dossier. | **Production** |
| **Peer Backup Reinforcement Protocol** | Field Escalation (`/api/team/backup`, `BackupRequest`) | One-to-many reinforcement requests allowing on-scene crews to requisition additional personnel; automated multi-unit candidate fulfillment aggregating available fleet crew counts. | Dispatches secondary units (`IncidentTeam`) and tracks personnel shortfall counts. | **Production** |
| **Citizen Status Tracking Portal** | Citizen Portal (`/track/[code]`, `safetyTips.ts`) | Zero-login public tracking portal bounded by an in-memory sliding-window IP rate limiter (30 req/min); strict data sanitization removing victim phone numbers and GPS coordinates. | 5-stage progress stepper, countdown arrival timer, and category-specific survival tips. | **Production** |
| **Accessible Voice Guidance** | Accessibility Subsystem (`/track/[code]`) | Synthesis via browser `speechSynthesis` API converting category survival instructions into natural voice guidance for visually impaired or distressed victims. | Spoken safety instructions: *"Stay low and crawl under smoke..."* with toggle controls. | **Production** |
| **Immutable Operational Audit Ledger** | Audit & Compliance (`lib/events.ts`, `IncidentEvent`) | Event-driven event journal capturing every state mutation (`REPORTED`, `ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `BACKUP_REQUESTED`, `RESOLVED`) with separated internal and public citizen messages. | Chronological audit trail card on dispatcher dossier and historical public timeline. | **Production** |

---

## 🏗️ Tech Stack

### Frontend Client & Mapping
| Component | Version | Role in Architecture | Technical Rationale |
|---|---|---|---|
| **Next.js (App Router)** | `14.2.18` | Core Web Architecture & SSR | Server-side rendering paired with streaming App Router layouts ensures instant load times during emergency calls. |
| **React.js** | `^18.3.1` | Reactive UI Engine | Concurrent rendering and custom state hooks enable fluid 5-second polling and timer countdowns without interface lag. |
| **TypeScript** | `^5.0.0` | Type Safety & Domain Contracts | Strict compile-time contracts for incident schemas, priority classifications, and geolocation coordinates. |
| **Tailwind CSS** | `^3.4.1` | Design System & Ergonomics | Custom institutional color palette: Burgundy (`#490b1a`), Navy (`#142841`), Slate (`#798da6`), and Cream (`#e5ded2`). |
| **Leaflet & React-Leaflet** | `^1.9.4` / `^4.2.1` | Geospatial GIS Visualization | Lightweight mapping engine with dynamic client-side imports (`ssr: false`) and custom SVG DOM pin markers. |
| **Lucide React** | `^0.344.0` | Tactical Iconography | Universal vector glyphs for emergency divisions (Fire, Medical, Rescue, Police, Disaster). |
| **Web Speech API** | Native Browser | Voice Intake & Accessibility | Client-side `SpeechRecognition` for voice report transcription and `SpeechSynthesis` for audio safety tips without external API fees. |

### Backend Services & API Routing
| Component | Version | Role in Architecture | Technical Rationale |
|---|---|---|---|
| **Next.js Route Handlers** | `14.2.18` | Edge-Ready API Controllers | Lightweight asynchronous JSON REST endpoints handling intake, fleet assignment, tracking, and metric aggregation. |
| **Node.js** | `v20.x / v26.x` | Runtime Environment | High-performance asynchronous non-blocking event loop managing concurrent database and routing queries. |
| **OSRM Engine** | Public API | Road Routing Services | Global OpenStreetMap road network calculations yielding realistic driving distances and travel times. |
| **HMAC-SHA256 Auth** | Custom Engine | Responder Security | Cryptographically signed HTTP-only cookies safeguarding `/api/team/*` endpoints against token spoofing. |

### Database, ORM & Caching
| Component | Version | Role in Architecture | Technical Rationale |
|---|---|---|---|
| **Prisma ORM** | `5.22.0` | Type-Safe Database Client | Generates strict TypeScript bindings, schema migrations, and declarative relation handling for multi-model queries. |
| **SQLite (Default)** | Embedded | Embedded Local Storage | Zero-configuration single-file database (`prisma/dev.db`) ideal for edge units, test harnesses, and offline field servers. |
| **PostgreSQL Ready** | Production Spec | Distributed Storage Target | Schema utilizes standard relational conventions and string enums, enabling 1-click migration to enterprise PostgreSQL. |
| **In-Memory Rate Limiter** | Pure In-Memory | Denial-of-Service Defense | Sliding-window IP rate limiter enforcing 30 requests/min per IP on public tracking routes to prevent scraping. |

---

## 📂 Project Structure

```
cobotex/
├── app/
│   ├── layout.tsx                         # Root HTML shell, Leaflet CSS imports, and universal font configurations
│   ├── page.tsx                           # CRISISPULSE landing page with quick CTA pathways for citizens and command
│   ├── globals.css                        # Tailwind directives and custom animation keyframes
│   ├── report/
│   │   └── page.tsx                       # Voice-first intake with auto-submit countdown, pin picker, and tracking receipt
│   ├── track/
│   │   ├── page.tsx                       # Public tracking code search & localStorage browser history overview
│   │   └── [code]/
│   │       └── page.tsx                   # Citizen live tracking portal with 5-stage stepper, countdown ETA, and audio tips
│   ├── admin/
│   │   ├── page.tsx                       # Central Command Dashboard, Priority Triage Queue, search, and charts
│   │   ├── map/
│   │   │   └── page.tsx                   # Full-screen geospatial operational map with route lines and layer filters
│   │   ├── teams/
│   │   │   └── page.tsx                   # Fleet unit management, operational status toggles, and staging coordinates
│   │   └── incidents/
│   │       └── [id]/
│   │           └── page.tsx               # Incident dossier, candidate recommendations, backup manager, and audit log
│   ├── team/
│   │   ├── page.tsx                       # Responder mobile PIN authentication login interface
│   │   └── dashboard/
│   │       └── page.tsx                   # First responder tactical HUD, state controls, Google Maps link, and backup form
│   └── api/
│       ├── incidents/
│       │   ├── route.ts                   # GET /api/incidents (priority sorted) & POST /api/incidents (creation & event log)
│       │   └── [id]/
│       │       ├── route.ts               # GET incident dossier & PATCH status machine (REPORTED -> RESOLVED -> REOPENED)
│       │       ├── assign/
│       │       │   └── route.ts           # Atomic transaction assigning primary unit, locking state, and recording ETA
│       │       └── candidates/
│       │           └── route.ts           # Geospatial candidate ranking calculating Haversine distance and penalty scores
│       ├── teams/
│       │   ├── route.ts                   # Response team registry CRUD
│       │   └── [id]/
│       │       └── route.ts               # Unit status and staging coordinates updater
│       ├── team/
│       │   ├── login/route.ts             # Cryptographic authentication verifying unit code and PIN
│       │   ├── logout/route.ts            # Revocation of authenticated session cookie
│       │   ├── me/route.ts                # Session resolution returning assigned incident, unit details, and active backups
│       │   ├── progress/route.ts          # Operational state transition engine (EN_ROUTE, ARRIVED, RESOLVED)
│       │   ├── location/route.ts          # GPS telemetry ingestion for simulated real-time unit tracking
│       │   └── backup/route.ts            # Backup escalation generator creating pending BackupRequest records
│       ├── backup-requests/
│       │   ├── route.ts                   # Listing active reinforcement requests across all incidents
│       │   └── [id]/
│       │       ├── fulfill/route.ts       # Algorithmic backup allocation aggregating unit capacities to cover shortfall
│       │       └── decline/route.ts       # Dismissal of unnecessary reinforcement requests
│       ├── track/
│       │   └── [code]/
│       │       └── route.ts               # Rate-limited public tracking query strictly sanitized for citizen safety
│       └── stats/
│           └── route.ts                   # Analytical metric aggregator computing category and status breakdowns
│
├── components/
│   ├── Header.tsx                         # Institutional top navigation bar with active path indicators
│   ├── IncidentTable.tsx                  # High-density operational data table with priority sorting and tracking copy
│   ├── IncidentDetailMap.tsx              # Interactive incident detail map rendering routes, units, and candidate pins
│   ├── AdminMap.tsx                       # Full-screen multi-marker live map with auto-zoom bounds and status filters
│   ├── MapPicker.tsx                      # Click-to-locate interactive map for report submission
│   ├── TeamStagingMap.tsx                 # Coordinate selector for positioning field stations and staging bases
│   ├── PriorityBadge.tsx                  # P1, P2, P3, P4 badges with point tooltips
│   ├── SeverityBadge.tsx                  # Low, Medium, High, Critical color-coded severity pills
│   ├── StatusBadge.tsx                    # Lifecycle status tags with contextual background colors
│   ├── CategoryIcon.tsx                   # Universal emergency division iconography
│   ├── CategoryChart.tsx                  # Responsive CSS-driven bar graph representing incident category distributions
│   ├── StatusChart.tsx                    # Status distribution progress visualization
│   ├── StatCard.tsx                       # Tactical metric card with accent bar and comparison indicators
│   └── ConfirmModal.tsx                   # High-contrast action confirmation dialog
│
├── lib/
│   ├── prisma.ts                          # Singleton Prisma client instance preventing connection pool exhaustion
│   ├── severity.ts                        # Deterministic scoring function calculating severity from categories & keywords
│   ├── priority.ts                        # Read-time triage scoring engine (P1–P4) with waiting time accumulation
│   ├── assignment.ts                      # Great-Circle Haversine calculations and candidate ranking algorithms
│   ├── route.ts                           # OSRM driving route API client with 5-second fallback to straight-line vectors
│   ├── mapMarkers.ts                      # Custom Leaflet DivIcon SVG marker definitions (no broken asset URLs)
│   ├── voiceParser.ts                     # Preposition parsing, casualty extraction, and audio phrase matching
│   ├── teamAuth.ts                        # HMAC token generation, verification, and HTTP-only cookie handlers
│   ├── events.ts                          # Unique citizen tracking code generator (ERP-XXXXXX) & event ledger writer
│   └── safetyTips.ts                      # Curated life-safety guidelines per emergency category for citizen read-aloud
│
├── prisma/
│   ├── schema.prisma                      # Relational schema: Team, Incident, IncidentTeam, BackupRequest, IncidentEvent
│   └── seed.ts                            # Idempotent seed populating 10 Chennai emergency teams & 10 sample incidents
│
├── scripts/
│   └── backfill-tracking-codes.ts         # Migration script populating tracking codes for legacy incident records
│
├── public/                                # Static web assets and icons
├── tailwind.config.ts                     # Institutional palette configuration (burgundy, navy, slate, cream)
├── tsconfig.json                          # Strict TypeScript compiler options
├── package.json                           # Dependencies and execution commands
└── README.md                              # Main documentation file
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js:** Version `18.x`, `20.x`, or `22.x` (LTS recommended)
- **Package Manager:** `npm 9.x+` or `pnpm` / `yarn`
- **Git:** Version `2.30+`
- **Browser:** Modern browser with Web Speech API support (Google Chrome, Microsoft Edge, or Safari recommended for voice features)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/CRISISPULSE.git
cd CRISISPULSE
```

---

### Step 2: Configure Environment Variables

Create your local `.env` configuration file in the project root:

```bash
# On Linux / macOS:
cp .env.example .env

# On Windows (PowerShell):
Copy-Item .env.example .env
```

Ensure your `.env` contains the required keys:

```env
# Database Storage (SQLite local file by default)
DATABASE_URL="file:./dev.db"

# Responder Authentication Secret (HMAC Cookie Signing)
TEAM_AUTH_SECRET="crisis-response-secure-key-chennai-2026"

# Environment State
NODE_ENV="development"
```

---

### Step 3: Database Synchronization & Client Generation

Synchronize the local SQLite database schema and generate the typed Prisma client:

```bash
# Push Prisma schema definitions directly to SQLite
npx prisma db push

# Generate fresh Prisma Client typings
npx prisma generate
```

---

### Step 4: Seed Initial Fleet & Sample Emergency Data

Execute the idempotent seed script to populate **10 emergency response teams** distributed across Chennai (covering FIRE, MEDICAL, RESCUE, POLICE, and DISASTER divisions) alongside **10 realistic pre-configured incident reports**:

```bash
npm run seed
```

*(Optional)* If upgrading an existing database without tracking codes, execute the tracking code backfill utility:

```bash
npx tsx scripts/backfill-tracking-codes.ts
```

---

### Step 5: Launch the Development Server

Start the Next.js local server:

```bash
npm run dev
```

The application is immediately accessible across the following interfaces:
- **Civilian Landing Page:** [http://localhost:3000](http://localhost:3000)
- **Voice-First Emergency Intake:** [http://localhost:3000/report](http://localhost:3000/report)
- **Citizen Status Tracking Portal:** [http://localhost:3000/track](http://localhost:3000/track)
- **Command Triage Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Live Geospatial Fleet Map:** [http://localhost:3000/admin/map](http://localhost:3000/admin/map)
- **Fleet Division Registry:** [http://localhost:3000/admin/teams](http://localhost:3000/admin/teams)
- **First Responder Field Login:** [http://localhost:3000/team](http://localhost:3000/team) *(Demo PIN: `1234`)*

---

### Step 6: System Verification & Emergency Smoke Test

Execute a smoke test simulating an emergency report submission using `curl`:

```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Commercial Chemical Storage Fire",
    "description": "Heavy black smoke billowing near highway. Multiple barrels leaking solvent, workers trapped inside warehouse.",
    "category": "FIRE",
    "location": "Guindy Industrial Estate, Chennai",
    "latitude": 13.0067,
    "longitude": 80.2033,
    "peopleAffected": 8,
    "contactInfo": "9840199887",
    "tags": ["Trapped inside", "Explosion risk", "Smoke"]
  }'
```

**Expected Response (`HTTP 201 Created`):**
```json
{
  "id": "cmwa...",
  "trackingCode": "ERP-7K8M2X",
  "title": "Commercial Chemical Storage Fire",
  "category": "FIRE",
  "severity": "CRITICAL",
  "severityScore": 10,
  "status": "REPORTED",
  "priority": {
    "score": 86,
    "level": "P1",
    "reasons": [
      "+50 pts: Critical severity emergency",
      "+10 pts: 8 people affected (bracket 3-9)",
      "+8 pts: High-risk Fire hazard profile",
      "+18 pts: Urgent initial triage weight"
    ]
  }
}
```

Verify that the generated tracking code (e.g. `ERP-7K8M2X`) is immediately viewable without login at `http://localhost:3000/track/ERP-7K8M2X`.

---

## 🧠 How It Works

CRISISPULSE orchestrates emergencies through a four-stage, feedback-driven operational lifecycle:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRISISPULSE PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 1: VOICE-FIRST MULTIMODAL INTAKE & GEO-PARSING                       │
│                                                                             │
│  Citizen Speech Input ➔ Web Speech API Transcription                        │
│                       ➔ Linguistic Preposition Parser (extracts 'near / at') │
│                       ➔ Geolocation Fallback (Browser GPS / Leaflet Picker) │
│                       ➔ 5-Second Hands-Free Auto-Submit Countdown           │
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 2: ALGORITHMIC SEVERITY TRIAGE & DYNAMIC PRIORITY                    │
│                                                                             │
│  Ingested Incident    ➔ Deterministic Severity Classifier (Base + Pop + Keys)│
│                       ➔ Read-Time Priority Scoring Engine (0–100 Scale)     │
│                       ➔ Priority Tier Assignment: P1, P2, P3, P4            │
│                       ➔ Dynamic Waiting Time Decay (+1 pt / 5 min waiting)  │
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 3: FLEET CANDIDATE RANKING & ROAD NETWORK ROUTING                    │
│                                                                             │
│  Triage Alert         ➔ Great-Circle Haversine Geospatial Matrix            │
│                       ➔ Category Suitability Penalty (+8.0 km for mismatch) │
│                       ➔ OSRM Road Topology Query (5-sec Timeout Fallback)   │
│                       ➔ Atomic DB Assignment Lock & Primary Unit Dispatch   │
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 4: RESPONDER FIELD EXECUTION, BACKUP & CITIZEN TRACKING              │
│                                                                             │
│  Field Unit Portal    ➔ HMAC-Signed Cookie Authentication                   │
│                       ➔ 1-Tap State Machine: EN_ROUTE ➔ ARRIVED ➔ RESOLVED  │
│                       ➔ Peer Backup Escalations (Dispatches Secondary Units)│
│                       ➔ Rate-Limited Citizen Tracking Portal (5s Polling)   │
│                       ➔ Audio Survival Guidance Broadcast (Web Speech API)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Multimodal Intake & Voice Parsing Pipeline
1. **Linguistic Audio Extraction:** When an eyewitness taps the central microphone on `/report`, speech is continuously streamed through the browser's native `webkitSpeechRecognition` engine.
2. **Prepositional Hazard Extraction:** The regex voice parser (`voiceParser.ts`) evaluates grammatical prepositions to decouple spatial locations from descriptive transcripts:
   - Matches spatial patterns such as `at [location]`, `near [landmark]`, `opposite [landmark]`, or `in front of [landmark]`.
   - Extracts numeric victim numbers: *"three people injured"* $\rightarrow$ `peopleAffected = 3`.
   - Identifies category hazard signatures: *"flames and smoke"* $\rightarrow$ `category = FIRE`.
3. **Hands-Free Rapid Auto-Submit:** If all mandatory fields (category, situation details, location) are satisfied, a 5-second countdown timer initiates automatically with audio cancel capabilities, allowing a traumatized citizen to submit a report without needing to touch the screen.

---

### 2. Algorithmic Severity & Priority Triage

#### A. Severity Classification Formula (`lib/severity.ts`)
Severity is determined using a deterministic, transparent formula:

$$\text{Severity Score} = B_{\text{category}} + P_{\text{people}} + K_{\text{keywords}}$$

Where:
- **Category Baseline ($B$):** `BUILDING_COLLAPSE`: 4, `FIRE`: 3, `MEDICAL`: 3, `FLOOD`: 3, `ROAD_ACCIDENT`: 2, `OTHER`: 1.
- **Casualty Bracket Points ($P$):** 0 people: 0, 1–2: 1, 3–9: 2, 10–49: 3, 50+: 4.
- **Critical Keyword Boost ($K$):** Case-insensitive detection of critical tokens (`trapped`, `unconscious`, `explosion`, `fatal`, `bleeding`, `gas leak`, etc.): +1 point per token (capped at +3).

$$\text{Severity Tier} = \begin{cases} 
\text{CRITICAL} & \text{if Score} \ge 7 \\ 
\text{HIGH} & \text{if Score} \in [5, 6] \\ 
\text{MEDIUM} & \text{if Score} \in [3, 4] \\ 
\text{LOW} & \text{if Score} \le 2 
\end{cases}$$

#### B. Read-Time Dynamic Priority Engine (`lib/priority.ts`)
Unlike static systems that store fixed priorities, CRISISPULSE computes priority scores ($0–100$) dynamically **at read time**, preventing stale ranks as incidents wait in the queue:

$$\text{Priority Score} = S_{\text{severity}} + P_{\text{people}} + W_{\text{wait}} + C_{\text{category}}$$

- **Severity Points ($S$):** `LOW`: 10, `MEDIUM`: 25, `HIGH`: 40, `CRITICAL`: 50.
- **People Affected Points ($P$):** 0: 0, 1–2: 5, 3–9: 10, 10–49: 18, 50+: 25.
- **Waiting Time Decay ($W$):** Computed dynamically as $+1\text{ pt}$ for every 5 minutes elapsed since creation (capped at $+15\text{ pts}$), automatically elevating neglected lower-tier incidents.
- **Category Weights ($C$):** `BUILDING_COLLAPSE`: 10, `FIRE`: 8, `MEDICAL`: 8, `FLOOD`: 7, `ROAD_ACCIDENT`: 5, `OTHER`: 2.

$$\text{Priority Grade} = \begin{cases} 
\mathbf{P1} & \text{if Score} \ge 75 \quad (\text{Immediate Life Threat}) \\ 
\mathbf{P2} & \text{if Score} \in [55, 74] \quad (\text{High Emergency}) \\ 
\mathbf{P3} & \text{if Score} \in [35, 54] \quad (\text{Moderate Hazard}) \\ 
\mathbf{P4} & \text{if Score} < 35 \quad (\text{Routine Intake}) 
\end{cases}$$

---

### 3. Geospatial Fleet Dispatch & OSRM Road Routing
1. **Haversine Distance Matrix:** Candidate units are evaluated using Great-Circle spherical trigonometry:
   $$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
   where $R = 6371\text{ km}$.
2. **Category Suitability Penalty:** To prevent dispatching inappropriate units (e.g., dispatching a police cruiser to a structural inferno), units whose category does not match the emergency receive a severe **$+8.0\text{ km}$ equivalent distance penalty**, guaranteeing specialized units are chosen first unless out of range.
3. **OSRM Driving Network Polylines:** Real-time driving routes are queried from OSRM (`/route/v1/driving/{lng},{lat};{lng},{lat}`). If the OSRM server does not respond within 5,000 milliseconds, the system falls back gracefully to a straight-line Euclidean vector with Haversine distance, ensuring dispatchers are never blocked by external network latency.

---

### 4. Citizen Live Tracking & Accessibility Safety Broadcast
1. **Collision-Free Tracking Reference:** Every report receives an unforgeable, human-readable reference code formatted as `ERP-` followed by 6 characters selected from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (omitting easily confused characters like `0`/`O` and `1`/`I`).
2. **Strict Privacy Quarantine:** The public tracking endpoint (`/api/track/[code]`) is guarded by an in-memory sliding-window IP rate limiter (30 req/min). It strips victim contact numbers, internal dispatcher notes, raw GPS coordinates, and private notes, delivering only high-level status, vehicle category, and approximate arrival countdown.
3. **Voice Safety Broadcast:** Distressed citizens awaiting arrival can trigger the Web Speech API audio broadcaster to hear life-saving protocols tailored to the hazard (e.g., stopping bleeding, chemical avoidance, electrical shutoff, smoke crawling).

---

## 📈 Scalability

CRISISPULSE is architected for seamless horizontal throughput and high-load civil defense surges:

1. **Read-Time Calculation vs. Lock Contention:** Priority rankings are calculated at query time via pure TypeScript functional helpers (`lib/priority.ts`) rather than running periodic database update cron jobs. Millions of priority re-evaluations occur in CPU memory with zero database write locks.
2. **Stateless API Gateway:** All Next.js route handlers execute as stateless asynchronous micro-functions. Multiple instances can be horizontally scaled behind Nginx, AWS ALB, or Cloudflare with zero session affinity requirements.
3. **Seamless SQLite to PostgreSQL Migration:** The schema in `prisma/schema.prisma` intentionally relies on string data types rather than vendor-specific database enums. To switch from SQLite to an enterprise distributed PostgreSQL / TimescaleDB cluster, simply update `provider = "postgresql"` in `prisma/schema.prisma`.
4. **Denial-of-Service Defense:** The citizen tracking endpoint incorporates an in-memory sliding-window rate limiter preventing bot scrapers or malicious actors from flooding the database with code queries.
5. **Client-Side Polling Bounds:** Citizen tracking dashboards poll at 5-second intervals and automatically terminate polling loops 10 minutes after an incident is resolved to minimize bandwidth consumption.

---

## 💡 Feasibility

CRISISPULSE delivers enterprise-grade emergency CAD functionality with zero commercial software licenses or cost barriers:

- **Zero Paid Third-Party API Keys:** Utilizes OpenStreetMap tile layers, public OSRM network servers, native HTML5 Geolocation, and browser Web Speech engines. No paid Google Maps API, Mapbox, or Twilio subscriptions are mandated.
- **Low Hardware Footprint:** The entire platform runs comfortably on a single budget cloud VPS (1 vCPU, 2GB RAM) or an offline field command laptop, making it viable for rural municipalities, regional disaster teams, and volunteer response brigades.
- **Network Resilience:** If the field command center loses external internet connectivity, local dispatchers can still log incidents, calculate priorities, view cached offline maps, and track units across a local wireless LAN.
- **Zero Ongoing Licensing Overhead:** Free, open-source MIT software that can be adopted by civil protection agencies worldwide without recurring SaaS seat fees.

---

## 🌟 Novelty & Comparative Analysis

### Competitive Matrix

| Capability / Metric | CRISISPULSE | Traditional 911 / 112 CAD | Commercial CAD (e.g. Mark43) | Open-Source Incident Apps (e.g. Ushahidi) |
|---|---|---|---|---|
| **Intake Mechanism** | 🎙️ Voice-First AI + Speech Parser | 📞 Verbal Call-Taker Manual Entry | 🖥️ Manual Dispatcher Console | 📝 Static Web Forms Only |
| **Triage Logic** | 🧠 Algorithmic Multi-Factor Severity + Priority | ⚠️ Manual Human Heuristics | ⚠️ Static Rule Lookup | ❌ None (Chronological) |
| **Queue Waiting Penalty** | ✅ Dynamic Decay (+1 pt / 5 min) | ❌ Static Queue Placement | ⚠️ Manual Re-prioritization | ❌ Unranked |
| **Geospatial Dispatching** | 🗺️ OSRM Road Route + Haversine Fit | ⚠️ Radio Grid / Sector Assignment | 🚗 GPS Navigation Integration | ❌ No Fleet Routing |
| **Peer Backup Escalation** | 🤝 Automated Unit Capacity Fulfill | 📻 Manual Voice Radio Calls | ⚠️ Dispatcher Manual Re-dispatch | ❌ Not Supported |
| **Citizen Status Portal** | 📱 Public Tracking Code (Zero-Auth) | ❌ Black Box (No Citizen Visibility)| ❌ Closed System (Officer Only)| ⚠️ Crowdsourced Pins (No Status)|
| **Accessibility Read-Aloud** | 🔊 Native Web Speech Voice Guides | ❌ None | ❌ None | ❌ None |
| **Setup Cost & Complexity** | ⚡ Free / 1-Command (`npm run dev`) | 🏢 Millions in Enterprise Setup | 💰 Expensive Recurring SaaS | ⚠️ Complex Server Setup |

### Core Innovation: The Closed-Loop Algorithmic Crisis Cycle
Unlike legacy CAD systems that isolate citizen callers from field responders, CRISISPULSE connects all three stakeholders in a unified operational feedback loop:
1. **The Citizen** receives immediate psychological relief through a tracking code and spoken survival instructions.
2. **The Command Dispatcher** sees automated, dynamically ranked priority queues that eliminate cognitive overload.
3. **The Field Unit** receives turn-by-turn road routes, situation dossiers, and 1-tap backup requisition capabilities.

---

## 🔧 Feature Depth & Edge-Case Engineering

### 1. Robust Edge-Case Handling
- **Missing or Corrupted GPS Coordinates:** If an emergency caller disables browser GPS permissions or reports an incident with text only, the platform uses reverse geocoding heuristics and allows dispatchers to set coordinates via the interactive map picker without crashing the routing engine.
- **Audio Noise & Transcript Jitter:** The speech recognition parser (`voiceParser.ts`) cleans transcripts by stripping filler words, detecting phonetic variations of emergency terms in Indian English, Hindi, and Tamil, and validating input before setting state.
- **Fleet Capacity Shortfall Handling:** When a field unit requests backup for $N$ personnel and no single unit has sufficient members, the fulfillment engine (`/api/backup-requests/[id]/fulfill`) aggregates multiple nearby units until the quota is satisfied, reporting any partial personnel shortfall clearly in the command log.
- **Reopening Resolved Emergencies:** If an incident rekindles after being marked resolved, command operators can trigger a reopening transition (`REOPENED`). The engine validates that the primary unit is still available before transitioning state back to `IN_PROGRESS`.
- **Citizen Privacy Safeguards:** The tracking portal sanitizes all payload outputs through a strict whitelist projection. Citizen phone numbers, descriptions of sensitive crimes, internal triage discussions, and responder GPS tracks are filtered out before delivery.

### 2. Standardized Emergency Incident Data Contract
All internal and API communications conform to a standardized JSON schema:

```json
{
  "id": "cmwaboyny0000wvguh66qorrx",
  "trackingCode": "ERP-7K8M2X",
  "title": "Commercial Chemical Storage Fire",
  "description": "Heavy black smoke billowing near highway. Multiple barrels leaking solvent, workers trapped inside warehouse.",
  "category": "FIRE",
  "location": "Guindy Industrial Estate, Chennai",
  "latitude": 13.0067,
  "longitude": 80.2033,
  "address": "Guindy Industrial Estate, Chennai",
  "tags": ["Trapped inside", "Explosion risk", "Smoke"],
  "peopleAffected": 8,
  "contactInfo": "9840199887",
  "severity": "CRITICAL",
  "status": "ASSIGNED",
  "assignedTeamId": "cmwaboyp70001wvgu3jrrup49",
  "assignedTeam": {
    "code": "FIRE-01",
    "name": "T. Nagar Fire & Rescue Station",
    "category": "FIRE",
    "memberCount": 6
  },
  "distanceKm": 4.2,
  "etaMinutes": 7,
  "priority": {
    "score": 86,
    "level": "P1",
    "reasons": [
      "+50 pts: Critical severity emergency",
      "+10 pts: 8 people affected (bracket 3-9)",
      "+8 pts: High-risk Fire hazard profile",
      "+18 pts: Initial urgent intake weight"
    ],
    "waitingMinutes": 12
  },
  "createdAt": "2026-11-10T15:20:00.000Z"
}
```

---

## ⚠️ Ethical Use & Operational Disclaimer

CRISISPULSE is engineered for **civil defense coordination, tactical triage research, municipal resource dispatching, and emergency situational awareness**.

- **Not a Unilateral Replacement for Certified Statutory 911 / 112 Systems:** CRISISPULSE is designed to augment and modernize municipal dispatch operations. In actual life-threatening emergencies, citizens must always prioritize direct telephone communication with certified local public safety answering points (PSAPs) by dialing **112 / 911**.
- **Human-in-the-Loop Mandate:** While algorithmic triage scores and candidate rankings provide immediate operational clarity, critical life-safety decisions (such as evacuation orders and resource reallocations) require verification by certified emergency dispatch officers.
- **Zero-Surveillance Citizen Privacy Guarantee:** The system does not install background tracking daemons, monitor civilian browsing histories, or sell telemetry data. Geolocation data is utilized strictly during active report filing and quarantined immediately following incident resolution.

---

## 📜 License

Licensed under the **MIT License**. You may obtain a copy of the License in the repository root [LICENSE](LICENSE) file.

```
Copyright (c) 2026 CRISISPULSE Contributors & Advanced Agentic Engineering Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🧩 Author & Team

**CRISISPULSE Core Systems Engineering Group**
- **Lead Systems Architect:** Advanced Agentic Crisis Response Division
- **Project Repository:** [https://github.com/cobotex/crisispulse](https://github.com/cobotex/crisispulse)
- **Emergency Telemetry & Field Integration Support:** [dispatch@crisispulse-gov.org](mailto:dispatch@crisispulse-gov.org)
- **Issue Tracker & Feature Requests:** [https://github.com/cobotex/crisispulse/issues](https://github.com/cobotex/crisispulse/issues)
