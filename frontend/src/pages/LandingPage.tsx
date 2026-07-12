import { useEffect, useState, type ReactNode, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { isMockMode } from '../auth/mock';
import {
  ShieldCheck,
  ArrowLeftRight,
  CalendarClock,
  ListChecks,
  Plus,
  Wrench,
  ClipboardCheck,
  Menu,
  X,
  Lock,
  Zap,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

interface Pillar { icon: LucideIcon; color: string; title: string; copy: string }
const PILLARS: Pillar[] = [
  {
    icon: ShieldCheck,
    color: 'navy',
    title: 'No Self-Elevation RBAC',
    copy: 'Roles are assigned by an Admin only. A new signup always starts as Employee and can never grant itself Asset Manager or Admin — the #1 cause of internal asset fraud.',
  },
  {
    icon: ArrowLeftRight,
    color: 'sky',
    title: 'Double-Allocation Block',
    copy: 'Every allocation checks for an active holder first. If an asset is already in use, you get a transfer request — never a silent second assignment.',
  },
  {
    icon: CalendarClock,
    color: 'gold',
    title: 'Time-Slot Overlap Validator',
    copy: 'Bookings are validated against existing reservations in the same window. Overlaps surface as a red block before they are ever saved.',
  },
  {
    icon: ListChecks,
    color: 'primary',
    title: '7-Stage State Machine',
    copy: 'Available → Allocated → Reserved → Under Maintenance → Lost → Retired → Disposed. Every transition is enforced and logged.',
  },
];

interface Step { n: number; icon: LucideIcon; title: string; desc: string }
const STEPS: Step[] = [
  { n: 1, icon: Plus, title: 'Register assets', desc: 'Bulk-import or scan each asset into a 7-state lifecycle with custom fields.' },
  { n: 2, icon: ArrowLeftRight, title: 'Allocate & book', desc: 'Assign to a person or reserve a time slot — conflicts are blocked before they happen.' },
  { n: 3, icon: Wrench, title: 'Track & maintain', desc: 'Raise maintenance, watch the Kanban, and keep utilization visible in real time.' },
  { n: 4, icon: ClipboardCheck, title: 'Audit & report', desc: 'Run audit cycles, verify or flag items, and close with a locked, immutable trail.' },
];

interface RoleCard { role: string; perms: string[] }
const ROLES: RoleCard[] = [
  { role: 'Admin', perms: ['Promotes users (no self-elevation)', 'Runs & closes audits', 'Full org setup'] },
  { role: 'Asset Manager', perms: ['Approves allocations & maintenance', 'Owns the asset directory', 'Runs audit cycles'] },
  { role: 'Department Head', perms: ['Requests assets for the team', 'Views department utilization', 'Approves local bookings'] },
  { role: 'Employee', perms: ['Books shared resources', 'Acknowledges allocations', 'Views own assignments'] },
];

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it Works' },
  { href: '#roles', label: 'Roles' },
  { href: '#showcase', label: 'Showcase' },
];

const SHOWCASE_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'allocations', label: 'Allocation conflict' },
];

function MiniChrome({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="lp-chrome">
      <div className="lp-chrome-bar">
        <span className="dot r" /><span className="dot y" /><span className="dot g" />
        <div className="lp-chrome-url">{url}</div>
      </div>
      <div className="lp-chrome-body">{children}</div>
    </div>
  );
}

