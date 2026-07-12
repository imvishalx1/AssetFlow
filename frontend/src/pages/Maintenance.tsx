import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { useAuth } from '../auth/AuthProvider';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { Check, X, Wrench, Plus } from 'lucide-react';

interface Maint {
  _id: string;
  assetId?: { tag: string; name: string };
  raisedBy?: { name: string };
  description: string;
  priority: string;
  status: string;
  technician?: string;
  createdAt: string;
}

const COLUMNS = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved'];

const nextStatus: Record<string, string> = {
  Pending: 'Approved',
  Approved: 'Technician Assigned',
  'Technician Assigned': 'In Progress',
  'In Progress': 'Resolved',
};

export function Maintenance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canApprove = user?.role === 'Admin' || user?.role === 'Asset Manager';

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => (await client.get('/maintenance')).data.maintenance as Maint[],
  });

  const [showForm, setShowForm] = useState(false);
  const [assetTag, setAssetTag] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('Medium');

  const raise = useMutation({
    mutationFn: (body: Record<string, unknown>) => client.post('/maintenance', body),
    onSuccess: () => { setShowForm(false); setAssetTag(''); setDesc(''); setPriority('Medium'); toast.success('Maintenance request raised'); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: () => toast.error('Could not raise request'),
  });

  const update = useMutation({
    mutationFn: (body: { id: string; status: string }) => client.patch(`/maintenance/${body.id}`, { status: body.status }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: () => toast.error('Update failed'),
  });

  const reject = useMutation({
    mutationFn: (id: string) => client.patch(`/maintenance/${id}`, { status: 'Rejected' }),
    onSuccess: () => { toast.info('Request rejected'); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: () => toast.error('Update failed'),
  });

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Maintenance</h2>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={() => setShowForm(true)}><Plus size={16} /> Raise Request</button>
      </div>

      {isLoading ? (
        <div className="card">Loading…</div>
      ) : (
        <div className="kanban">
          {COLUMNS.map((col) => (
            <div className="kanban-col" key={col}>
              <div className="kanban-head">
                <StatusBadge status={col === 'Resolved' ? 'Available' : 'Under Maintenance'} />
                <span className="kanban-count">{data?.filter((m) => m.status === col).length ?? 0}</span>
              </div>
              {(data ?? []).filter((m) => m.status === col).map((m) => (
                <div className="kanban-card" key={m._id}>
                  <div className="row-between">
                    <strong className="mono">{m.assetId?.tag ?? '—'}</strong>
                    <span className={`badge ${m.priority === 'Critical' ? 'badge-danger' : m.priority === 'High' ? 'badge-gold' : ''}`}>{m.priority}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{m.assetId?.name ?? ''}</div>
                  <p style={{ margin: '6px 0', fontSize: 13 }}>{m.description}</p>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>By {m.raisedBy?.name ?? '—'}{m.technician ? ` · ${m.technician}` : ''}</div>
                  {col !== 'Resolved' && (
                    <div className="row" style={{ gap: 6, marginTop: 8 }}>
                      {col === 'Pending' && canApprove && (
                        <>
                          <button className="btn-sm btn" onClick={() => update.mutate({ id: m._id, status: nextStatus[col] })}><Check size={14} /> Approve</button>
                          <button className="btn-sm btn-ghost" onClick={() => reject.mutate(m._id)}><X size={14} /> Reject</button>
                        </>
                      )}
                      {col !== 'Pending' && (
                        <button className="btn-sm btn" onClick={() => update.mutate({ id: m._id, status: nextStatus[col] })}>
                          <Wrench size={14} /> {nextStatus[col]}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(data ?? []).filter((m) => m.status === col).length === 0 && (
                <div className="kanban-empty">—</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Raise Maintenance Request">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            raise.mutate({ assetTag, description: desc, priority });
          }}
        >
          <div className="field full">
            <label>Asset Tag</label>
            <input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="AF-0001" required />
          </div>
          <div className="field full">
            <label>Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} required />
          </div>
          <div className="field full">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
          </div>
          <div className="modal-actions full">
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn" disabled={raise.isPending}>{raise.isPending ? 'Submitting…' : 'Raise Request'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
