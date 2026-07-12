const STATUS_COLORS: Record<string, string> = {
  Available: '#22c55e',
  Allocated: '#0356ed',
  Reserved: '#7c5cff',
  'Under Maintenance': '#f59e0b',
  Lost: '#ef4444',
  Retired: '#94a3b8',
  Disposed: '#475569',
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? '#94a3b8';
  return (
    <span
      className="status-badge"
      style={{ background: `${c}1f`, color: c, borderColor: `${c}66` }}
    >
      <span className="dot" />
      {status}
    </span>
  );
}

export const STATUS_COLOR = (s: string) => STATUS_COLORS[s] ?? '#94a3b8';
