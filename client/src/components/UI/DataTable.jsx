import { clsx } from 'clsx';

export const DataTable = ({ columns, data, onRowClick, loading, emptyMessage }) => {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-8">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-subtle rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-text-muted">{emptyMessage || 'No records found'}</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row, rowIdx) => (
              <tr
                key={row._id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'transition-colors duration-150',
                  onRowClick ? 'cursor-pointer bg-subtle-hover' : '',
                )}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={clsx(
                      'px-4 py-3 text-sm',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
