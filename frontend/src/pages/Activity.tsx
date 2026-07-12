import { useQuery } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { DataTable, Column } from '../components/DataTable';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

interface Log {
  _id: string;
  actorId?: { name: string } | null;
  action: string;
  target: string;
  createdAt: string;
}

const fmt = (v: string) => new Date(v).toLocaleString();

export function Activity() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => (await client.get('/activity-logs')).data.logs as Log[],
  });

  const columns: Column<Log>[] = [
    { key: 'actor', header: 'Actor', render: (l) => l.actorId?.name ?? 'system' },
    { key: 'action', header: 'Action', render: (l) => <span className="badge">{l.action}</span> },
    { key: 'target', header: 'Target', render: (l) => <span className="mono">{l.target}</span> },
    { key: 'at', header: 'When', render: (l) => <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{fmt(l.createdAt)}</span> },
  ];

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h2 style={{ marginTop: 0 }}>Activity Logs</h2>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 16 }}>
          {isLoading ? (
            <Skeleton lines={5} />
          ) : (data ?? []).length === 0 ? (
            <EmptyState title="No activity yet" description="Actions across the workspace will appear here." />
          ) : (
            <DataTable columns={columns} data={data ?? []} emptyText="No activity." />
          )}
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>This is an immutable audit trail — read only.</p>
    </div>
  );
}
