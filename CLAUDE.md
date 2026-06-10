# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Data Reporting System (每日数据填报系统) V3.0.0 — a team data collection tool rewritten from a single-file HTML app into Vue 3 + TypeScript. The Express backend serves both the legacy V1 frontend (`public/`) and the new Vue 3 frontend (`dist/`) via a runtime "dual-track" switch.

## Commands

```bash
# Development (runs both frontend dev server on :5173 and backend on :3000)
npm run dev              # Vite dev server (proxies /api to localhost:3000)
npm run server           # Express backend only

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

### Dual-Track Frontend
The Express server (`server.js`) dynamically serves either `dist/` (V2, Vue 3) or `public/` (V1, legacy HTML) based on `FRONTEND_VERSION` env var or the runtime API `POST /api/admin/switch-frontend {version: "v1"|"v2"}`. Static file caching is disabled to support instant switching.

### Frontend (Vue 3 + TypeScript)
- **Entry**: `src/main.ts` → `src/App.vue` → 4 routes via Vue Router
- **State**: Pinia stores (`useAuthStore` for auth, `useDataStore` for all app data)
- **API layer**: `src/api/` — Axios instance with token injection interceptor and 401 auto-redirect
- **Composables** (`src/composables/`): Business logic extracted into reusable units:
  - `useInheritance` — 3-tier data inheritance (today → most recent history → base template data). Row-level only; never mixes fields across different dates.
  - `useValidation` — Field validation + rule engine (11 operators, 13 action types)
  - `useSequence` — Auto-increment sequence fields
  - `useToast`, `useConfirm`, `useLoading` — UI utilities via Naive UI discrete API
- **Views**: `FillPage` (default `/`), `HistoryPage`, `StatPage` (password-gated), `AdminPage` (password-gated)
- **Path alias**: `@` maps to `src/` (configured in both vite.config.ts and vitest.config.ts)

### Backend (Express + sql.js)
- **Entry**: `server.js` → initializes DB, runs migrations, starts Express
- **Database**: SQLite via sql.js (WASM, no native deps). In-memory with 100ms debounced file flush to `data/app.db`.
- **Auth**: In-memory token sessions (30min sliding expiry). `requireAuth` middleware for admin ops, `optionalAuth` for general reads.
- **Routes** (`src/routes/`): auth, data, template, submission, member, export, audit
- **Middleware pipeline**: security headers → rate limiting (per-endpoint) → auth → validation → error handler
- **Config**: `src/config/index.js` — port, DB path, session duration, rate limits, backup intervals, default password

### Key Data Model
- **Template**: defines columns (type/required/constraints) + base rows + field rules
- **Submissions**: nested as `tplId → date → user → rowIndex → fieldValues`
- **Members**: tracked per template
- **Field Rules**: condition (field + operator + value) → action (require/forbid/copy/validate_match/compare)

### Language Split
Frontend is TypeScript; backend is plain JavaScript (CommonJS). The backend was not refactored — only `server.js` was modified for dual-track support. ESLint is configured to ignore all backend JS files.

## Conventions

- Vue components use `<script setup lang="ts">` with Composition API exclusively
- Naive UI is the component library; toast/confirm use `createDiscreteApi` (no provider wrapping needed)
- Styling uses dual-layer theming: CSS custom properties (`:root`) mapped to SCSS variables
- Tests live in `tests/` mirroring the `src/` structure; test files are `*.test.ts`
- No Git — use `npm run snapshot` before major changes; max 10 snapshots retained
