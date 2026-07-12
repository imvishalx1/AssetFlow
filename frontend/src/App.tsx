import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { RoleGuard } from './components/RoleGuard';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { OrgSetup } from './pages/OrgSetup';
import { Assets } from './pages/Assets';
import { Allocations } from './pages/Allocations';
import { Bookings } from './pages/Bookings';
import { Maintenance } from './pages/Maintenance';
import { Audits } from './pages/Audits';
import { Reports } from './pages/Reports';
import { Activity } from './pages/Activity';

// Management roles per the blueprint (Pillar 1: no self-elevation).
const MGMT = ['Admin', 'Asset Manager', 'Department Head'] as const;
const ADMIN_MGR = ['Admin', 'Asset Manager'] as const;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Org Setup is Admin-only (Pillar 1). */}
        <Route
          path="/org-setup"
          element={
            <RoleGuard allowedRoles={['Admin']}>
              <OrgSetup />
            </RoleGuard>
          }
        />
        <Route
          path="/assets"
          element={
            <RoleGuard allowedRoles={[...MGMT]}>
              <Assets />
            </RoleGuard>
          }
        />
        <Route
          path="/allocations"
          element={
            <RoleGuard allowedRoles={[...MGMT]}>
              <Allocations />
            </RoleGuard>
          }
        />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route
          path="/audits"
          element={
            <RoleGuard allowedRoles={[...ADMIN_MGR]}>
              <Audits />
            </RoleGuard>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleGuard allowedRoles={[...MGMT]}>
              <Reports />
            </RoleGuard>
          }
        />
        <Route
          path="/activity"
          element={
            <RoleGuard allowedRoles={[...ADMIN_MGR]}>
              <Activity />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
