import { ReactNode } from "react";
export interface DataTableColumn<T> { key: string; header: string; cell: (row: T) => ReactNode; numeric?: boolean; }
export function DataTable<T>({ caption, columns, rows, rowKey, emptyMessage = "Nenhum registro." }: { caption: string; columns: DataTableColumn<T>[]; rows: T[]; rowKey: (row: T) => string; emptyMessage?: string }) {
  return <div className="ds-table-wrap"><table className="ds-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} className={column.numeric ? "ds-table__numeric" : undefined} scope="col">{column.header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} data-label={column.header} className={column.numeric ? "ds-table__numeric" : undefined}>{column.cell(row)}</td>)}</tr>) : <tr><td colSpan={columns.length}>{emptyMessage}</td></tr>}</tbody></table></div>;
}
