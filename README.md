# Survey Studio — Dynamic Survey Platform

> A full-stack web application for creating dynamic surveys with cascading conditional logic, responsive respondent forms, authoritative server validation, immutable schema versioning, and real-time analytics.

**Live Demo:** Not currently hosted. [Deploy this repository to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSujal-neupane%2Fsurvey-app) and configure the database/environment variables below.
**Demo Video:** *Available upon recording*
**Demo Admin Credentials:** `demo@example.com` / `Demo@12345`

---

## Features

### Core Required Features
- **Admin Authentication:** Secure email/password login and registration with bcrypt (cost 10+) and httpOnly JWT cookies via `jose`.
- **Survey Builder:**
  - Create and edit surveys with title and description (debounced autosave ~800ms).
  - 4 distinct question types: **Text Response** (with configurable max length), **Single Choice** (radio), **Multiple Choice** (checkbox), and **Rating Scale** (1–5 stars).
  - Drag-and-drop question reordering using `@dnd-kit` with keyboard accessibility fallbacks (Up/Down buttons).
  - Choice options editor: add, remove, rename, and reorder choices.
  - Required question toggles with visual indicators (`*`).
  - Question duplication and deletion.
- **Conditional Visibility Logic:**
  - "Show this question only if..." rule builder.
  - **Cycle-Free By Design:** Source dropdown strictly limits selections to earlier non-text questions.
  - Supports AND/OR condition groups.
  - Cascading dependency resolution (if Question A hides Question B, any Question C depending on B is automatically hidden).
  - Auto-cleanup: moving or deleting a question automatically purges stale/invalid conditions with notifications.
  - Visual badge ("Conditional") on questions with rules.
- **Live Interactive Preview Pane:** Side-by-side preview pane using the identical shared `SurveyRenderer` component with Desktop/Mobile viewport switcher.
- **Public Respondent Form (`/s/[slug]`):**
  - No authentication required.
  - Real-time live conditional show/hide animations.
  - Automatic answer clearing for questions that become hidden.
  - Dynamic completion progress bar (`answered visible questions / total visible questions`).
  - Client-side validation with instant inline feedback and smooth auto-scroll to the first error.
  - Empty, loading skeleton, 404 (not found), and 410 (closed) states.
- **Analytics & Reporting:**
  - Per-question visualizations: horizontal bar charts + frequency table for choices, big average + 1–5 star distribution for ratings, and paginated recent text responses.
  - Multi-version aggregation selector ("All Versions" vs specific version).
  - Individual Responses table with pagination and question/option labels (not raw IDs).
  - One-click **Export to CSV** for responses.

### Bonus Features Implemented
- **Schema Versioning:** Publishing creates an immutable `SurveyVersion` snapshot. Draft modifications never modify or invalidate historical responses.
- **Rate Limiting:** IP-based rate limiting on submissions (5/min per IP+survey), draft saves (30/min), and public GET requests (60/min) using `@upstash/ratelimit` with an in-memory sliding-window fallback for local development.
- **Spam Deterrence & Honeypot:** Invisible `website` honeypot field that silently drops automated bot submissions without database writes.
- **Duplicate Guard:** Browser cookie tracking (`submitted_<slug>`) and SHA-256 IP hashing (`ipHash = sha256(ip + salt)`) to prevent accidental repeat submissions.
- **Partial Responses Autosave & Resume:** Respondent answers are saved to localStorage and can be resumed upon page reload.

---

## Tech Stack

| Concern | Choice | Justification |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | High-performance full-stack React framework with server components and API routes |
| **Styling** | Tailwind CSS + Lucide Icons | Utility-first responsive design, accessible components, and lightweight icons |
| **Database** | PostgreSQL (Neon / Local) | Relational integrity with native JSONB support for survey schemas |
| **ORM** | Prisma | Type-safe database queries, declarative schema definitions, and automated migrations |
| **Validation** | Zod | End-to-end schema validation shared between browser and server |
| **Auth** | JWT (`jose`) + `bcryptjs` | Stateless authentication with signed httpOnly cookies and salted password hashing |
| **Drag & Drop** | `@dnd-kit/core` & `@dnd-kit/sortable` | Modern, performant, and keyboard-accessible drag-and-drop primitives |
| **IDs** | `nanoid` & `cuid` | Short collision-resistant IDs for questions/options, CUIDs for database rows |
| **Rate Limiting** | `@upstash/ratelimit` + Redis | Distributed rate limiting with transparent in-memory local dev fallback |
| **Testing** | Vitest | Extremely fast, ESM-native unit testing runner |

