import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { client } from '../lib/api/client';
import { useAuth } from '../auth/AuthProvider';
import { KpiCard } from '../components/KpiCard';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Boxes, ArrowLeftRight, Wrench, CalendarDays, AlertTriangle, IndianRupee } from 'lucide-react';

interface Summary {
  totalAssets: number;
  byStatus: { _id: string; count: number }[];
  activeAllocations: number;
  upcomingBookings: number;
  openMaintenance: number;
  overdueAllocations: number;
  totalAcquisitionCost: number;
}
interface Allocation {
  _id: string;
  assetId?: { tag: string; name: string };
  userId?: { name: string };
  expectedReturnDate?: string | null;
  status: string;
}
interface Log {
  _id: string;
  actorId?: { name: string } | null;
  action: string;
  target: string;
  createdAt: string;
}

const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: async () => {
      const res = await client.get('/analytics/summary');
      return (res as unknown as Summary) as Summary;
    },
  });

  const { data: allocations } = useQuery({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await client.get('/allocations', { params: { status: 'Active' } });
      return (res as unknown as { allocations: Allocation[] }).allocations;
    },
  });

  const { data: activity } = useQuery({
    queryKey: ['activity-preview'],
    queryFn: async () => {
      const res = await client.get('/activity-logs');
      return (res as unknown as { logs: Log[] }).logs;
    },
  });

  const statusCount = (name: string) =>
    summary?.byStatus.find((s) => s._id === name)?.count ?? 0;

  const now = Date.now();
  const overdue = (allocations ?? []).filter(
    (a) => a.expectedReturnDate && new Date(a.expectedReturnDate).getTime() < now,
  );
  const upcoming = (allocations ?? []).filter(
    (a) => a.expectedReturnDate && new Date(a.expectedReturnDate).getTime() >= now,
  );

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="grid grid-3">
        <KpiCard
          label="Available"
          value={isLoading ? '—' : statusCount('Available')}
          icon={<Boxes size={22} />}
        />
        <KpiCard
          label="Allocated"
          value={isLoading ? '—' : statusCount('Allocated')}
          icon={<ArrowLeftRight size={22} />}
        />
        <KpiCard
          label="Open Maintenance"
          value={isLoading ? '—' : summary?.openMaintenance ?? 0}
          icon={<Wrench size={22} />}
        />
        <KpiCard
          label="Active Bookings"
          value={isLoading ? '—' : summary?.upcomingBookings ?? 0}
          icon={<CalendarDays size={22} />}
        />
        <KpiCard
          label="Overdue Returns"
          value={isLoading ? '—' : summary?.overdueAllocations ?? 0}
          icon={<AlertTriangle size={22} />}
          accent="gold"
        />
        <KpiCard
          label="Total Asset Value"
          value={isLoading ? '—' : fmtMoney(summary?.totalAcquisitionCost ?? 0)}
          icon={<IndianRupee size={22} />}
        />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Overdue Returns</h3>
          {overdue.length === 0 ? (
            <EmptyState title="All clear" description="No overdue allocations right now." />
          ) : (
            overdue.map((a) => (
              <div
                key={a._id}
                className="card"
                style={{ borderLeft: '4px solid var(--brand-gold)', marginBottom: 10, padding: 12 }}
              >
                <strong>{a.assetId?.tag}</strong> · {a.assetId?.name}
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Holder: {a.userId?.name} · Due {fmtDate(a.expectedReturnDate)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn btn-block" onClick={() => navigate('/assets')}>
              + Register Asset
            </button>
            <button className="btn btn-block btn-ghost" onClick={() => navigate('/bookings')}>
              📅 Book Resource
            </button>
            <button className="btn btn-block btn-ghost" onClick={() => navigate('/maintenance')}>
              🛠 Raise Maintenance Request
            </button>
          </div>
          <h3 style={{ marginTop: 24 }}>Upcoming Returns</h3>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No scheduled returns.</p>
          ) : (
            upcoming.slice(0, 4).map((a) => (
              <div
                key={a._id}
                className="card"
                style={{ borderLeft: '4px solid var(--brand-sky)', marginBottom: 10, padding: 12 }}
              >
                <strong>{a.assetId?.tag}</strong> · due {fmtDate(a.expectedReturnDate)}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="row-between">
          <h3 style={{ margin: 0 }}>Recent Activity</h3>
          <button className="btn-ghost btn-sm" onClick={() => navigate('/activity')}>
            View all
          </button>
        </div>
        {!activity ? (
          <Skeleton lines={3} />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {activity.slice(0, 5).map((l) => (
              <li
                key={l._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span>
                  <strong>{l.action}</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{l.target}</span>
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {l.actorId?.name ?? 'system'} · {new Date(l.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        Signed in as {user?.name} ({user?.role}).
      </p>
    </div>
  );
}
