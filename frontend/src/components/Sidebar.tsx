import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  ArrowLeftRight,
  CalendarDays,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Activity,
  Menu,
  type LucideIcon,
} from 'lucide-react';

type Role = 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

// Role-aware navigation. Mirrors backend roleGuard rules (Pillar 1).
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
  { to: '/org-setup', label: 'Org Setup', icon: Building2, roles: ['Admin'] },
  { to: '/assets', label: 'Assets', icon: Boxes, roles: ['Admin', 'Asset Manager', 'Department Head'] },
  { to: '/allocations', label: 'Allocations', icon: ArrowLeftRight, roles: ['Admin', 'Asset Manager', 'Department Head'] },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
  { to: '/audits', label: 'Audits', icon: ClipboardCheck, roles: ['Admin', 'Asset Manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['Admin', 'Asset Manager', 'Department Head'] },
  { to: '/activity', label: 'Activity', icon: Activity, roles: ['Admin', 'Asset Manager'] },
];

interface SidebarProps {
  rail: boolean;
  mobile: boolean;
  open: boolean;
  onNavigate?: () => void;
  onMenu?: () => void;
  showToggle: boolean;
}

export function Sidebar({ rail, mobile, open, onNavigate, onMenu, showToggle }: SidebarProps) {
  const { user } = useAuth();
  const role = (user?.role ?? 'Employee') as Role;
  const visible = NAV.filter((n) => n.roles.includes(role));

  // Toggle will-change only during the width transition (GPU hint without bloat).
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 320);
    return () => clearTimeout(t);
  }, [rail]);

  const cls = [
    'sidebar',
    rail ? 'collapsed' : '',
    mobile ? 'mobile' : '',
    mobile && open ? 'open' : '',
    animating ? 'animating' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={cls}>
      <div className="sidebar-head">
        {showToggle && (
          <button
            className={`btn-ghost btn-sm hamburger ${rail ? 'rotated' : ''}`}
            onClick={onMenu}
            aria-expanded={!rail}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="brand">
          <span className="brand-full">AssetFlow</span>
          <span className="brand-mark">A</span>
        </div>
      </div>
      <nav aria-label="Main navigation">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={18} />
              <span className="label">{item.label}</span>
              {rail && (
                <span className="nav-tip" role="tooltip">
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
