import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { isMockMode } from '../auth/mock';

const MGMT = ['Admin', 'Asset Manager', 'Department Head'];
const ADMIN_MGR = ['Admin', 'Asset Manager'];

const NAV: { to: string; label: string; roles?: string[] }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/org-setup', label: 'Org Setup', roles: ['Admin'] },
  { to: '/assets', label: 'Assets', roles: MGMT },
  { to: '/allocations', label: 'Allocations', roles: MGMT },
  { to: '/bookings', label: 'Bookings' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/audits', label: 'Audits', roles: ADMIN_MGR },
  { to: '/reports', label: 'Reports', roles: MGMT },
  { to: '/activity', label: 'Activity', roles: ADMIN_MGR },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleNav = NAV.filter((item) => !item.roles || (user ? item.roles.includes(user.role) : false));

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">AssetFlow</div>
        <nav>
          {visibleNav.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>{user?.name}</span>
          <span className="role-badge">{user?.role}</span>
          {isMockMode && <span className="demo-badge">DEMO</span>}
          <button onClick={handleLogout}>Logout</button>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
