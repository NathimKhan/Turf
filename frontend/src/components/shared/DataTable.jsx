import { Card } from "../ui/card.jsx";
import { Badge } from "../ui/badge.jsx";

export function DataTable({ columns, emptyMessage = "No records found.", rows }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-low text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              {columns.map((column) => (
                <th className="px-5 py-4 font-black" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((row, rowIndex) => (
              <tr className="bg-white transition-colors hover:bg-surface-low/60" key={row.key || rowIndex}>
                {(row.cells || row).map((cell, index, cells) => (
                  <td className="px-5 py-4 font-medium text-ink-muted" key={`${cell}-${index}`}>
                    {index === cells.length - 1 && typeof cell === "string"
                      ? <Badge variant={String(cell).includes("Active") || String(cell).includes("Ready") || String(cell).includes("Healthy") || String(cell).includes("Approved") ? "success" : "primary"}>{cell}</Badge>
                      : cell}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-5 py-8 text-center text-ink-muted" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