---

## Setup & Local Development

### 1. Prerequisites
- **Node.js**: Version 20 or higher
- **PostgreSQL**: Local Postgres instance or a free cloud database (Neon, Supabase)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure the variables:
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/survey_platform?schema=public`)
- `JWT_SECRET`: Secret key for signing authentication tokens (min. 32 characters)
- `IP_HASH_SALT`: Random salt for hashing respondent IP addresses
- `UPSTASH_REDIS_REST_URL`: *(Optional)* Upstash Redis REST URL for distributed rate limits
- `UPSTASH_REDIS_REST_TOKEN`: *(Optional)* Upstash Redis REST token
- `NEXT_PUBLIC_APP_URL`: App URL (default: `http://localhost:3000`)

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migration
```bash
npx prisma migrate dev --name init
```

### 5. Seed Demo Data
Pre-populates the database with the demo admin (`demo@example.com` / `Demo@12345`), a published "Customer Feedback" survey with all 4 question types & branching logic, and 42 realistic responses:
```bash
npm run db:seed
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Run Automated Tests
```bash
npm test
```

---

## Architecture Overview

```
[ Respondent Browser ]              [ Admin Studio ]
         │                                 │
         │  GET /s/:slug                   │  GET/POST /admin/*
         │  POST /api/public/responses     │  PUT /api/surveys/:id
         ▼                                 ▼
   ┌──────────────────────────────────────────────┐
   │             Next.js App Router               │
   │   - Proxy (Admin Route Protection)           │
   │   - Shared Survey Engine (lib/survey/)       │
   │     • getVisibleQuestionIds()                │
   │     • validateAnswers()                      │
   │     • validateSurveySchema()                 │
   │     • aggregate()                            │
   └───────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌───────────┐       ┌───────────┐
   │  Prisma   │       │  Upstash  │
   │  Client   │       │  Ratelimit│
   └─────┬─────┘       └───────────┘
         ▼
   ┌───────────┐
   │PostgreSQL │
   │(Neon / DB)│
   └───────────┘
```

### Folder Structure
```
src/
├── app/
│   ├── (auth)/{login,register}/page.tsx   # Admin authentication pages
│   ├── admin/
│   │   ├── page.tsx                       # Survey list & dashboard
│   │   └── surveys/[id]/
│   │       ├── edit/page.tsx              # Split-pane survey builder
│   │       ├── analytics/page.tsx         # Question analytics & insights
│   │       └── responses/page.tsx         # Paginated responses table
│   ├── s/[slug]/page.tsx                  # Public respondent survey page
│   └── api/
│       ├── auth/{login,register,logout,me}/route.ts
│       ├── surveys/{route.ts, [id]/route.ts}
│       ├── surveys/[id]/{publish,close,analytics,responses}/route.ts
│       └── public/
│           ├── surveys/[slug]/{route.ts, responses/route.ts}
│           └── responses/[draftToken]/route.ts
├── components/
│   ├── builder/   # QuestionList, QuestionCard, OptionsEditor, ConditionEditor, PreviewPane
│   ├── survey/    # SurveyRenderer, QuestionField, RatingInput, ProgressBar
│   └── analytics/ # ChoiceChart, RatingChart, TextList, StatCard
└── lib/
    ├── survey/    # types.ts, visibility.ts, validate.ts, schemaChecks.ts, analytics.ts
    ├── auth.ts    # JWT token signing, verification, and requireSurveyOwner()
    ├── db.ts      # Prisma singleton
    ├── rateLimit.ts # IP hashing & Upstash / in-memory rate limiting
    └── errors.ts  # ApiError class and standard apiHandler wrapper
```

---

## Key Architecture Decisions

1. **JSONB Schema Storage with Immutable Version Snapshots:**
   - Storing the survey questions as JSONB allows agile, arbitrary question structures without complex, fragmented relational tables for every question type and choice option.
   - The editable `draftSchema` on the `Survey` model is completely decoupled from the immutable `schema` on `SurveyVersion`. When an admin publishes, a frozen copy of the draft is created with an incremented version number (`version = last + 1`).
   - Old responses reference `surveyVersionId`, ensuring that modifying a draft or publishing new questions never breaks or alters historical response data.

2. **Single Source of Truth for Survey Logic:**
   - Both the browser and the server import the exact same pure functions from `src/lib/survey/`:
     - `getVisibleQuestionIds(schema, answers)`
     - `validateAnswers(schema, rawAnswers, { partial })`
   - The client uses them for instant interactivity and feedback; the server uses them authoritatively to reject tampering.

3. **Guaranteed Acyclic Conditional Logic:**
   - In `schemaChecks.ts` and `ConditionEditor.tsx`, questions can only reference source questions that appear **strictly earlier** in the question order.
   - Circular dependencies (`A -> B -> A`) are impossible by construction.

4. **Authoritative Stripping of Hidden Answers:**
   - If a respondent answers Question B, but subsequently changes Question A such that Question B is hidden, Question B's answer is cleared on the client and stripped on the server. Hidden answers are never stored.

5. **Ownership Isolation & Data Leak Prevention:**
   - The `requireSurveyOwner(surveyId, userId)` helper throws a `404 Not Found` (rather than a `403 Forbidden`) if a survey does not belong to the authenticated user, preventing malicious users from probing survey IDs to verify their existence.

6. **Privacy-Preserving Spam Protection:**
   - Raw IP addresses are never saved to the database. Instead, `ipHash = sha256(ip + SERVER_SALT)` is stored for rate limiting and duplicate prevention.

---

## API Overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create new admin account |
| `POST` | `/api/auth/login` | Public | Sign in and set httpOnly cookie |
| `POST` | `/api/auth/logout` | Public | Clear auth cookie |
| `GET` | `/api/auth/me` | Admin | Get current authenticated user |
| `GET` | `/api/surveys` | Admin | List surveys owned by current user |
| `POST` | `/api/surveys` | Admin | Create draft survey with initial question |
| `GET` | `/api/surveys/:id` | Admin | Fetch full survey draft and version history |
| `PUT` | `/api/surveys/:id` | Admin | Autosave survey draft with schema validation |
| `DELETE`| `/api/surveys/:id` | Admin | Delete survey and cascade responses |
| `POST` | `/api/surveys/:id/publish` | Admin | Create immutable `SurveyVersion` and set `PUBLISHED` |
| `POST` | `/api/surveys/:id/close` | Admin | Set survey status to `CLOSED` |
| `GET` | `/api/surveys/:id/analytics`| Admin | Get aggregated stats & charts for version or `all` |
| `GET` | `/api/surveys/:id/responses`| Admin | Get paginated completed responses with labels |
| `GET` | `/api/public/surveys/:slug`| Public | Fetch latest published survey schema |
| `POST` | `/api/public/surveys/:slug/responses` | Public | Submit complete survey response |
| `PATCH`| `/api/public/responses/:draftToken` | Public | Autosave partial survey answers |

---

## Assumptions and Trade-offs

1. **Analytics Aggregation in Application Code:**
   - At assessment scale (~thousands of responses), fetching responses and aggregating them in memory using pure TypeScript functions (`src/lib/survey/analytics.ts`) is fast, deterministic, testable, and database-agnostic.
   - At high production scale (millions of responses), this would transition to Postgres SQL `jsonb` aggregation queries, materialized views, or pre-computed counter tables.
2. **Duplicate Guard Deterrence:**
   - The cookie `submitted_<slug>` and IP hash check deter casual duplicate submissions. However, users in private windows, shared networks, or behind NAT/VPNs can circumvent IP-based detection.
3. **Single Admin Ownership Model:**
   - Surveys belong to a single owner (`ownerId`). Organization workspaces, team roles, and collaborative multi-user editing are omitted in favor of strict single-owner simplicity.
4. **Draft Autosave Debounce:**
   - Debouncing draft saves to 800ms provides a smooth editor experience while keeping database writes low.

---

## What I'd Do Next

1. **Collaborative Multi-User Editing:** Add WebSocket or Yjs CRDT support so multiple team members can edit surveys simultaneously without race conditions.
2. **File Upload Question Type:** Support image and document attachments via secure presigned S3 / Cloudflare R2 upload URLs.
3. **Advanced Question Types:** Date pickers, Net Promoter Score (NPS 0–10), ranking matrices, and slider controls.
4. **Custom Themes & Branding:** Allow admins to customize primary brand colors, header logos, and font styles.
5. **Webhook Integrations:** Dispatch outgoing webhooks (e.g. to Zapier, Slack, or customer CRMs) upon each verified submission.
