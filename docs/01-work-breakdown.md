# 01 — Work Breakdown Structure (WBS)

**Project:** Multi-Platform Inventory Management System with RESTful API Backend
**Build window:** February – August 2026 (implementation: June – August 2026)

---

## 1. WBS Hierarchy

```
1.0  Multi-Platform Inventory Management System
├── 1.1  Project Initiation & Planning
│   ├── 1.1.1  Problem definition and feasibility study
│   ├── 1.1.2  Stakeholder identification (Business Owner, Administrators,
│   │          Branch Managers, Storekeepers, Cashiers)
│   ├── 1.1.3  Scope statement and deliverable list
│   └── 1.1.4  Project schedule and risk register
│
├── 1.2  Requirements Engineering
│   ├── 1.2.1  Elicitation — interviews with shop staff, observation of manual processes
│   ├── 1.2.2  Functional requirements per module (SRS §3)
│   ├── 1.2.3  Non-functional requirements — security, performance, offline use (SRS §4)
│   └── 1.2.4  SRS review and sign-off
│
├── 1.3  System Design
│   ├── 1.3.1  Architecture design — REST API + web client + desktop client
│   ├── 1.3.2  Database design — PostgreSQL schema (60 tables)
│   ├── 1.3.3  API contract design — resource modelling, JWT auth flow
│   ├── 1.3.4  UI/UX wireframes — 32 application screens
│   └── 1.3.5  Offline synchronisation strategy (branch-scoped pull/push)
│
├── 1.4  Backend Implementation (RESTful API)
│   ├── 1.4.1  Project scaffolding — Express 5, layered architecture
│   │          (routes → controllers → services → repositories)
│   ├── 1.4.2  Security middleware — helmet, CORS, rate limiting, HPP,
│   │          XSS-clean, bcrypt hashing, express-validator
│   ├── 1.4.3  Authentication & authorisation
│   │   ├── 1.4.3.1  Login with access + refresh tokens
│   │   ├── 1.4.3.2  Branch selection with branch-scoped token re-issue
│   │   ├── 1.4.3.3  Role-based permissions (roles / role_permissions / permissions)
│   │   └── 1.4.3.4  Password reset with 1-hour expiring email tokens
│   ├── 1.4.4  Core inventory modules
│   │   ├── 1.4.4.1  Products, categories, suppliers, units of measure, images
│   │   ├── 1.4.4.2  Per-branch inventory (product_branch_inventory) with reorder levels
│   │   ├── 1.4.4.3  Stock movements / inventory transactions
│   │   └── 1.4.4.4  Inter-branch stock transfers
│   ├── 1.4.5  Purchasing module — purchase orders, items locked to DRAFT,
│   │          automatic total recalculation, receiving, supplier payments
│   ├── 1.4.6  Sales module — POS carts, sales, sale items, receipts, customer payments
│   ├── 1.4.7  Customers & expenses modules
│   ├── 1.4.8  Reporting module — daily/monthly/annual sales, profit,
│   │          inventory valuation, low stock; CSV / Excel / PDF export
│   ├── 1.4.9  Notification service — in-app, e-mail (Gmail SMTP over implicit
│   │          TLS), SMS fan-out; targeting USERS / ALL / BRANCH
│   ├── 1.4.10 Background message queue — persistent jobs, exponential-backoff
│   │          retries, admin monitoring + resend endpoint
│   ├── 1.4.11 Audit trail — audit logs, activity logs, login history
│   └── 1.4.12 Offline sync endpoints — branch-scoped incremental pull/push
│
├── 1.5  Web Client Implementation (React 19 + Vite + TypeScript)
│   ├── 1.5.1  Auth context, refresh-token handling, route guards
│   ├── 1.5.2  Branch selection screen and branch-aware data loading
│   ├── 1.5.3  Dashboard with KPI cards and charts
│   ├── 1.5.4  POS terminal — barcode search, live branch-stock display, checkout
│   ├── 1.5.5  Inventory screens — products, stock movements, transfers, purchases
│   ├── 1.5.6  Administration screens — users, roles, branches, business settings
│   ├── 1.5.7  Notifications centre + compose page (USERS/ALL/BRANCH targets)
│   ├── 1.5.8  Reports screen with export actions
│   └── 1.5.9  Admin message-queue monitor with resend action
│
├── 1.6  Desktop Client Implementation (Electron 42)
│   ├── 1.6.1  Electron shell, build pipeline (electron-builder), HID scanner support
│   ├── 1.6.2  IndexedDB offline cache (idb) — branch-scoped entities only
│   ├── 1.6.3  Offline POS — cached catalog, queued mutations, auto re-sync
│   └── 1.6.4  Sync log viewer for conflict/outage diagnosis
│
├── 1.7  Testing & Quality Assurance
│   ├── 1.7.1  Unit/integration tests (Jest + Supertest)
│   ├── 1.7.2  Endpoint verification against live database (per-feature scripts)
│   ├── 1.7.3  Front-end linting (oxlint) and type-checking (tsc -b)
│   ├── 1.7.4  Role-based permission testing
│   └── 1.7.5  Defect fixing — e.g., snake/camelCase filter normalisation,
│              SMTP transport fix (587 STARTTLS → 465 implicit TLS),
│              queue retry-status bug, PO total recalculation backfill
│
├── 1.8  Deployment & Release
│   ├── 1.8.1  Environment configuration (.env management)
│   ├── 1.8.2  Database migration/backfill scripts
│   └── 1.8.3  Desktop installer packaging
│
└── 1.9  Documentation & Handover
    ├── 1.9.1  Work breakdown structure (this document)
    ├── 1.9.2  Software Requirements Specification
    ├── 1.9.3  Project chapter report
    ├── 1.9.4  Prototype description
    ├── 1.9.5  Gantt chart / schedule
    └── 1.9.6  User manual
```

