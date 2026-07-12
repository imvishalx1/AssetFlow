import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { isMockMode } from '../auth/mock';
import { Menu } from 'lucide-react';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/org-setup': 'Organization Setup',
  '/assets': 'Asset Directory',
  '/allocations': 'Allocations & Transfers',
  '/bookings': 'Resource Bookings',
  '/maintenance': 'Maintenance',
  '/audits': 'Audits',
  '/reports': 'Reports & Analytics',
  '/activity': 'Activity Logs',
};

interface TopbarProps {
  onMenu?: () => void;
  showToggle: boolean;
  menuExpanded: boolean;
  rotated: boolean;
}

export function Topbar({ onMenu, showToggle, menuExpanded, rotated }: TopbarProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'AssetFlow';

  return (
    <header className="topbar">
      {onMenu && showToggle && (
        <button
          className={`btn btn-ghost btn-sm hamburger ${rotated ? 'rotated' : ''}`}
          onClick={onMenu}
          aria-expanded={menuExpanded}
          aria-label="Toggle sidebar"
        >
          <Menu size={16} />
        </button>
      )}
      <span className="page-title">{title}</span>
      <span className="spacer" />
      {user && <span className="role-badge">{user.role}</span>}
      {isMockMode && <span className="demo-badge">DEMO</span>}
      {user && <span style={{ fontWeight: 600 }}>{user.name}</span>}
      <button className="btn btn-ghost btn-sm" onClick={() => logout()}>
        Logout
      </button>
    </header>
  );
}
