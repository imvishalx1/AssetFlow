import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: 'gold' | 'danger';
}

export function KpiCard({ label, value, icon, accent }: KpiCardProps) {
  return (
    <div className={`kpi-card ${accent ? `accent-${accent}` : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {icon && <div className="kpi-icon">{icon}</div>}
    </div>
  );
}
