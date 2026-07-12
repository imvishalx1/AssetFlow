export type Role = 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';

export const ROLES: Role[] = ['Admin', 'Asset Manager', 'Department Head', 'Employee'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