function MiniDashboard() {
  return (
    <MiniChrome url="app.assetflow.com/dashboard">
      <div className="lp-mini-sidebar">
        <div className="lp-mini-brand">A</div>
        <div className="lp-mini-nav"><span /><span /><span /><span /><span /></div>
      </div>
      <div className="lp-mini-content">
        <div className="lp-mini-kpis">
          {['42', '18', '3', '7'].map((v, i) => (
            <div className="lp-mini-kpi" key={i}>
              <span>{['Available', 'Allocated', 'Open Maint.', 'Overdue'][i]}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <div className="lp-mini-rows">
          <div className="lp-mini-row" /><div className="lp-mini-row" /><div className="lp-mini-row" />
        </div>
      </div>
    </MiniChrome>
  );
}

function MiniBookings() {
  return (
    <MiniChrome url="app.assetflow.com/bookings">
      <div className="lp-mini-sidebar">
        <div className="lp-mini-brand">A</div>
        <div className="lp-mini-nav"><span /><span /><span /><span /><span /></div>
      </div>
      <div className="lp-mini-content">
        <div className="lp-mini-cal">
          {Array.from({ length: 21 }).map((_, i) => (
            <div className={`lp-mini-cell ${i === 9 ? 'overlap' : ''}`} key={i} />
          ))}
        </div>
      </div>
    </MiniChrome>
  );
}

function MiniAllocation() {
  return (
    <MiniChrome url="app.assetflow.com/allocations">
      <div className="lp-mini-sidebar">
        <div className="lp-mini-brand">A</div>
        <div className="lp-mini-nav"><span /><span /><span /><span /><span /></div>
      </div>
      <div className="lp-mini-content">
        <div className="lp-mini-modal">
          <strong>Asset Already In Use</strong>
          <p>Held by Priya Menon. Initiate a Transfer Request instead.</p>
          <div className="lp-mini-modal-actions">
            <span className="lp-mini-btn ghost">Cancel</span>
            <span className="lp-mini-btn">Initiate Transfer Request</span>
          </div>
        </div>
      </div>
    </MiniChrome>
  );
}

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [activeSection, setActiveSection] = useState('');

  // Real logged-in users skip the landing; in mock mode we still show it so it can be reviewed.
  useEffect(() => {
    if (user && !isMockMode) navigate('/dashboard', { replace: true });
  }, [user, isMockMode, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (path: string) => (e: MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    navigate(path);
  };

  // Smooth-scroll to an in-page section (accounts for the sticky navbar via scroll-margin-top).
  const scrollToSection = (href: string) => (e: MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Highlight the nav link for the section currently in view.
  useEffect(() => {
    const sections = NAV_LINKS
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lp-page">
      <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img className="lp-logo-img" src="/logo.svg" alt="AssetFlow" />
            <span className="lp-logo-word">AssetFlow</span>
          </a>
          <nav className="lp-nav-links">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={activeSection === l.href.slice(1) ? 'active' : ''}
                onClick={scrollToSection(l.href)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="lp-nav-cta">
            <button className="btn btn-ghost btn-lg" onClick={go('/login')}>Log in</button>
            <button className="btn btn-lg" onClick={go('/signup')}>Get Started</button>
            <button
              className="btn btn-ghost btn-sm lp-burger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lp-nav-menu">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={activeSection === l.href.slice(1) ? 'active' : ''}
                onClick={scrollToSection(l.href)}
              >
                {l.label}
              </a>
            ))}
            <div className="lp-nav-menu-cta">
              <button className="btn btn-ghost btn-block" onClick={go('/login')}>Log in</button>
              <button className="btn btn-block" onClick={go('/signup')}>Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">Enterprise Asset &amp; Resource Management</span>
            <h1>One system for every asset, every allocation, every audit.</h1>
            <p className="lp-hero-sub">
              Spreadsheets lose track of who holds what, double-allocate the same laptop, and leave no audit
              trail. AssetFlow enforces a 7-state lifecycle, blocks conflicts in real time, and keeps a
              complete history — so nothing slips through.
            </p>
            <div className="lp-hero-cta">
              <button className="lp-btn-white" onClick={go('/signup')}>Get Started Free</button>
              <a className="lp-btn-outline" href="#features">See it in action</a>
            </div>
            <div className="lp-hero-note">No credit card · The demo runs entirely in your browser</div>
          </div>
          <div className="lp-hero-visual">
            <MiniDashboard />
          </div>
        </div>
      </section>

      {/* TRUST / STAT BAR */}
      <div className="lp-stats">
        <div className="lp-stat"><ShieldCheck size={18} /> 7-state lifecycle enforcement</div>
        <div className="lp-stat"><Lock size={18} /> Zero self-elevation RBAC</div>
        <div className="lp-stat"><Zap size={18} /> Real-time conflict detection</div>
        <div className="lp-stat"><ScrollText size={18} /> Full audit trail</div>
      </div>

      {/* FEATURES — FOUR PILLARS */}
      <section id="features" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-eyebrow">The Four Pillars</span>
          <h2>Built to stop the problems spreadsheets can&apos;t catch.</h2>
        </div>
        <div className="lp-feature-grid">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div className="lp-feature" key={p.title}>
                <div className={`lp-feature-icon ${p.color}`}><Icon size={22} /></div>
                <h3>{p.title}</h3>
                <p>{p.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <span className="lp-eyebrow">How it works</span>
          <h2>From spreadsheet chaos to a single source of truth.</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div className="lp-step" key={s.n}>
                <div className="lp-step-badge"><Icon size={18} /></div>
                {i < STEPS.length - 1 && <div className="lp-step-line" />}
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Role-based access</span>
          <h2>Four roles. Least privilege by default.</h2>
        </div>
        <div className="lp-roles">
          {ROLES.map((r) => (
            <div className="lp-role" key={r.role}>
              <h3>{r.role}</h3>
              <ul>
                {r.perms.map((perm) => (
                  <li key={perm}>{perm}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SHOWCASE */}
      <section id="showcase" className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Product showcase</span>
          <h2>See the real screens.</h2>
        </div>
        <div className="lp-tabs">
          {SHOWCASE_TABS.map((t) => (
            <button
              key={t.id}
              className={`lp-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="lp-showcase">
          {tab === 'dashboard' && <MiniDashboard />}
          {tab === 'bookings' && <MiniBookings />}
          {tab === 'allocations' && <MiniAllocation />}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-cta">
        <h2>Ready to get your assets under control?</h2>
        <button className="lp-btn-white lg" onClick={go('/signup')}>Get Started Free</button>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img className="lp-logo-img" src="/logo.svg" alt="AssetFlow" />
            <div>
              <strong>AssetFlow</strong>
              <p>Enterprise asset &amp; resource management.</p>
            </div>
          </div>
          <div className="lp-footer-cols">
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#roles">Roles</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div>
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">© 2026 AssetFlow · Built for the hackathon demo.</div>
      </footer>
    </div>
  );
}
