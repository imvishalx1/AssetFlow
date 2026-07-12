import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { useAuth } from '../auth/AuthProvider';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';

interface Allocation {
  _id: string;
  assetId?: { tag: string; name: string };
  userId?: { name: string; email: string };
  status: string;
  expectedReturnDate?: string | null;
}

interface ApiError {
  response?: { data?: { error?: { code?: string; message?: string; holder?: string } } };
}

export function Allocations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [assetId, setAssetId] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  // Transfer modal state, opened on ALLOCATION_CONFLICT.
  const [conflict, setConflict] = useState<{ holder: string; assetId: string } | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await client.get('/allocations');
      return (res as unknown as { allocations: Allocation[] }).allocations;
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async (body: { assetId: string; userId?: string }) => {
      return client.post('/allocations', body);
    },
    onSuccess: () => {
      setAssetId('');
      setUserId('');
      setError('');
      qc.invalidateQueries({ queryKey: ['allocations'] });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      const code = e.response?.data?.error?.code;
      if (code === 'ALLOCATION_CONFLICT') {
        // Suppress the generic error toast — open the Transfer Request modal.
        setError('');
        setConflict({ holder: e.response?.data?.error?.holder ?? 'another user', assetId });
        return;
      }
      setError(e.response?.data?.error?.message ?? 'Allocation failed');
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (allocationId: string) => {
      // Request transfer of the active allocation to the current user.
      return client.post(`/allocations/${allocationId}/transfer`, {
        toUserId: user?.id,
        note: 'Transfer requested from conflict modal',
      });
    },
    onSuccess: () => {
      setTransferMsg('Transfer request submitted.');
      setConflict(null);
      qc.invalidateQueries({ queryKey: ['allocations'] });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      setTransferMsg(e.response?.data?.error?.message ?? 'Transfer request failed');
    },
  });

  const findActiveAllocation = async (assetIdValue: string): Promise<string | null> => {
    const res = await client.get('/allocations', { params: { assetId: assetIdValue } });
    const list = (res as unknown as { allocations: Allocation[] }).allocations;
    const active = list.find((a) => a.status === 'Active');
    return active?._id ?? null;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    allocateMutation.mutate({ assetId, userId: userId || undefined });
  };

  const onInitiateTransfer = async () => {
    if (!conflict) return;
    setTransferBusy(true);
    setTransferMsg('');
    try {
      const activeId = await findActiveAllocation(conflict.assetId);
      if (!activeId) {
        setTransferMsg('No active allocation found to transfer.');
        return;
      }
      await transferMutation.mutateAsync(activeId);
    } finally {
      setTransferBusy(false);
    }
  };

  const columns: Column<Allocation>[] = [
    {
      key: 'asset',
      header: 'Asset',
      render: (a) => (
        <span>
          <span className="mono">{a.assetId?.tag ?? '—'}</span> {a.assetId?.name ?? ''}
        </span>
      ),
    },
    { key: 'holder', header: 'Holder', render: (a) => a.userId?.name ?? '—' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'return',
      header: 'Expected Return',
      render: (a) => (a.expectedReturnDate ? new Date(a.expectedReturnDate).toLocaleDateString() : '—'),
    },
  ];

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Allocate Asset</h2>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="field full">
            <label>Asset ID</label>
            <input placeholder="Asset ID (e.g. 665f…)" value={assetId} onChange={(e) => setAssetId(e.target.value)} required />
          </div>
          <div className="field full">
            <label>User ID (optional — defaults to you)</label>
            <input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>
          <div className="field full">
            <button className="btn" type="submit" disabled={allocateMutation.isPending}>
              {allocateMutation.isPending ? 'Allocating…' : 'Allocate Asset'}
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Active &amp; Recent Allocations</h2>
          {isLoading ? (
            <Skeleton lines={5} />
          ) : (
            <DataTable columns={columns} data={allocations ?? []} emptyText="No allocations yet." />
          )}
        </div>
      </div>

      <Modal
        open={!!conflict}
        onClose={() => setConflict(null)}
        title="Asset Already In Use"
        banner={{ tone: 'gold', text: 'Allocation conflict' }}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConflict(null)} disabled={transferBusy}>
              Cancel
            </button>
            <button className="btn" onClick={onInitiateTransfer} disabled={transferBusy}>
              {transferBusy ? 'Submitting…' : 'Initiate Transfer Request'}
            </button>
          </>
        }
      >
        <p>
          This asset is currently held by <strong>{conflict?.holder}</strong>. You cannot allocate it
          directly — initiate a Transfer Request instead and the holder will be notified.
        </p>
        {transferMsg && <p className="error">{transferMsg}</p>}
      </Modal>
    </div>
  );
}
