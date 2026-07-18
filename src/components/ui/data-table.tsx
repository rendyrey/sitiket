"use client";

import { useMemo, useState, type ReactNode } from "react";
import cn from "@/utils/class-names";

export type DataTableColumn<T> = {
  /** Unique column key, also used as the React key for header/cell. */
  key: string;
  header: string;
  /** Cell content for a row. */
  render: (row: T) => ReactNode;
  /** Enables the sort toggle on this column's header when provided. */
  sortAccessor?: (row: T) => string | number;
  /** Included in the free-text search match when provided. */
  searchAccessor?: (row: T) => string;
  align?: "left" | "right";
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  pageSize?: number;
};

/**
 * Searchable, sortable, paginated table shell shared by every dashboard
 * list (Super Admin + Admin). Columns own their own cell rendering and
 * optional sort/search accessors; this component only owns the query/sort/
 * page state and the filter → sort → slice pipeline.
 */
export default function DataTable<T>({
  columns,
  data,
  getRowKey,
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  pageSize = 10,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      columns.some((column) => column.searchAccessor?.(row).toLowerCase().includes(q)),
    );
  }, [data, query, columns]);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortAccessor) return filtered;
    const { sortAccessor } = column;
    return [...filtered].sort((a, b) => {
      const av = sortAccessor(a);
      const bv = sortAccessor(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortAccessor) return;
    setSortDir((dir) => (sortKey === column.key ? (dir === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(column.key);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          className="text-field mt-0 h-11 w-full max-w-xs"
        />
        <p className="text-xs font-semibold text-black/40">
          {sorted.length} {sorted.length === 1 ? "result" : "results"}
        </p>
      </div>

      <div className="overflow-x-auto border-2 border-ink bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b-2 border-ink bg-paper text-left text-[10px] font-black uppercase tracking-widest text-black/50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("p-3", column.align === "right" && "text-right", column.className)}>
                  {column.sortAccessor ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className="inline-flex items-center gap-1.5 hover:text-black"
                    >
                      {column.header}
                      <span className="text-black/30">
                        {sortKey === column.key ? (sortDir === "asc" ? "▲" : "▼") : "▴▾"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-sm font-semibold text-black/40">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {paginated.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-black/10">
                {columns.map((column) => (
                  <td key={column.key} className={cn("p-3", column.align === "right" && "text-right", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-black/50">
          <p>
            Page {safePage} of {pageCount}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="button button-dark disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="button button-dark disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
