import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { useAuth } from '../auth/AuthProvider';

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

  return (
    <div className="placeholder">
      <h2>Allocations &amp; Transfers</h2>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 420, marginBottom: 16 }}>
        <input
          placeholder="Asset ID (e.g. 665f...)"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          required
        />
        <input placeholder="User ID (optional, defaults to you)" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <button className="btn" type="submit" disabled={allocateMutation.isPending}>
          {allocateMutation.isPending ? 'Allocating…' : 'Allocate Asset'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      {conflict && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Asset Already Allocated</h3>
            <p>
              This asset is currently held by <strong>{conflict.holder}</strong>. You cannot allocate it
              directly — initiate a Transfer Request instead.
            </p>
            {transferMsg && <p className="error">{transferMsg}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setConflict(null)} disabled={transferBusy}>
                Cancel
              </button>
              <button className="btn" onClick={onInitiateTransfer} disabled={transferBusy}>
                {transferBusy ? 'Submitting…' : 'Initiate Transfer Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading allocations…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Holder</th>
              <th>Status</th>
              <th>Expected Return</th>
            </tr>
          </thead>
          <tbody>
            {allocations?.map((a) => (
              <tr key={a._id}>
                <td>
                  {a.assetId?.tag ?? '—'} {a.assetId?.name ?? ''}
                </td>
                <td>{a.userId?.name ?? '—'}</td>
                <td>{a.status}</td>
                <td>{a.expectedReturnDate ? new Date(a.expectedReturnDate).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
