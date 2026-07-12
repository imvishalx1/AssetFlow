export type Role = 'Admin' | 'AssetManager' | 'DepartmentHead' | 'Employee';

export const ROLES: Role[] = ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
