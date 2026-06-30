# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Data Reporting System (每日数据填报系统) V3.0.0 — a team data collection tool rewritten from a single-file HTML app into Vue 3 + TypeScript. The Express backend serves both the legacy V1 frontend (`public/`) and the new Vue 3 frontend (`dist/`) via a runtime "dual-track" switch.

**UI Design System**: 碧氧清新风 — teal/green primary color (`#26A69A`), large border-radius, glass morphism effects, gradient backgrounds. See `src/styles/variables.scss` for all CSS variables.

## Commands

```bash
# Development
npm run dev              # Vite dev server on :5173 (proxies /api to localhost:3000)
npm run server           # Express backend on :3000 (run this first or in a second terminal)

# Production
npm run build            # Type-check (vue-tsc) + Vite build → dist/
npm start                # Build + start Express server on :3000

# Quality checks
npm run type-check       # TypeScript type checking only (vue-tsc --noEmit)
npm run lint             # ESLint (frontend only — backend JS is excluded)
npm run lint:fix         # Auto-fix lint issues
npm run review           # type-check + lint + test combined

# Tests
npm run test             # Single run (vitest run)
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage

# Run a single test file
npx vitest run tests/composables/useValidation.test.ts

# Snapshots (no Git — project uses custom snapshot system)
npm run snapshot         # Create project snapshot
npm run snapshot:list    # List all snapshots
node scripts/snapshot-all.js restore <snapshot-name>
```

## Architecture

### Layout Structure (Desktop vs Mobile)
- **Desktop (≥768px)**: Fixed left sidebar (`SidebarNav.vue`, 220px) + fixed top header (`AppHeader.vue`, 56px) + scrollable main content (`AppLayout.vue` with `margin-left: var(--sidebar-width)`)
- **Mobile (<768px)**: Fixed top header only + fixed bottom tab bar (`AppTabBar.vue`)
- All pages render through `AppLayout` wrapper which injects the layout chrome
- FillPage desktop layout: sidebar (`FillSidebar.vue`) and main (`FillMain.vue`) both use `position: fixed` to prevent scrolling interference

### Dual-Track Frontend
The Express server (`server.js`) dynamically serves either `dist/` (V2, Vue 3) or `public/` (V1, legacy HTML) based on `FRONTEND_VERSION` env var or the runtime API `POST /api/admin/switch-frontend {version: "v1"|"v2"}`. Static file caching is disabled to support instant switching.

### Frontend (Vue 3 + TypeScript)
- **Entry**: `src/main.ts` → `src/App.vue` → 4 routes via Vue Router
- **Routing**: `/` (FillPage), `/history` (HistoryPage), `/stat` (StatPage, auth-gated), `/admin` (AdminPage, password-gated)
- **State**: Pinia stores (`useAuthStore` for auth/token, `useDataStore` for all app data)
- **API layer**: `src/api/` — Axios instance with token injection interceptor and 401 auto-redirect
- **Composables** (`src/composables/`): Business logic extracted into reusable units:
  - `useInheritance` — 3-tier data inheritance (today → most recent history → base template data). Row-level only; never mixes fields across different dates. `batchGetEffectiveRows()` reads `dataStore.sub` reactively so computed `effectiveValues` updates on field change.
  - `useValidation` — Field validation + rule engine (11 operators, 13 action types)
  - `useSequence` — Auto-increment sequence fields with module-level cache (`tplId:header → maxVal`)
  - `useFormSessionEdits` — Tracks user-edited fields via module-level `Map` with composite key `"userId:rowIndex:fieldHeader"`; `clearAll()` called on user switch/back navigation
  - `useToast`, `useConfirm`, `useLoading` — UI utilities via Naive UI discrete API
- **Utils**: `src/utils/date.ts` — shared `normalizeDate()`, `isValidDate()`, `getCurrentDate()`
- **Path alias**: `@` maps to `src/` (configured in both vite.config.ts and vitest.config.ts)
- **Styling**: SCSS with CSS custom properties (`:root` → `src/styles/variables.scss`), global reset in `src/styles/global.scss`
- **Theme**: Naive UI theme overrides in `src/theme/index.ts` use primary color `#26A69A`

