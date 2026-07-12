import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { useAuth } from '../auth/AuthProvider';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { ChevronDown } from 'lucide-react';

interface Department { _id: string; name: string; isActive: boolean; headUserId?: { name: string } }
interface Category { _id: string; name: string; key: string }
interface UserRow { _id: string; name: string; email: string; role: string; departmentId?: { name: string }; status: string }

const ROLES = ['Employee', 'Department Head', 'Asset Manager', 'Admin'];

export function OrgSetup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'departments' | 'categories' | 'directory'>('departments');
  const isAdmin = user?.role === 'Admin';

  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: async () => (await client.get('/departments')).data.departments as Department[] });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: async () => (await client.get('/categories')).data.categories as Category[] });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: async () => (await client.get('/users')).data.users as UserRow[] });

  const [showDept, setShowDept] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<UserRow | null>(null);
  const [promoteRole, setPromoteRole] = useState('');

  const addDept = useMutation({
    mutationFn: (body: Record<string, unknown>) => client.post('/departments', body),
    onSuccess: () => { setShowDept(false); toast.success('Department added'); qc.invalidateQueries({ queryKey: ['departments'] }); },
    onError: () => toast.error('Could not add department'),
  });
  const addCat = useMutation({
    mutationFn: (body: Record<string, unknown>) => client.post('/categories', body),
    onSuccess: () => { setShowCat(false); toast.success('Category added'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: () => toast.error('Could not add category'),
  });
  const promote = useMutation({
    mutationFn: (body: { id: string; role: string }) => client.patch(`/users/${body.id}/promote`, { role: body.role }),
    onSuccess: () => { setPromoteTarget(null); toast.success('Role updated'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Promotion failed (Admin only)'),
  });

  const deptCols: Column<Department>[] = [
    { key: 'name', header: 'Name' },
    { key: 'head', header: 'Head', render: (d) => d.headUserId?.name ?? '—' },
    { key: 'isActive', header: 'Active', render: (d) => <StatusBadge status={d.isActive ? 'Available' : 'Retired'} /> },
  ];
  const catCols: Column<Category>[] = [
    { key: 'name', header: 'Name' },
    { key: 'key', header: 'Key', render: (c) => <span className="mono">{c.key}</span> },
  ];
  const userCols: Column<UserRow>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email', render: (u) => <span className="mono">{u.email}</span> },
    { key: 'dept', header: 'Department', render: (u) => u.departmentId?.name ?? '—' },
    { key: 'role', header: 'Role', render: (u) => <span className="badge">{u.role}</span> },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status === 'Active' ? 'Available' : 'Lost'} /> },
    {
      key: 'actions',
      header: '',
      render: (u) => {
        if (!isAdmin || u.role === 'Admin') return null;
        return (
          <div className="dropdown">
            <button className="btn-ghost btn-sm" onClick={() => { setPromoteTarget(u); setPromoteRole(''); }}>
              Promote <ChevronDown size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="grid" style={{ gap: 20 }}>
      <h2 style={{ marginTop: 0 }}>Organization Setup</h2>

      <div className="tabs">
        <button className={tab === 'departments' ? 'tab active' : 'tab'} onClick={() => setTab('departments')}>Departments</button>
        <button className={tab === 'categories' ? 'tab active' : 'tab'} onClick={() => setTab('categories')}>Categories</button>
        <button className={tab === 'directory' ? 'tab active' : 'tab'} onClick={() => setTab('directory')}>Employee Directory</button>
      </div>

      {tab === 'departments' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="toolbar">
            <h3 style={{ margin: 0 }}>Departments</h3>
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => setShowDept(true)}>+ Add Department</button>
          </div>
          <div style={{ padding: 16 }}>
            <DataTable columns={deptCols} data={departments ?? []} emptyText="No departments." />
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="toolbar">
            <h3 style={{ margin: 0 }}>Asset Categories</h3>
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => setShowCat(true)}>+ Add Category</button>
          </div>
          <div style={{ padding: 16 }}>
            <DataTable columns={catCols} data={categories ?? []} emptyText="No categories." />
          </div>
        </div>
      )}

      {tab === 'directory' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="toolbar">
            <h3 style={{ margin: 0 }}>Employees {!isAdmin && <span className="badge">view only</span>}</h3>
          </div>
          <div style={{ padding: 16 }}>
            <DataTable columns={userCols} data={users ?? []} emptyText="No users." />
          </div>
        </div>
      )}

      <Modal open={showDept} onClose={() => setShowDept(false)} title="Add Department">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addDept.mutate({ name: fd.get('name'), isActive: true, headUserId: { name: fd.get('head') || 'Unassigned' } });
          }}
        >
          <div className="field full">
            <label>Name</label>
            <input name="name" required />
          </div>
          <div className="field full">
            <label>Head</label>
            <input name="head" placeholder="Department head name" />
          </div>
          <div className="modal-actions full">
            <button type="button" className="btn-ghost" onClick={() => setShowDept(false)}>Cancel</button>
            <button type="submit" className="btn" disabled={addDept.isPending}>Add</button>
          </div>
        </form>
      </Modal>

      <Modal open={showCat} onClose={() => setShowCat(false)} title="Add Category">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = (fd.get('name') as string) ?? '';
            addCat.mutate({ name, key: name.toLowerCase().replace(/\s+/g, '-') });
          }}
        >
          <div className="field full">
            <label>Name</label>
            <input name="name" required />
          </div>
          <div className="modal-actions full">
            <button type="button" className="btn-ghost" onClick={() => setShowCat(false)}>Cancel</button>
            <button type="submit" className="btn" disabled={addCat.isPending}>Add</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        title={`Promote ${promoteTarget?.name ?? ''}`}
        banner={{ tone: 'gold', text: 'Admin action' }}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPromoteTarget(null)}>Cancel</button>
            <button
              className="btn"
              disabled={!promoteRole || promote.isPending}
              onClick={() => promoteTarget && promoteRole && promote.mutate({ id: promoteTarget._id, role: promoteRole })}
            >
              Confirm Promotion
            </button>
          </>
        }
      >
        <p>Select the new role for this member. This is the only place role changes happen — users cannot elevate themselves.</p>
        <div className="field full">
          <label>New role</label>
          <select value={promoteRole} onChange={(e) => setPromoteRole(e.target.value)}>
            <option value="">Select role…</option>
            {ROLES.filter((r) => r !== 'Admin' || promoteTarget?.role === 'Admin').map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
