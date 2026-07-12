import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { isMockMode } from '../auth/mock';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/org-setup', label: 'Org Setup' },
  { to: '/assets', label: 'Assets' },
  { to: '/allocations', label: 'Allocations' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/audits', label: 'Audits' },
  { to: '/reports', label: 'Reports' },
  { to: '/activity', label: 'Activity' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">AssetFlow</div>
        <nav>
          {NAV.map((item) => (
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
