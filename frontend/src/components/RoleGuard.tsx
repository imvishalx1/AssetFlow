import { ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';

type Role = 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
