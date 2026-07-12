import type { Role } from './roles';
import type { AssetStatus } from '../services/stateMachine';

// ─── users/{uid} ─────────────────────────────────────────────────────────
// doc ID = Firebase Auth UID (source-of-truth).
export interface FirestoreUser {
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  status: 'Active' | 'Inactive';
}

// ─── departments/{id} ────────────────────────────────────────────────────
export interface FirestoreDepartment {
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
  isActive: boolean;
}

// ─── categories/{id} ─────────────────────────────────────────────────────
export interface FirestoreCategory {
  name: string;
  customFields: { key: string; label: string; dataType: 'text' | 'number' | 'date' | 'boolean' }[];
}

// ─── assets/{id} ─────────────────────────────────────────────────────────
export interface FirestoreAsset {
  tag: string;
  tagNumber: number;
  name: string;
  categoryId: string;
  serialNumber: string | null;
  acquisitionDate: FirebaseFirestore.Timestamp | null;
  acquisitionCost: number; // integer, analytics-only (Pillar 4)
  condition: 'New' | 'Good' | 'Fair' | 'Poor';
  location: string | null;
  status: AssetStatus;
  isBookable: boolean;
  departmentId: string | null;
}

// ─── assets/{id}/history/{eventId} (subcollection) ──────────────────
export interface FirestoreAssetHistory {
  type: string;
  note?: string;
  by?: string;
  at: FirebaseFirestore.Timestamp;
}

// ─── allocations/{id} ────────────────────────────────────────────────────
// Stores denormalized assetTag/assetName and userName to avoid N+1 reads.
export interface FirestoreAllocation {
  assetId: string;
  assetTag: string;        // denormalized copy
  assetName: string;       // denormalized copy
  userId: string;
  userName: string;        // denormalized copy
  departmentId: string | null;
  expectedReturnDate: FirebaseFirestore.Timestamp | null;
  status: 'Active' | 'Returned' | 'Transferred';
  checkInNotes: string | null;
  allocatedAt: FirebaseFirestore.Timestamp;
  returnedAt: FirebaseFirestore.Timestamp | null;
}

// ─── transfers/{id} ──────────────────────────────────────────────────────
export interface FirestoreTransfer {
  assetId: string;
  assetTag: string;        // denormalized
  assetName: string;       // denormalized
  fromUserId: string;
  fromUserName: string;    // denormalized
  toUserId: string;
  toUserName: string;      // denormalized
  requestedBy: string;
  status: 'Requested' | 'Approved' | 'Rejected';
  note: string | null;
  reviewedBy: string | null;
  reviewedAt: FirebaseFirestore.Timestamp | null;
}

// ─── bookings/{id} ───────────────────────────────────────────────────────
// Stores denormalized resource tag/name and userName to avoid N+1 reads.
export interface FirestoreBooking {
  resourceId: string;
  resourceTag: string;     // denormalized copy
  resourceName: string;    // denormalized copy
  userId: string;
  userName: string;        // denormalized copy
  title: string;
  startTime: FirebaseFirestore.Timestamp;
  endTime: FirebaseFirestore.Timestamp;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
}

// ─── maintenanceRequests/{id} ────────────────────────────────────────────
export type MaintenanceStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Technician Assigned'
  | 'In Progress'
  | 'Resolved';

export interface FirestoreMaintenance {
  assetId: string;
  assetTag: string;          // denormalized
  assetName: string;         // denormalized
  raisedBy: string;
  raisedByName: string;      // denormalized
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  photos: string[];
  status: MaintenanceStatus;
  technician: string | null;
  assignedAt: FirebaseFirestore.Timestamp | null;
  resolvedAt: FirebaseFirestore.Timestamp | null;
}

// ─── auditCycles/{id} ────────────────────────────────────────────────────
export type AuditResult = 'Pending' | 'Verified' | 'Missing' | 'Damaged';

export interface FirestoreAuditCycle {
  name: string;
  scopeType: 'Department' | 'Location';
  scopeValue: string;
  dateRange: { start: FirebaseFirestore.Timestamp; end: FirebaseFirestore.Timestamp };
  auditors: string[];
  status: 'Open' | 'Closed';
  locked: boolean;
}

// ─── auditCycles/{id}/checklistItems/{assetId} (subcollection) ──────
export interface FirestoreChecklistItem {
  result: AuditResult;
  note: string | null;
  assetTag: string;       // denormalized
  assetName: string;      // denormalized
}

// ─── activityLogs/{id} ───────────────────────────────────────────────────
// IMMUTABLE: no update/delete allowed at the Security Rules layer.
export interface FirestoreActivityLog {
  actorId: string | null;
  action: string;
  target: string;
  meta: Record<string, unknown> | null;
}
