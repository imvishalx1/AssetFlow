export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>{note ?? 'Placeholder screen — build the UI here.'}</p>
    </div>
  );
}
