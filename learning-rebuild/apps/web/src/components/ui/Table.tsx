// =============================================================================
// Tabel data dengan header sel konsisten & baris kosong ramah.
// =============================================================================

import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index?: number) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
        {empty || 'Belum ada data.'}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                    c.align === 'right'
                      ? 'text-right'
                      : c.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${c.className || ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={getRowId(row)} className="hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 align-top text-slate-700 ${
                      c.align === 'right'
                        ? 'text-right'
                        : c.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${c.className || ''}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