### Backend (Express + sql.js)
- **Entry**: `server.js` → initializes DB, runs migrations, starts Express
- **Database**: SQLite via sql.js (WASM, no native deps). In-memory with 100ms debounced file flush to `data/app.db`. Auto-save on process exit.
- **Auth**: SQLite-persisted token sessions with in-memory cache for speed (30min sliding expiry, 500 hard cap). `requireAuth` middleware for admin ops, `optionalAuth` for general reads. Token passed via `x-auth-token` header. Sessions table created at startup, loaded on boot.
- **Routes** (`src/routes/`): auth, data, template, submission, member, export, audit
- **Middleware pipeline**: security headers → rate limiting (per-endpoint) → auth → validation → error handler
- **Config**: `src/config/index.js` — port, DB path, session duration, rate limits, backup intervals, default password, `MIN_PASSWORD_LENGTH: 6`
- **Validation**: `src/middleware/zodValidate.js` — Zod-based request body validation middleware; `src/middleware/validate.js` — legacy field-level validation
- **Audit**: `src/constants/auditActions.js` — typed action constants; `src/db/backup.js` — auto-backup + audit cleanup
- **Services**: `src/services/session.js` — session CRUD with SQLite persistence + memory cache
- **Shared helpers**: `src/db/queryHelpers.js` — `rowToTemplate()`, `rowToSubmission()`, `getAllSubmissions()`, `getSubmissionsByTemplate()` (shared by data.js and export.js)
- **Database utilities**: `src/db/database.js` — `runSQL()`/`execSQL()` Promise wrappers, `withTransaction()` (properly awaited), `queryOne()`, `queryAll()`

### Key Data Model
- **Template**: defines columns (type/required/constraints) + base rows + field rules
- **Submissions**: nested as `tplId → date → user → rowIndex → fieldValues`
- **Members**: tracked per template
- **Field Rules**: condition (field + operator + value) → action (require/forbid/copy/validate_match/compare)
- **filterField**: Template-level field that assigns rows to specific fillers (e.g., "责任人" column determines which user fills which rows)
- **DB Tables**: `templates`, `submissions` (JSON data column), `members`, `audit_log`, `sessions`, `system`

### Stats Calculation (Important)
Statistics modules (`StatOverview.vue`, `StatFillAnalysis.vue`) calculate by **entry count** (each template row = 1 entry), not by field count. They only count entries for **actual fillers** determined by `filterField` — each user only fills rows where their name matches the filterField column. See `getUserRowIndices()` helper function.

### Modals / Dialogs
All dialogs (`BaseModal.vue`) use `v-show` (not `v-if`) to prevent DOM reflow jumps. They are rendered at the **page root level** (e.g., `FillPage.vue`), never nested inside child components like `RecordCard`. This ensures `position: fixed` positioning is not clipped by parent overflow.

### Language Split
Frontend is TypeScript; backend is plain JavaScript (CommonJS). The backend was not refactored — only `server.js` was modified for dual-track support. ESLint is configured to ignore all backend JS files.

## Conventions

- Vue components use `<script setup lang="ts">` with Composition API exclusively
- **Naive UI components must be explicitly imported** — the project does not use `unplugin-vue-components`. Every `<n-*>` component used in a template must have a corresponding named import from `naive-ui` (e.g., `import { NButton, NCard } from 'naive-ui'`). Missing imports cause silent component-not-found warnings at runtime.
- Naive UI toast/confirm use `createDiscreteApi` (no provider wrapping needed)
- Styling uses dual-layer theming: CSS custom properties (`:root`) mapped to SCSS variables in `src/styles/variables.scss`
- Tests live in `tests/` mirroring the `src/` structure; test files are `*.test.ts`
- No Git — use `npm run snapshot` before major changes; max 10 snapshots retained
