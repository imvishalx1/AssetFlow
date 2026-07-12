# AssetFlow — Product Requirements Document (PRD)

### Enterprise Asset & Resource Management System
> **Document Type:** Product Requirements Document (Hackathon Build)
> **Version:** 1.0
> **Status:** Draft for Build
> **Audience:** Hackathon team, AI coding assistants, evaluators
> **Companion Docs:** `roadmap.md` (implementation plan), `PROJECT_BLUEPRINT.md` (architecture & prompt sheet)

---

## Table of Contents

1. [Document Control](#1-document-control)
2. [Executive Summary & Problem Statement](#2-executive-summary--problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Scope](#4-scope)
5. [Four Critical Architectural Pillars](#5-four-critical-architectural-pillars)
6. [Roles & RBAC Matrix](#6-roles--rbac-matrix)
7. [Functional Requirements — The 10 Core Screens](#7-functional-requirements--the-10-core-screens)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [System Architecture & Tech Stack](#9-system-architecture--tech-stack)
10. [Data Models](#10-data-models)
11. [Core Business Engines](#11-core-business-engines)
12. [API Specification Standard](#12-api-specification-standard)
13. [Security Requirements](#13-security-requirements)
14. [Frontend Requirements](#14-frontend-requirements)
15. [Acceptance Criteria & Test Plan](#15-acceptance-criteria--test-plan)
16. [Milestones](#16-milestones)

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Product | AssetFlow |
| Document Owner | Hackathon Team |
| Created | 2026-07-12 |
| Last Updated | 2026-07-12 |
| Reviewers | Evaluators, Technical Lead |

This PRD is the authoritative statement of **what** AssetFlow must do. The companion `PROJECT_BLUEPRINT.md` specifies **how** to build it (architecture, folder structure, code patterns, prompts). The `roadmap.md` sequences the work across a 24-hour sprint.

**Version Safety Rule:** Dependency versions in this document are illustrative, not authoritative. Always verify the latest stable release and CVE advisories via `npm show <pkg> version` and web search before writing `package.json`. Never hardcode stale semver strings.

---

## 2. Executive Summary & Problem Statement

### 2.1 Problem
Organizations that manage physical assets and shared resources (laptops, furniture, vehicles, meeting rooms, lab equipment) typically rely on spreadsheets and paper logs. This leads to:
- Double-allocation of the same asset to multiple people.
- Overlapping bookings of shared rooms/vehicles/equipment.
- No single source of truth for an asset's condition or location.
- No auditable trail of who held/changed what.
- Inconsistent or insecure role management (e.g., self-elevating admins).

### 2.2 Solution
AssetFlow is a centralized Enterprise Asset & Resource Management (ERM) web application that digitizes the full lifecycle of physical assets and shared resources. It delivers:
- Structured, enforced asset **lifecycles** (7-state machine).
- Two computational **conflict engines** that block illegal operations before they reach the database.
- Secure, **no-self-elevation** role-based access control.
- Real-time dashboards, booking calendars, maintenance workflows, and audit cycles.
- An immutable activity/audit trail.

### 2.3 Target Users
Any organization managing equipment, furniture, vehicles, or shared spaces — offices, schools, hospitals, factories, agencies. Four internal roles are supported: **Admin, Asset Manager, Department Head, Employee.**

---

## 3. Goals & Success Metrics

### 3.1 Primary Goals
- Replace manual tracking with a structured, queryable system of record for assets and resources.
- Enforce data integrity through the state machine and conflict engines (no "happy path only" UI hacks).
- Demonstrate security-hardened RBAC that explicitly resists self-elevation and IDOR.
- Keep the system strictly within ERP scope — **no purchasing, invoicing, or accounting contamination.**

### 3.2 Success Metrics (Hackathon Evaluation)
| Metric | Target |
| --- | --- |
| RBAC self-elevation attempt blocked | 100% — signup always yields `Employee` |
| Double-allocation attempt | Returns `409 ALLOCATION_CONFLICT` with holder name |
| Overlapping booking attempt | Returns `409 BOOKING_OVERLAP` with conflict window |
| Illegal state transition | Returns `400 INVALID_STATE_TRANSITION` |
| Automated transitions | Maintenance approve → `Under Maintenance`; resolve → `Available`; audit close (missing) → `Lost` |
| Audit trail immutability | No role (incl. Admin) can edit/delete activity logs |
| Type safety | `tsc --noEmit` clean on backend and frontend |
| Security baseline | `npm audit` clean of high/critical; helmet, cors allowlist, mongo-sanitize, rate-limit all enabled |

---

## 4. Scope

### 4.1 In Scope
- Authentication, registration (Employee-only), refresh-token session management.
- Organization master data: Departments, Asset Categories, Employee Directory.
- Asset registration with auto-generated tags (`AF-0001`) and lifecycle tracking.
- Allocation, Transfer, and Return workflows.
- Resource (shared asset) time-slot booking with calendar UI.
- Maintenance request approval workflow + auto state flipping.
- Structured audit cycles + discrepancy reporting + auto status promotion.
- Dashboards, KPI cards, analytics (utilization, heatmaps, idle assets).
- Real-time notifications + immutable activity logs.
- Acquisition Cost captured as an **integer**, used only for ranking/sorting/valuation analytics.

### 4.2 Out of Scope (Explicitly Forbidden)
- Purchasing / procurement modules.
- Invoicing / billing / depreciation ledgers.
- Any accounting, tax, or payment processing.
- Multi-tenant / SaaS isolation beyond a single organization.
- Native mobile apps (web SPA only for the sprint).

---

## 5. Four Critical Architectural Pillars

These four pillars are the evaluation differentiators and **must** be implemented correctly. They are referenced throughout the functional and security requirements.

### Pillar 1 — The "No Self-Elevation" RBAC Security Guard
- Sign-up **must** default every new user to `Employee`.
- The registration screen **must not** contain a role dropdown.
- The signup API **must not** accept or honor a `role` field in the payload (strip/ignore it).
- All promotions to `Department Head` and `Asset Manager` are locked behind an **Admin-only** route in the Employee Directory (Screen 3, Tab C).
- Rejections for self-elevation produce `403 SELF_ELEVATION_DENIED`.

### Pillar 2 — The Two Computational Conflict Engines
- **Double-Allocation Block:** If an asset's status is `Allocated`, any assignment by another user is rejected with `409 ALLOCATION_CONFLICT`. The UI intercepts this and presents an interactive **"Initiate Transfer Request"** modal showing the current holder's name.
- **Time-Slot Overlap Validator:** For shared bookable resources, the backend queries existing intervals with `startTime < requestedEnd && endTime > requestedStart`. On overlap, reject with `409 BOOKING_OVERLAP` and visually flag the collision on the calendar. Boundary-touching slots (existing ends 10:00, new starts 10:00) are **permitted**.

### Pillar 3 — The 7-Stage Strict State Machine
- Frontend components **never** arbitrarily set asset statuses.
- A backend validator (`src/services/stateMachine.ts`) strictly enforces legal transitions among 7 states.
- Legal transitions:
  - `Available` → `Allocated`, `Reserved`, `Under Maintenance`, `Retired`, `Disposed`
  - `Allocated` → `Available` (return), `Under Maintenance` (broken in use), `Lost`
  - `Reserved` → `Allocated`, `Available`, `Under Maintenance`
  - `Under Maintenance` → `Available`, `Retired`, `Disposed`
  - `Lost` → `Available` (found), `Retired`, `Disposed`
  - `Retired` → `Disposed`, `Available`
  - `Disposed` → (terminal, no exits)
- **Automated triggers:** Approving a maintenance request flips the asset to `Under Maintenance`; resolving the repair flips it back to `Available`; closing an audit cycle shifts confirmed-missing items to `Lost`.

### Pillar 4 — Zero Accounting Contamination
- The Registration Form captures **Acquisition Cost**, but the data model treats it purely as an integer for analytical ranking, utilization valuation, and retirement sorting.
- **No** billing tables, depreciation schedules, or invoice generators anywhere in the API or UI.

---

## 6. Roles & RBAC Matrix

> **CRITICAL:** Signup creates an **Employee** account only. Roles are promoted **only** by an Admin in the Employee Directory (Screen 3, Tab C).

| Role | Key Permissions & Responsibilities |
| --- | --- |
| **Admin** | Manages master data (Departments, Asset Categories, Employee Directory), sets up audit cycles, promotes employees to higher roles, views org-wide analytics. Protected by `roleGuard(['Admin'])`. |
| **Asset Manager** | Registers assets, allocates equipment, approves transfer requests, maintenance repairs, returns, and audit discrepancy resolutions. `roleGuard(['Asset Manager', 'Department Head'])` for transfer/approval actions. |
| **Department Head** | Views/department-scoped assets & allocations, approves allocation/transfer within department, books resources on behalf of department. Queries auto-scoped to `departmentId`. |
| **Employee** | Default signup role. Views personal allocated assets, books shared resources, raises maintenance requests, initiates return/transfer requests. |

**Departmental Scope Fencing:** When a `Department Head` queries assets/allocations, the service layer injects `{ departmentId: req.user.departmentId }` automatically.

---

## 7. Functional Requirements — The 10 Core Screens

Each screen lists functional requirements (FR) with IDs for traceability.

### Screen 1 — Login / Signup (Module 1)
- **FR-1.1** Users authenticate with email + password.
- **FR-1.2** Signup creates an `Employee` account only; no role selection in UI; `role` field stripped from payload (Pillar 1).
- **FR-1.3** Issue short-lived access JWT (`15m`) + refresh token in `HttpOnly; Secure; SameSite=Strict` cookie (`7d`).
- **FR-1.4** Support forgot-password + secure session validation (refresh rotation).
- **FR-1.5** Rate-limit auth routes (e.g., 10/min, skip successful) to blunt brute force.

### Screen 2 — Dashboard / Home (Module 2)
- **FR-2.1** Role-tailored real-time operational snapshot.
- **FR-2.2** KPI cards: *Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns*.
- **FR-2.3** Visually separate **overdue returns** (past Expected Return Date) from upcoming returns.
- **FR-2.4** Quick actions: *Register Asset, Book Resource, Raise Maintenance Request*.

### Screen 3 — Organization Setup (Admin Only — 3 Tabs) (Module 3)
- **FR-3.A** **Department Management:** create/edit/deactivate departments; assign Department Heads; optional Parent Department (hierarchy); Active/Inactive toggle.
- **FR-3.B** **Asset Category Management:** create/edit categories (Electronics, Furniture, Vehicles…); define optional category-specific fields (e.g., warranty period).
- **FR-3.C** **Employee Directory:** manage Name, Email, Department, Role, Status. **Only** place an Admin may promote an Employee to `Department Head` or `Asset Manager` (Pillar 1).

### Screen 4 — Asset Registration & Directory (Module 4)
- **FR-4.1** Registration form: Name, Category, Serial Number, Acquisition Date, **Acquisition Cost** (integer, analytics-only — Pillar 4), Condition, Location, photo/docs, `isBookable` toggle.
- **FR-4.2** Auto-generate unique Asset Tag on registration (e.g., `AF-0001`).
- **FR-4.3** Search/filter by Asset Tag, Serial Number, QR code, category, status, department, location.
- **FR-4.4** Display current lifecycle status + per-asset history (allocation + maintenance).
- **FR-4.5** All status changes routed through the state machine validator (Pillar 3).

### Screen 5 — Asset Allocation & Transfer (Module 5)
- **FR-5.1** Allocate assets to employees/departments with optional Expected Return Date.
- **FR-5.2** Enforce **Double-Allocation Block**; block taken assets, offer **Transfer Request** flow (Pillar 2).
- **FR-5.3** **Transfer Workflow:** *Requested → Approved (Asset Manager/Dept Head) → Re-allocated*, updating history.
- **FR-5.4** **Return Flow:** capture condition check-in notes; revert status to `Available` via state machine.
- **FR-5.5** Flag overdue allocations to feed Dashboard + Notifications.

### Screen 6 — Resource Booking (Module 6)
- **FR-6.1** Time-slot booking UI for shared (`isBookable`) resources with visual calendar.
- **FR-6.2** Enforce **Overlap Validation Engine**; reject overlapping slots with `409 BOOKING_OVERLAP` (Pillar 2).
- **FR-6.3** Track booking statuses (*Upcoming, Ongoing, Completed, Cancelled*); allow reschedule/cancel.
- **FR-6.4** Send reminder notifications before slots begin.

### Screen 7 — Maintenance Management (Module 7)
- **FR-7.1** Users raise requests: select asset, describe issue, set priority, attach photos.
- **FR-7.2** Workflow: *Pending → Approved/Rejected (Asset Manager) → Technician Assigned → In Progress → Resolved*.
- **FR-7.3** On approval → asset auto-flips to `Under Maintenance`; on resolve → auto-flips to `Available` (Pillar 3).
- **FR-7.4** Retain full maintenance history per asset.

### Screen 8 — Asset Audit (Module 8)
- **FR-8.1** Admins create an Audit Cycle scoped by Department/Location with a date range; assign auditors.
- **FR-8.2** Auditors mark each asset: *Verified, Missing, Damaged*.
- **FR-8.3** Auto-generate discrepancy report for flagged items.
- **FR-8.4** Closing the cycle locks the report and auto-updates confirmed-missing items to `Lost` (Pillar 3).

### Screen 9 — Reports & Analytics (Module 9)
- **FR-9.1** Visualize utilization trends (most-used vs idle assets).
- **FR-9.2** Maintenance frequency by asset/category.
- **FR-9.3** Identify assets due for maintenance / nearing retirement.
- **FR-9.4** Department-wise allocation summaries + booking heatmaps (peak windows).
- **FR-9.5** Exportable reports.
- **FR-9.6** Acquisition Cost used only for ranking/valuation (Pillar 4) — no financial ledgers.

### Screen 10 — Activity Logs & Notifications (Module 10)
- **FR-10.1** Real-time notifications for: Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return, Audit Discrepancy.
- **FR-10.2** Immutable comprehensive audit log (who/what/when).
- **FR-10.3** Activity logs are **create/read only** for all roles, including Admin (no edit/delete).

---

## 8. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| **Performance** | API responses < 300ms p95 for list queries; calendar render < 500ms. |
| **Reliability** | Central error handler returns standard JSON; unhandled errors logged to Winston + Sentry. |
| **Security** | helmet, CORS explicit allowlist, express-mongo-sanitize, per-route rate limiting, bcryptjs-hashed refresh tokens, timing-safe comparisons. |
| **Maintainability** | TypeScript strict mode; one source of truth for env validation; modular `modules/` layout. |
| **Observability** | Structured Winston logs (redact secrets/PII); Sentry error tracking in production. |
| **Real-time** | Socket.io room alerts for approvals & bookings. |
| **Compatibility** | Modern evergreen browsers; responsive SPA. |

---

## 9. System Architecture & Tech Stack

Monorepo: `backend/` (Express + Mongoose + TypeScript) and `frontend/` (Vite + React + TypeScript).

### 9.1 Backend Stack (verify latest before install)
| Layer | Choice |
| --- | --- |
| Runtime | Node.js (Active LTS) |
| Framework | Express |
| Language | TypeScript (strict) |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Validation | Zod (env, request bodies, state transitions) |
| Auth | Email/Password; jsonwebtoken; bcryptjs |
| Security | helmet, cors, express-mongo-sanitize, express-rate-limit |
| Real-time | socket.io |
| Scheduling | node-cron (overdue checks, scheduled audits) |
| Email | nodemailer (overdue/maintenance alerts) |
| Logging/Monitoring | winston, @sentry/node |

### 9.2 Frontend Stack (verify latest before install)
| Layer | Choice |
| --- | --- |
| Framework | React + Vite (SPA) |
| Routing | react-router-dom |
| Server state | TanStack Query |
| HTTP client | Axios (single-flight refresh interceptor) |
| Forms | React Hook Form + Zod |
| XSS protect | DOMPurify |
| Domain UI | @fullcalendar/react, @tanstack/react-table, qrcode.react, lucide-react |

### 9.3 Repository Layout (authoritative)
```
AssetFlow/
├── backend/
│   ├── src/
│   │   ├── server.ts                  # DB connect -> cron start -> listen
│   │   ├── app.ts                     # middleware stack + route mounts
│   │   ├── config/                    # env.ts (Zod), db.ts
│   │   ├── middleware/                # requireAuth, validate, roleGuard, errorHandler
│   │   ├── modules/                   # auth, departments, categories, users,
│   │   │                              #   assets, allocations, bookings,
│   │   │                              #   maintenance, audits, analytics, activityLogs
│   │   ├── services/                  # conflictEngine, stateMachine, email, cron
│   │   ├── sockets/index.ts
│   │   ├── utils/                     # jwt, assetTagGenerator, tokenCompare
│   │   └── types/express.d.ts
│   ├── postman/                       # collection.json, environment.json
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx, App.tsx
│   │   ├── lib/                       # env.ts, api/client.ts, api/refreshClient.ts
│   │   ├── auth/                      # AuthProvider, tokenStore (memory only)
│   │   ├── components/                # RequireAuth, RoleGuard, Layout, ErrorBoundary
│   │   └── features/                  # dashboard, orgSetup, assets, allocations,
│   │                                 #   bookings, maintenance, audits, reports, notifications
│   ├── .env.example
│   └── package.json
└── docs/                             # PRD.md, roadmap.md, PROJECT_BLUEPRINT.md
```

---

## 10. Data Models

> All asset status fields use the 7-state enum. Acquisition Cost is stored as integer (e.g., cents) for analytics only — never as currency for billing.

| Collection | Key Fields |
| --- | --- |
| **Users** | `_id`, `name`, `email` (unique), `passwordHash`, `role` (`Employee` default), `departmentId`, `status` |
| **Departments** | `_id`, `name`, `parentDepartmentId?`, `headUserId?`, `isActive` |
| **Categories** | `_id`, `name`, `customFields?` (e.g., warranty) |
| **Assets** | `_id`, `tag` (`AF-XXXX`), `name`, `categoryId`, `serialNumber`, `acquisitionDate`, `acquisitionCost` (int), `condition`, `location`, `status` (7-state enum), `isBookable`, `departmentId`, `history[]` |
| **Allocations** | `_id`, `assetId`, `userId`, `departmentId?`, `expectedReturnDate?`, `status` (`Active`/`Returned`/`Transferred`), `checkInNotes?` |
| **Bookings** | `_id`, `resourceId`, `userId`, `title`, `startTime`, `endTime`, `status` (`Upcoming`/`Ongoing`/`Completed`/`Cancelled`) |
| **MaintenanceRequests** | `_id`, `assetId`, `raisedBy`, `description`, `priority`, `photos?`, `status` (`Pending`→`Approved`/`Rejected`→`Technician Assigned`→`In Progress`→`Resolved`) |
| **AuditCycles** | `_id`, `scope` (dept/location), `dateRange`, `auditors[]`, `status`, `locked` (on close) |
| **ActivityLogs** | `_id`, `actorId`, `action`, `target`, `timestamp` — **immutable (no update/delete)** |

---

## 11. Core Business Engines

### 11.1 State Machine (`src/services/stateMachine.ts`)
- Exports `validateStateTransition(current, next)` enforcing the 7-state graph (Pillar 3).
- Throws `400 INVALID_STATE_TRANSITION` on illegal jumps.
- Invoked in service/controller layer **before** DB writes — never bypassed by UI.

### 11.2 Conflict Engine (`src/services/conflictEngine.ts`)
- `checkAllocationConflict(assetId)`: if asset `Allocated`, find active allocation, extract holder name, throw `409 ALLOCATION_CONFLICT` with `holder` field → UI shows Transfer modal.
- `validateBookingOverlap(resourceId, startTime, endTime, ignoreBookingId?)`: reject when `startTime >= endTime` (`400 INVALID_TIME_SLOT`), else query `resourceId` + status in `Upcoming`/`Ongoing` + `startTime < endTime && endTime > startTime`; throw `409 BOOKING_OVERLAP` with `conflictWindow`.

### 11.3 Automated Triggers
- Maintenance approve → `Under Maintenance`; resolve → `Available`.
- Audit close → confirmed-missing assets → `Lost`.

---

## 12. API Specification Standard

Every endpoint documented as: Description, Auth required, Min role, Request (headers/body), Success (201/200), and Failure responses (400/401/403/404/409/429/500). Standard shapes:

**Success**
```json
{ "success": true, "data": { } }
```
**Error**
```json
{ "success": false, "error": { "code": "BOOKING_OVERLAP", "message": "...", "conflictWindow": { "start": "...", "end": "..." } } }
```

### Error Code Master Reference
| HTTP | Code | Usage |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod failure on registration/form |
| 400 | `INVALID_STATE_TRANSITION` | Illegal lifecycle jump |
| 400 | `INVALID_TIME_SLOT` | Booking end ≤ start |
| 401 | `UNAUTHORIZED` | No token / expired session |
| 401 | `TOKEN_EXPIRED` | Access expired — frontend silently refreshes |
| 403 | `FORBIDDEN` | Employee attempting admin action |
| 403 | `SELF_ELEVATION_DENIED` | Signup injected Admin/Manager role |
| 404 | `NOT_FOUND` | Asset/dept/employee missing |
| 409 | `ALLOCATION_CONFLICT` | Asset taken → Transfer Request |
| 409 | `BOOKING_OVERLAP` | Time overlap |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unhandled — Winston + Sentry |

### Representative Endpoint — `POST /api/v1/bookings`
- **Auth:** Yes · **Min role:** Employee/Dept Head/Asset Manager/Admin
- **Body:** `{ "resourceId", "title", "startTime" (ISO8601), "endTime" (> startTime) }`
- **201:** returns created booking (`status: "Upcoming"`).
- **409 BOOKING_OVERLAP:** returns `conflictWindow`.
- **Rules:** resource must have `isBookable: true`; boundary-touching slots permitted.

---

## 13. Security Requirements

### 13.1 Authentication & RBAC
- [ ] Zero self-elevation: `/auth/signup` strips `role`, defaults `Employee` (Pillar 1).
- [ ] Only `Admin` via `PATCH /api/v1/users/:id/promote` may elevate roles.
- [ ] Access JWT 15m via `Authorization: Bearer`; refresh 7d in `HttpOnly; Secure; SameSite=Strict` cookie, bcryptjs-hashed at rest.
- [ ] `crypto.timingSafeEqual()` for token comparisons.

### 13.2 Data & Architecture
- [ ] No accounting/financial contamination (Pillar 4).
- [ ] `express-mongo-sanitize` mounted globally.
- [ ] `roleGuard(['Admin'])` protects Org Setup + Audit Cycle creation; `roleGuard(['Asset Manager','Department Head'])` protects transfer/maintenance approvals.
- [ ] Departmental scope fencing for Department Head queries.
- [ ] Activity logs immutable for all roles (FR-10.3).
- [ ] CORS explicit origin allowlist; helmet CSP tuned; per-route rate limiting.

---

## 14. Frontend Requirements

- [ ] Access JWT stored in memory only (`tokenStore.ts`) — **no localStorage** (XSS safety).
- [ ] DOMPurify sanitizes all user-generated content (descriptions, notes, findings) before render.
- [ ] Axios single-flight refresh interceptor: on `401 TOKEN_EXPIRED`, refresh once, replay queued requests.
- [ ] On `409 ALLOCATION_CONFLICT` → render **"Initiate Transfer Request"** modal with holder name (suppress generic toast).
- [ ] On `409 BOOKING_OVERLAP` → FullCalendar highlights conflict window in red; suggest next free block.
- [ ] `<RequireAuth>` wraps Screens 2–10; `<RoleGuard allowedRoles={['Admin']}>` wraps Screens 3 & 8 creation.
- [ ] Domain UI: @fullcalendar/react (bookings), @tanstack/react-table (directories), status badges for lifecycle states.

---

## 15. Acceptance Criteria & Test Plan

### 15.1 Postman 12-Step Verification Workflow
```
1. POST /auth/signup          -> role defaults to Employee
2. POST /auth/login           -> Admin login, capture accessToken
3. POST /departments          -> create 'Engineering'
4. POST /categories           -> create 'Laptops' + warranty fields
5. PATCH /users/:id/promote   -> promote Step-1 user to Asset Manager
6. POST /assets               -> register MacBook -> tag AF-0001
7. POST /allocations          -> allocate AF-0001 to Priya -> Allocated
8. POST /allocations          -> allocate AF-0001 to Raj -> ASSERT 409 CONFLICT
9. POST /bookings             -> Room B2 09:00–10:00
10. POST /bookings            -> Room B2 09:30–10:30 -> ASSERT 409 OVERLAP
11. POST /maintenance         -> request AF-0001 -> approve -> Under Maintenance
12. POST /audits              -> cycle, mark AF-0001 Missing -> close -> Lost
```

### 15.2 Automated Gates (CI)
- `npm run lint` clean.
- `tsc --noEmit` clean (backend + frontend).
- `npm audit --audit-level=high` clean.
- Conflict engines unit-tested (double-alloc, overlap, boundary permit).
- State machine unit-tested (legal + illegal transitions, automated triggers).

---

## 16. Milestones

Sequenced in `roadmap.md` across a 24-hour sprint:
- **Phase 1 (H1–4):** Repo, schemas, 7-state enum.
- **Phase 2 (H5–8):** Auth (Employee-only signup) + Org Setup + role promotion.
- **Phase 3 (H9–14):** Asset directory + Allocation/Transfer (Double-Alloc Engine) + Booking (Overlap Engine).
- **Phase 4 (H15–20):** Maintenance workflow + Audit cycles + auto status triggers.
- **Phase 5 (H21–24):** Activity logs, Dashboard, Analytics, end-to-end security/conflict testing.

---

*End of PRD. Pair this document with `PROJECT_BLUEPRINT.md` (build patterns) and `roadmap.md` (sequencing) for full execution coverage.*
