import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { Modal } from '../components/Modal';
import { toast } from '../components/Toast';
import { CheckCircle, AlertTriangle, Hammer, Lock } from 'lucide-react';

interface AuditItem { assetId: { _id: string; tag: string; name: string }; result: string; note?: string }
interface AuditCycle {
  _id: string;
  name: string;
  scopeType: string;
  scopeValue: string;
  dateRange: { start: string; end: string };
  auditors: { name: string }[];
  status: string;
  locked: boolean;
  items: AuditItem[];
}

const fmtDate = (v: string) => new Date(v).toLocaleDateString();
const itemDone = (r: string) => r === 'Verified' || r === 'Missing' || r === 'Damaged';

export function Audits() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['audits'],
    queryFn: async () => (await client.get('/audits')).data.cycles as AuditCycle[],
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);

  const selected = (data ?? []).find((c) => c._id === selectedId) ?? null;

  const markItem = useMutation({
    mutationFn: (b: { cycleId: string; assetId: string; result: string }) =>
      client.patch(`/audits/${b.cycleId}/items/${b.assetId}`, { result: b.result }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audits'] }),
    onError: () => toast.error('Could not update item'),
  });

  const closeCycle = useMutation({
    mutationFn: (id: string) => client.post(`/audits/${id}/close`, {}),
    onSuccess: () => { setConfirmClose(null); setSelectedId(null); toast.success('Cycle closed — missing items marked Lost'); qc.invalidateQueries({ queryKey: ['audits'] }); },
    onError: () => toast.error('Close failed'),
  });

  const progress = (c: AuditCycle) => (c.items.length ? Math.round((c.items.filter((i) => itemDone(i.result)).length / c.items.length) * 100) : 0);

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h2 style={{ marginTop: 0 }}>Audits</h2>

      {isLoading ? (
        <div className="card">Loading…</div>
      ) : (
        <div className="grid grid-3">
          {(data ?? []).map((c) => (
            <div className="cycle-card" key={c._id} onClick={() => setSelectedId(c._id)}>
              <div className="row-between">
                <strong>{c.name}</strong>
                <span className={`badge ${c.locked ? 'badge-gold' : ''}`}>{c.status}</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {c.scopeType}: {c.scopeValue}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {fmtDate(c.dateRange.start)} → {fmtDate(c.dateRange.end)}
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${progress(c)}%` }} />
              </div>
              <div className="row-between" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{c.items.filter((i) => itemDone(i.result)).length}/{c.items.length} verified</span>
                {c.locked && <span><Lock size={12} /> locked</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedId(null)} />
          <div className="drawer">
            <div className="row-between">
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <button className="btn-ghost btn-sm" onClick={() => setSelectedId(null)}>Close</button>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Auditors: {selected.auditors.map((a) => a.name).join(', ') || '—'}
            </p>
            {selected.items.map((i) => (
              <div className="audit-item" key={i.assetId._id}>
                <div>
                  <strong className="mono">{i.assetId.tag}</strong> {i.assetId.name}
                  <div className="badge" style={{ marginLeft: 8 }}>{i.result}</div>
                </div>
                {!selected.locked && (
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn-sm btn-ghost" onClick={() => markItem.mutate({ cycleId: selected._id, assetId: i.assetId._id, result: 'Verified' })}><CheckCircle size={14} /> Verified</button>
                    <button className="btn-sm btn-ghost" onClick={() => markItem.mutate({ cycleId: selected._id, assetId: i.assetId._id, result: 'Missing' })}><AlertTriangle size={14} /> Missing</button>
                    <button className="btn-sm btn-ghost" onClick={() => markItem.mutate({ cycleId: selected._id, assetId: i.assetId._id, result: 'Damaged' })}><Hammer size={14} /> Damaged</button>
                  </div>
                )}
              </div>
            ))}
            {!selected.locked && (
              <button className="btn btn-block" onClick={() => setConfirmClose(selected._id)} style={{ marginTop: 16 }}>
                <Lock size={16} /> Close Cycle
              </button>
            )}
          </div>
        </>
      )}

      <Modal
        open={!!confirmClose}
        onClose={() => setConfirmClose(null)}
        title="Close Audit Cycle"
        banner={{ tone: 'danger', text: 'Irreversible' }}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmClose(null)}>Cancel</button>
            <button className="btn" disabled={closeCycle.isPending} onClick={() => confirmClose && closeCycle.mutate(confirmClose)}>
              {closeCycle.isPending ? 'Closing…' : 'Close & Lock'}
            </button>
          </>
        }
      >
        <p>Closing locks this cycle. All items still marked <strong>Missing</strong> will be flipped to <strong>Lost</strong> on the asset record. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
