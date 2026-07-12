import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { client } from '../lib/api/client';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { toast } from '../components/Toast';
import { Plus, X, History } from 'lucide-react';

interface Asset {
  _id: string;
  tag: string;
  name: string;
  categoryId?: { name: string } | null;
  status: string;
  location?: string;
  condition?: string;
  isBookable?: boolean;
  history?: { type: string; note?: string; by?: string; at?: string }[];
}
interface Category {
  _id: string;
  name: string;
}

export function Assets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await client.get('/assets');
      return (res as unknown as { assets: Asset[] }).assets;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await client.get('/categories');
      return (res as unknown as { categories: Category[] }).categories;
    },
  });

  const registerMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => client.post('/assets', body),
    onSuccess: () => {
      setShowRegister(false);
      toast.success('Asset registered');
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Registration failed');
    },
  });

  const list = (data ?? []).filter(
    (a) =>
      (!status || a.status === status) &&
      (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tag.toLowerCase().includes(search.toLowerCase())),
  );

  const columns: Column<Asset>[] = [
    { key: 'tag', header: 'Tag', render: (a) => <span className="mono">{a.tag}</span> },
    { key: 'name', header: 'Name' },
    { key: 'categoryId', header: 'Category', render: (a) => a.categoryId?.name ?? '—' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'location', header: 'Location', render: (a) => a.location ?? '—' },
    { key: 'condition', header: 'Condition', render: (a) => a.condition ?? '—' },
    {
      key: 'actions',
      header: '',
      render: (a) => (
        <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(a); }}>
          <History size={14} /> History
        </button>
      ),
    },
  ];

  if (isLoading) return <div className="card"><Skeleton lines={5} /></div>;
  if (isError) {
    return (
      <div className="card">
        <h2>Asset Directory &amp; Registration</h2>
        <p className="error">Failed to load assets: {axios.isAxiosError(error) ? error.message : 'unknown error'}</p>
        <button className="btn" onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Search by name or tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 180 }}>
          <option value="">All statuses</option>
          {['Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn" onClick={() => setShowRegister(true)}><Plus size={16} /> Register Asset</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 16 }}>
          <DataTable columns={columns} data={list} onRowClick={setSelected} emptyText="No assets match your filters." />
        </div>
      </div>

      <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Register Asset">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            registerMutation.mutate({
              name: fd.get('name'),
              categoryId: fd.get('categoryId'),
              serialNumber: fd.get('serialNumber') || undefined,
              acquisitionDate: fd.get('acquisitionDate') || undefined,
              acquisitionCost: Number(fd.get('acquisitionCost') || 0),
              condition: fd.get('condition'),
              location: fd.get('location') || undefined,
              isBookable: fd.get('isBookable') === 'on',
            });
          }}
          className="form-grid"
        >
          <div className="field full">
            <label>Name</label>
            <input name="name" required />
          </div>
          <div className="field">
            <label>Category</label>
            <select name="categoryId" required>
              <option value="">Select…</option>
              {(categories ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Condition</label>
            <select name="condition" defaultValue="New">
              <option>New</option><option>Good</option><option>Fair</option><option>Poor</option>
            </select>
          </div>
          <div className="field">
            <label>Serial Number</label>
            <input name="serialNumber" />
          </div>
          <div className="field">
            <label>Acquisition Date</label>
            <input type="date" name="acquisitionDate" />
          </div>
          <div className="field">
            <label>Acquisition Cost (₹, analytics only)</label>
            <input type="number" name="acquisitionCost" min={0} step={1} defaultValue={0} />
          </div>
          <div className="field">
            <label>Location</label>
            <input name="location" />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ margin: 0 }}>Bookable resource</label>
            <input type="checkbox" name="isBookable" style={{ width: 'auto' }} />
          </div>
          <div className="modal-actions full">
            <button type="button" className="btn-ghost" onClick={() => setShowRegister(false)}>Cancel</button>
            <button type="submit" className="btn" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Saving…' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelected(null)} />
          <div className="drawer">
            <div className="row-between">
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <button className="btn-icon btn-sm" aria-label="Close" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <p className="mono">{selected.tag} · <StatusBadge status={selected.status} /></p>
            <div className="row" style={{ gap: 16, color: 'var(--text-secondary)' }}>
              <span>Category: {selected.categoryId?.name ?? '—'}</span>
              <span>Location: {selected.location ?? '—'}</span>
              <span>Condition: {selected.condition ?? '—'}</span>
            </div>
            <h3 style={{ marginTop: 20 }}>History</h3>
            <div className="timeline">
              {(selected.history ?? []).map((h, i) => (
                <div className="timeline-item" key={i}>
                  <strong>{h.type}</strong>
                  {h.note && <span> — {h.note}</span>}
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{h.at ? new Date(h.at).toLocaleString() : ''}</div>
                </div>
              ))}
              {(selected.history ?? []).length === 0 && <EmptyState title="No history yet" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