---

## 2. Task Table

| WBS | Task | Primary output | Est. effort |
|-----|------|----------------|-------------|
| 1.1 | Initiation & planning | Scope statement, schedule | 1 week |
| 1.2 | Requirements engineering | SRS v1.0 | 2 weeks |
| 1.3 | System design | ERD, architecture diagrams, wireframes | 3 weeks |
| 1.4 | Backend implementation | RESTful API (30+ route modules) | 8 weeks |
| 1.5 | Web client | 32-screen React application | 6 weeks |
| 1.6 | Desktop client | Offline-capable Electron app | 3 weeks |
| 1.7 | Testing & QA | Test scripts, defect log, fixed build | 3 weeks |
| 1.8 | Deployment | Configured environments, installer | 1 week |
| 1.9 | Documentation | This documentation set | 2 weeks |

*Effort overlaps between tracks; totals exceed calendar duration because backend,
web and desktop work ran concurrently from June to August 2026.*

---

## 3. Milestones

| # | Milestone | Target month | Verification |
|---|-----------|--------------|--------------|
| M1 | Requirements approved (SRS) | March 2026 | Sign-off |
| M2 | Database + API skeleton running | April 2026 | Server boots, migrations applied |
| M3 | Feature-complete backend | July 2026 | All endpoints verified against live DB |
| M4 | Web client feature-complete | July 2026 | Full workflow walkthrough |
| M5 | Offline desktop client working | August 2026 | Airplane-mode POS test |
| M6 | QA passed / defects closed | August 2026 | Lint + type-check clean, regression suite green |
| M7 | Documentation set delivered | August 2026 | docs/ complete |

---

## 4. Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| Project lead / developer | Architecture, backend, clients, documentation |
| Business Owner (client) | Domain rules approval, UAT participation |
| End users (managers, storekeepers, cashiers) | Requirements input, acceptance testing |

---

## 5. Risks & Mitigations (observed during the project)

| Risk | Impact | Mitigation taken |
|------|--------|------------------|
| Unreliable shop internet | POS downtime | Offline-first desktop cache + sync queue |
| SMTP blocking on some networks | E-mail delivery failure | Implicit-TLS port 465 + logged fallback + queue retries |
| Data entry of inactive records | Confusing catalogs | Soft-delete (`is_active`) + hidden-by-default listings |
| Concurrent stock edits across branches | Overselling | Per-branch inventory rows + transactional updates + availability checks |
