# AssetFlow — Source Code Error & Gap Report

Generated from a full source analysis of `backend/src` and `frontend/src` against `docs/PRD.md`.

---

## 🔴 Critical

### C1 — `requireAuth` not mounted on protected routers (RBAC broken at the wire)
**STATUS: FIXED.** Mounted `requireAuth` globally in `backend/src/routes/index.ts` immediately after the `/auth` router (before all protected domain routers). `bookings` retains its own `requireAuth` (harmless double-application). All management endpoints are now reachable for authenticated callers.
**Fix:** add `router.use(requireAuth)` before each `roleGuard` chain, or globally in `routes/index.ts` / `app.ts`.

---

## 🟠 Incomplete / Missing Features

### C2 — Maintenance module is schema-only (no API surface)
**STATUS: FIXED.** Created `maintenance.service.ts` (raise / approve / resolve — approve flips asset to `Under Maintenance`, resolve flips back to `Available` via `stateMachine.validateStateTransition`), `maintenance.controller.ts`, `maintenance.schema.ts`, and `maintenance.routes.ts`. Wired into `routes/index.ts` under `/maintenance`. Approve/resolve are `roleGuard('Admin','Asset Manager')`; raise + list are authed-only.

### C3 — Frontend: 8 of 10 core screens are placeholders
**STATUS: PARTIALLY FIXED.** `pages/Assets.tsx` now fetches `/assets` via TanStack Query and renders a table with lifecycle status badges. `Allocations.tsx` and `Bookings.tsx` are now fully implemented (see C4). Remaining placeholder screens (Dashboard, OrgSetup, Maintenance, Audits, Reports, Activity) are still stubs — out of scope of the requested fixes.

### C4 — Required 409 conflict UIs not implemented
**STATUS: FIXED (Allocations + Bookings).** `pages/Allocations.tsx` catches `409 ALLOCATION_CONFLICT`, suppresses the generic toast, and opens a modal showing the holder name with an "Initiate Transfer Request" button (POST `/allocations/:id/transfer`). `pages/Bookings.tsx` uses `@fullcalendar/react` + day/time-grid plugins and shows a red overlap-warning banner with the conflicting time window on `409 BOOKING_OVERLAP`.

### C5 — Real-time / socket.io never wired
**STATUS: PARTIALLY FIXED.** `initSockets(server)` in `backend/src/server.ts` now creates a Socket.io server with CORS origins from env and a connection listener joining role-based rooms (e.g. `'Asset Manager'`). Frontend does not yet connect/emit (no socket client wired) — remaining work.

---

## 🟡 Minor / Dead Code / Robustness

### M1 — `utils/tokenCompare.ts` (`timingSafeEqual`) is unused
Refresh-token comparison uses bcrypt instead. PRD §13.1 asks for `crypto.timingSafeEqual()` for token comparisons — not currently used anywhere.

### M2 — Unused env vars
**STATUS: FIXED.** Removed `DEFAULT_CURRENCY` from `config/env.ts`. `CLIENT_URL` is now consumed in `app.ts` (added to the CORS origin allowlist alongside `CORS_ORIGINS`).

### M3 — Audit lock guard is service-layer only
**STATUS: FIXED.** Added a model-level `pre('save')` hook in `audit.model.ts` that throws `'Cannot modify a locked audit cycle'` when a non-new, already-locked document is saved (the legitimate lock-setting save is permitted via the `!isModified('locked')` check).

### M4 — `asset.service.ts` tag-number parsing is fragile
**STATUS: FIXED.** Replaced `tag.split('-')[1]` with a regex (`/(\d+)\s*$/`) that extracts trailing digits regardless of prefix format.

### M5 — `refreshSchema` is dead code
**STATUS: FIXED.** Deleted the unused `refreshSchema` from `modules/auth/auth.schema.ts`.

### M6 — `user.service.ts` missing
**STATUS: FIXED.** Created `modules/users/user.service.ts` with `listUsers`, `getUserById`, `promoteUser`, `updateUser` (DB calls moved out of the controller). Controller now delegates to the service.

### M7 — Frontend `RoleGuard` renders `null` on failure
**STATUS: PARTIALLY FIXED.** `components/Layout.tsx` now filters the sidebar `NAV` by the current user's role (Employees no longer see Org Setup / Audits / Reports / Activity). `RoleGuard` still renders `null` (unchanged).

### M8 — Frontend: no data-fetching layer used
**STATUS: PARTIALLY FIXED.** `react-query` is now used by `pages/Assets.tsx` (useQuery), `Allocations.tsx` (useQuery + useMutation), and `Bookings.tsx` (useQuery + useMutation).

### M9 — Frontend response-shape assumption is brittle
**STATUS: FIXED.** Added a response interceptor in `lib/api/client.ts` that unwraps `res.data.data` to the inner payload, so components read `res.assets` etc. Updated `AuthProvider` to consume the unwrapped `{ user }` / `{ accessToken, user }` shapes.

### M10 — `booking.controller.ts` `userId` fallback
`userId: req.user?.id ?? ''` is safe only because `booking.routes` applies `requireAuth` first. A move of that route without `requireAuth` would violate the required `userId`.

---

## ✅ Verified Correct (no action needed)
- Signup defaults to `Employee`, explicitly rejects non-Employee `role` (Pillar 1). Admin reachable only via seed script.
- Strict 7-state `stateMachine.ts` with correct transition graph + audit `Missing → Lost`.
- Booking overlap engine uses `start < end && end > start` (boundary-touching permitted) with a DB partial-unique index to defeat TOCTOU races.
- `acquisitionCost` is integer-only, analytics-only, explicitly non-financial (Pillar 4).
- Refresh tokens: bcrypt-hashed at rest, atomic rotation, HttpOnly / SameSite=Strict cookie.
- Zod env validation fails fast at boot.

---

## Recommended Priority Order
1. **C1** — mount `requireAuth` (unblocks entire API).
2. **C2** — build Maintenance module (API + automated state triggers).
3. **C3 / C4** — implement frontend screens, starting with the two 409 conflict UIs.
4. **C5** — wire real-time notifications.
5. **M1–M10** — cleanup pass.
