import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

export function DataTable<T extends { _id?: string }>({
  columns,
  data,
  onRowClick,
  emptyText = 'No records found.',
}: DataTableProps<T>) {
  if (!data.length) {
    return (
      <div className="empty-state">
        <p>{emptyText}</p>
      </div>
    );
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={row._id ?? i}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.map((c) => (
              <td key={c.key}>{c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
