# AssetFlow

Enterprise Asset & Resource Management System — MERN + TypeScript.

## Quick start

```bash
npm install
cp backend/.env.example backend/.env   # fill in MONGODB_URI + JWT secrets
cp frontend/.env.example frontend/.env
npm run dev                           # backend :5000, frontend :5173
```

## Admin bootstrap (important)

Signup is intentionally **Employee-only** (no role selection, no self-elevation).
The first Admin account cannot be created through the UI — seed it once:

```bash
npm run seed
```

This reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` from
`backend/.env` and creates an Admin. Further role promotions
(`Department Head`, `Asset Manager`) happen only via the Employee Directory
(Screen 3, Tab C), guarded by `roleGuard(['Admin'])`.

## Notes
- Refresh tokens are stored hashed (bcrypt) and rotated atomically.
- Asset tags auto-generate (`AF-0001`…); acquisition cost is an integer for analytics only (no accounting).
- See `docs/PRD.md` and `docs/roadmap.md` for full requirements and the build plan.
