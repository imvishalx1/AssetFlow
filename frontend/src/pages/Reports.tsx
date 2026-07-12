import { useQuery } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { KpiCard } from '../components/KpiCard';
import { Skeleton } from '../components/Skeleton';
import { Boxes, IndianRupee, Wrench, AlertTriangle, ArrowLeftRight, CalendarDays } from 'lucide-react';

interface Summary {
  totalAssets: number;
  byStatus: { _id: string; count: number }[];
  activeAllocations: number;
  upcomingBookings: number;
  openMaintenance: number;
  overdueAllocations: number;
  totalAcquisitionCost: number;
}

const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// fixed sample intensities for the 7x5 activity heatmap (per-day bookings in mock)
const HEAT = [3, 1, 4, 2, 0, 5, 2, 6, 1, 3, 0, 2, 4, 1, 2, 5, 3, 1, 0, 4, 2, 1, 3, 2, 0, 6, 1, 2, 3, 1, 4, 2, 0, 1, 5];

export function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: async () => (await client.get('/analytics/summary')).data as Summary,
  });

  if (isLoading) return <div className="card"><Skeleton lines={6} /></div>;

  const statusMax = Math.max(1, ...(data?.byStatus ?? []).map((s) => s.count));

  return (
    <div className="grid" style={{ gap: 24 }}>
      <h2 style={{ marginTop: 0 }}>Reports &amp; Analytics</h2>

      <div className="grid grid-3">
        <KpiCard label="Total Assets" value={data?.totalAssets ?? 0} icon={<Boxes size={22} />} />
        <KpiCard label="Total Asset Value" value={fmtMoney(data?.totalAcquisitionCost ?? 0)} icon={<IndianRupee size={22} />} />
        <KpiCard label="Active Allocations" value={data?.activeAllocations ?? 0} icon={<ArrowLeftRight size={22} />} />
        <KpiCard label="Open Maintenance" value={data?.openMaintenance ?? 0} icon={<Wrench size={22} />} />
        <KpiCard label="Overdue Returns" value={data?.overdueAllocations ?? 0} icon={<AlertTriangle size={22} />} accent="gold" />
        <KpiCard label="Upcoming Bookings" value={data?.upcomingBookings ?? 0} icon={<CalendarDays size={22} />} />
      </div>

      <div className="grid grid-2">
        <div className="chart-card">
          <h3>Fleet by Status</h3>
          {(data?.byStatus ?? []).map((s) => (
            <div className="bar-row" key={s._id}>
              <span className="bar-label">{s._id}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(s.count / statusMax) * 100}%` }} />
              </div>
              <span className="bar-value">{s.count}</span>
            </div>
          ))}
          {(data?.byStatus ?? []).length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No data.</p>}
        </div>

        <div className="chart-card">
          <h3>Booking Activity Heatmap</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 0 }}>Bookings per day (last 5 weeks)</p>
          <div className="heatmap">
            {HEAT.map((v, i) => (
              <div key={i} className="heat-cell" style={{ opacity: 0.25 + (v / 6) * 0.75 }} title={`${v} bookings`} />
            ))}
          </div>
          <div className="row" style={{ gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            <span>Less</span>
            {[0, 1, 2, 3, 4, 5, 6].map((v) => (
              <div key={v} className="heat-cell" style={{ opacity: 0.25 + (v / 6) * 0.75 }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
