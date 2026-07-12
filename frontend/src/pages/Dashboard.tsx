import { useAuth } from '../auth/AuthProvider';

// Placeholder — KPI cards and overdue highlights land in a later phase.
export function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.name}. Full KPI dashboard arrives in the next phase.</p>
    </div>
  );
}
