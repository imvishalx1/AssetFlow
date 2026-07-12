import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastViewport } from './Toast';

const STORAGE_KEY = 'af_sidebar_collapsed';

function initialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) return saved === 'true';
  // Collapsed rail by default under 1024px (still expandable via hamburger).
  return window.innerWidth < 1024;
}

export function Layout() {
  const { pathname } = useLocation();
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Rail mode = collapsed AND not on the mobile overlay.
  const rail = collapsed && !isMobile;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const onMenu = () => {
    if (isMobile) {
      setDrawerOpen((o) => !o);
      return;
    }
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* storage unavailable — non-fatal */
      }
      return next;
    });
  };

  const menuExpanded = isMobile ? drawerOpen : !rail;
  const rotated = isMobile ? drawerOpen : rail;

  return (
    <div className="layout">
      <Sidebar
        rail={rail}
        mobile={isMobile}
        open={drawerOpen}
        onNavigate={() => setDrawerOpen(false)}
        onMenu={onMenu}
        showToggle={!isMobile}
      />
      {isMobile && drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
      <div className="main">
        <Topbar onMenu={onMenu} showToggle={isMobile} menuExpanded={menuExpanded} rotated={rotated} />
        <main className="content">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
