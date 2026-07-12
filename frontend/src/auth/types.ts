export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
  departmentId: string | null;
  status: string;
}
