# AssetFlow

Enterprise Asset & Resource Management System — MERN + TypeScript → Firebase.

## Quick start (legacy MongoDB backend)

The original Express + MongoDB backend still runs alongside the new Firebase
stack. Use this for UI/UX development with mock mode:

```bash
npm install
cp backend/.env.example backend/.env   # fill in MONGODB_URI + JWT secrets
cp frontend/.env.example frontend/.env
npm run dev                           # backend :5000, frontend :5173
```

## Quick start (Firebase backend)

The Firebase migration replaces MongoDB, JWT, and Express with Firestore,
Firebase Auth, and Cloud Functions. The old `backend/` folder is preserved
until the cutover is verified.

### Prerequisites
1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication** (Email/Password provider), **Firestore**
   (production mode), **Cloud Functions**, and **Cloud Scheduler**.
3. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

### One-time setup
```bash
# Install Functions dependencies
cd functions && npm install

# (Optional) Link the project
firebase use --add   # select your Firebase project
```

### Run locally (Firebase Local Emulator Suite)
```bash
# Start the emulators (Auth :9099, Firestore :8080, Functions :5001, UI :4000)
cd functions && npm run serve
```

In a separate terminal, run the frontend against the emulators:
```bash
cd frontend && cp .env.example .env   # edit VITE_MOCK_AUTH=false and fill in
                                      # your Firebase project config keys
npm run dev                           # frontend :5173
```

### Deploy to Firebase
```bash
cd functions
firebase deploy --only functions,firestore,auth
```

## Admin bootstrap

Signup is intentionally **Employee-only** (no role selection, no self-elevation).
The first Admin cannot be created through the UI:

- **MongoDB backend:** `npm run seed` (uses `SEED_ADMIN_*` env vars)
- **Firebase backend:** Run the Cloud Function `promoteUser` via the Firebase
  console or the emulator shell.

## Mock mode

While `VITE_MOCK_AUTH=true` in `frontend/.env`, the entire UI runs against
in-memory seed data (no real backend needed). Flip it to `false` and configure
Firebase env vars to test against the emulators or production.

## Project structure

```
AssetFlow/
├── backend/                 # Legacy Express + MongoDB (kept until cutover)
├── functions/               # Firebase Cloud Functions (TypeScript, Node 20)
│   └── src/
│       ├── index.ts         # All onCall + trigger exports
│       ├── schemas/         # Zod validation schemas
│       ├── services/        # stateMachine, conflictEngine (ported pure logic)
│       └── types/           # Firestore types, roles
├── frontend/                # React 19 + Vite SPA
│   ├── src/lib/firebase.ts  # Firebase SDK init (mock-mode-aware)
│   └── src/lib/firebaseMutations.ts  # httpsCallable wrapper for TanStack Query
├── firebase.json            # Firebase project config
├── firestore.rules          # Security rules (Phase 4)
├── firestore.indexes.json   # Compound indexes
└── docs/
    └── data-model.md        # Full Firestore collection documentation
```

## Architectural notes (Firebase)
- **Custom claims** (not Firestore reads) store `role` and `departmentId`
  — the frontend reads them instantly from the ID token via `getIdTokenResult`.
- **Denormalized fields** (`assetTag`, `assetName`, `userName`) on
  allocation/booking/maintenance docs avoid N+1 reads for list views.
- **History** is a subcollection, not an array — prevents unbounded doc growth.
- **Activity logs** are immutable at the Firestore Security Rules layer
  (no role, including Admin, can update/delete).
- **Conflict engines** (allocation + booking) run inside Firestore transactions
  within Cloud Functions — the only way to atomically read-then-block in
  a serverless architecture.

## See also
- `docs/data-model.md` — every Firestore collection and its denormalization strategy
- `docs/PRD.md` and `docs/roadmap.md` — full requirements and build plan
