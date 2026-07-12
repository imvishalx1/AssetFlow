import { AppError } from './appError';

export type AssetStatus =
  | 'Available'
  | 'Allocated'
  | 'Reserved'
  | 'Under Maintenance'
  | 'Lost'
  | 'Retired'
  | 'Disposed';

export const ASSET_STATUSES: AssetStatus[] = [
  'Available',
  'Allocated',
  'Reserved',
  'Under Maintenance',
  'Lost',
  'Retired',
  'Disposed',
];

// Strict 7-stage asset lifecycle transition graph (Pillar 3).
const ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  Available: ['Allocated', 'Reserved', 'Under Maintenance', 'Retired', 'Disposed'],
  Allocated: ['Available', 'Under Maintenance', 'Lost'],
  Reserved: ['Allocated', 'Available', 'Under Maintenance'],
  'Under Maintenance': ['Available', 'Retired', 'Disposed'],
  Lost: ['Available', 'Retired', 'Disposed'],
  Retired: ['Disposed', 'Available'],
  Disposed: [],
};

// Throws 400 INVALID_STATE_TRANSITION on illegal jumps. No-op for same-state.
export function validateStateTransition(current: AssetStatus, next: AssetStatus): void {
  if (current === next) return;
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new AppError(
      400,
      'INVALID_STATE_TRANSITION',
      `Illegal lifecycle transition from "${current}" to "${next}"`,
    );
  }
}
