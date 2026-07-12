import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { client } from '../lib/api/client';

interface Asset {
  _id: string;
  tag: string;
  name: string;
  categoryId?: { name: string } | null;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  Available: '#22c55e',
  Allocated: '#38bdf8',
  Reserved: '#a78bfa',
  'Under Maintenance': '#f59e0b',
  Lost: '#ef4444',
  Retired: '#94a3b8',
  Disposed: '#64748b',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  return (
    <span
      className="badge"
      style={{ background: `${color}22`, color, border: `1px solid ${color}` }}
    >
      {status}
    </span>
  );
}

export function Assets() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await client.get('/assets');
      return (res as unknown as { assets: Asset[] }).assets;
    },
  });

  if (isLoading) return <div className="placeholder">Loading assets…</div>;
  if (isError) {
    return (
      <div className="placeholder">
        <h2>Asset Directory &amp; Registration</h2>
        <p className="error">
          Failed to load assets: {axios.isAxiosError(error) ? error.message : 'unknown error'}
        </p>
        <button className="btn" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="placeholder">
      <h2>Asset Directory &amp; Registration</h2>
      <p>{data?.length ?? 0} assets</p>
      <table className="table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((asset) => (
            <tr key={asset._id}>
              <td>{asset.tag}</td>
              <td>{asset.name}</td>
              <td>{asset.categoryId?.name ?? '—'}</td>
              <td>
                <StatusBadge status={asset.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
