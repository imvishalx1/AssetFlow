# AssetFlow Firestore Data Model

> This document describes every Firestore collection, its document fields, and
> which fields are **source-of-truth** vs **denormalized copies**. Denormalized
> fields exist to avoid N+1 reads in list views — Firestore has no joins.

---

## Conventions

- **doc ID** is specified per collection; `{auto}` means auto-generated.
- **Timestamps** are stored as Firestore `Timestamp` (nanosecond precision).
- **Denormalized** fields are marked `(DENORMALIZED COPY)`. The source-of-truth
  is noted in the description.
- All collections use `createdAt`/`updatedAt` where applicable (managed by the
  application code, not Firestore's `__name__`).

---

## `users/{uid}`

| Field          | Type                         | Notes                                         |
|----------------|------------------------------|-----------------------------------------------|
| `uid` (doc ID) | string                       | Firebase Auth UID (source-of-truth, not our ID) |
| `name`         | string                       |                                                |
| `email`        | string                       |                                                |
| `role`         | `Admin / Asset Manager / Department Head / Employee` | Custom claims mirror; source-of-truth is custom claims. |
| `departmentId` | string \| null               | Custom claims mirror. Cleared via `promoteUser` only. |
| `status`       | `Active / Inactive`          |                                                |

**Source-of-truth**: Custom claims on the Firebase Auth user record. The
`users/{uid}` Firestore doc is a **mirror** needed for Firestore queries
(listing users, filtering by role/department).

**Writes**: Only Cloud Functions (Admin SDK). Client never writes this
collection directly.

---

## `departments/{id}`

| Field               | Type                         | Notes                    |
|---------------------|------------------------------|--------------------------|
| `id` (doc ID)       | string (auto)                |                          |
| `name`              | string                       |                          |
| `parentDepartmentId`| string \| null               | Self-referential FK      |
| `headUserId`        | string \| null               | Ref `users/{uid}`        |
| `isActive`          | boolean                      |                          |

No denormalized fields. Departments are small, read infrequently enough that
client-side joins (loading once, hydrating elsewhere) are practical.

---

## `categories/{id}`

| Field          | Type                         | Notes                    |
|----------------|------------------------------|--------------------------|
| `id` (doc ID)  | string (auto)                |                          |
| `name`         | string                       |                          |
| `customFields` | `{ key, label, dataType }[]` | Schema for per-category metadata |

No denormalized fields.

---

## `assets/{id}`

| Field             | Type                         | Notes                                  |
|-------------------|------------------------------|----------------------------------------|
| `id` (doc ID)     | string (auto)                |                                        |
| `tag`             | string                       | Unique, e.g. `AF-0042`. Indexed.       |
| `tagNumber`       | number                       | Auto-increment integer for tag generation |
| `name`            | string                       |                                        |
| `categoryId`      | string                       | Ref `categories/{id}`                  |
| `serialNumber`    | string \| null               |                                        |
| `acquisitionDate` | Timestamp \| null            |                                        |
| `acquisitionCost` | number                       | Integer, analytics-only (Pillar 4)     |
| `condition`       | `New / Good / Fair / Poor`   |                                        |
| `location`        | string \| null               |                                        |
| `status`          | 7-state enum                 | See `stateMachine.ts`                  |
| `isBookable`      | boolean                      |                                        |
| `departmentId`    | string \| null               | Ref `departments/{id}`                 |

### Subcollection: `assets/{id}/history/{eventId}`

| Field    | Type        | Notes                            |
|----------|-------------|-----------------------------------|
| `type`   | string      | e.g. `Allocated`, `Returned`      |
| `note`   | string \|   | Optional context                   |
| `by`     | string \|   | Actor name / email                 |
| `at`     | Timestamp   | Event time                        |

History is a **subcollection** instead of an array to avoid unbounded document
growth (1 MiB doc limit, read-cost inflation).

**Denormalized copies**: `assetTag` and `assetName` are copied onto
allocation, booking, maintenance, and transfer documents at write time. These
are read far more often than they are updated, making the read-cost trade-off
worthwhile.

---

## `allocations/{id}`

| Field               | Type                         | Notes                                  |
|---------------------|------------------------------|----------------------------------------|
| `id` (doc ID)       | string (auto)                |                                        |
| `assetId`           | string                       | Ref `assets/{id}` — **source-of-truth** for asset identity |
| `assetTag`          | string                       | (DENORMALIZED COPY) from `asset.tag`    |
| `assetName`         | string                       | (DENORMALIZED COPY) from `asset.name`   |
| `userId`            | string                       | Ref `users/{uid}` — **source-of-truth** for user identity |
| `userName`          | string                       | (DENORMALIZED COPY) from `user.name`    |
| `departmentId`      | string \| null               | Ref `departments/{id}` (from asset)    |
| `expectedReturnDate`| Timestamp \| null            |                                        |
| `status`            | `Active / Returned / Transferred` |                                 |
| `checkInNotes`      | string \| null               |                                        |
| `allocatedAt`       | Timestamp                    |                                        |
| `returnedAt`        | Timestamp \| null            |                                        |

---

## `transfers/{id}`

| Field          | Type                                | Notes                                  |
|----------------|-------------------------------------|----------------------------------------|
| `id` (doc ID)  | string (auto)                       |                                        |
| `assetId`      | string                              | Ref `assets/{id}`                      |
| `assetTag`     | string                              | (DENORMALIZED COPY)                    |
| `assetName`    | string                              | (DENORMALIZED COPY)                    |
| `fromUserId`   | string                              | Current holder                         |
| `fromUserName` | string                              | (DENORMALIZED COPY)                    |
| `toUserId`     | string                              | Requested recipient                    |
| `toUserName`   | string                              | (DENORMALIZED COPY)                    |
| `requestedBy`  | string                              | Actor who initiated                    |
| `status`       | `Requested / Approved / Rejected`  |                                        |
| `note`         | string \| null                      |                                        |
| `reviewedBy`   | string \| null                      | Admin/Manager who reviewed              |
| `reviewedAt`   | Timestamp \| null                   |                                        |

---

## `bookings/{id}`

| Field          | Type                                         | Notes                                  |
|----------------|----------------------------------------------|----------------------------------------|
| `id` (doc ID)  | string (auto)                                |                                        |
| `resourceId`   | string                                       | Ref `assets/{id}` — must be a bookable asset |
| `resourceTag`  | string                                       | (DENORMALIZED COPY) from `asset.tag`    |
| `resourceName` | string                                       | (DENORMALIZED COPY) from `asset.name`   |
| `userId`       | string                                       | Ref `users/{uid}`                      |
| `userName`     | string                                       | (DENORMALIZED COPY) from `user.name`    |
| `title`        | string                                       |                                        |
| `startTime`    | Timestamp                                    |                                        |
| `endTime`      | Timestamp                                    |                                        |
| `status`       | `Upcoming / Ongoing / Completed / Cancelled` |                                        |

---

## `maintenanceRequests/{id}`

| Field           | Type                                             | Notes                                  |
|-----------------|--------------------------------------------------|----------------------------------------|
| `id` (doc ID)   | string (auto)                                    |                                        |
| `assetId`       | string                                           | Ref `assets/{id}`                      |
| `assetTag`      | string                                           | (DENORMALIZED COPY)                    |
| `assetName`     | string                                           | (DENORMALIZED COPY)                    |
| `raisedBy`      | string                                           | Ref `users/{uid}`                      |
| `raisedByName`  | string                                           | (DENORMALIZED COPY)                    |
| `description`   | string                                           |                                        |
| `priority`      | `Low / Medium / High / Critical`                  |                                        |
| `photos`        | `string[]`                                       | URLs                                   |
| `status`        | `Pending / Approved / Rejected / Technician Assigned / In Progress / Resolved` | |
| `technician`    | string \| null                                   |                                        |
| `assignedAt`    | Timestamp \| null                                |                                        |
| `resolvedAt`    | Timestamp \| null                                |                                        |

---

## `auditCycles/{id}`

| Field        | Type                                    | Notes                           |
|--------------|-----------------------------------------|---------------------------------|
| `id` (doc ID)| string (auto)                           |                                 |
| `name`       | string                                  |                                 |
| `scopeType`  | `Department / Location`                |                                 |
| `scopeValue` | string                                  |                                 |
| `dateRange`  | `{ start: Timestamp, end: Timestamp }`  |                                 |
| `auditors`   | `string[]`                              | Ref `users/{uid}`               |
| `status`     | `Open / Closed`                        |                                 |
| `locked`     | boolean                                 | Set true on close; irreversible |

### Subcollection: `auditCycles/{id}/checklistItems/{assetId}`

| Field       | Type                                | Notes                   |
|-------------|-------------------------------------|-------------------------|
| `result`    | `Pending / Verified / Missing / Damaged` |                     |
| `note`      | string \| null                      |                         |
| `assetTag`  | string                              | (DENORMALIZED COPY)     |
| `assetName` | string                              | (DENORMALIZED COPY)     |

The checklist is a **subcollection** because an audit cycle can contain
hundreds of asset items that are updated independently; storing them as a
subcollection avoids document size limits and allows targeted reads/writes.

---

## `activityLogs/{id}`

| Field     | Type                         | Notes                                  |
|-----------|------------------------------|----------------------------------------|
| `id` (doc ID) | string (auto)            |                                        |
| `actorId` | string \| null               | Ref `users/{uid}`, null = system event |
| `action`  | string                       | e.g. `ASSET_ALLOCATE`                  |
| `target`  | string                       | e.g. `asset:af-0042`                   |
| `meta`    | `Record<string, unknown>` \| null | Additional context payload          |

**IMMUTABLE.** No update/delete allowed at the Security Rules layer for any
role, including Admin. This is enforced by `firestore.rules`, not by
convention.

---

## Index Requirements

See `firestore.indexes.json` at repo root. Compound indexes are added during
Phase 4 as each query pattern is introduced. The Firebase Local Emulator logs
the exact index definition required on first run of any unindexed compound
query.
