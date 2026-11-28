"use client";

import dayjs from "dayjs";
import { useState } from "react";
import SearchableSelect from "@/components/ui/searchable-select";
import { MERCH_ORDER_STATUS_OPTIONS } from "@/features/admin/components/merch-orders-manager";
import type { MerchOrderStatus } from "@/lib/api/types";

/**
 * Date-range (+ optional status) export of the seller's merch orders via
 * `GET /api/admin/reports/merch/export`. Excel carries an orders sheet and a
 * per-line-item sheet; CSV carries the orders only. Like `SalesReportPanel`,
 * the buttons are plain `<a>` links — the route's `Content-Disposition:
 * attachment` header does the download.
 */
export default function MerchExportPanel() {
  const [startDate, setStartDate] = useState(() => dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [status, setStatus] = useState<MerchOrderStatus | "all">("all");

  const invalidRange = startDate > endDate;
  const hrefFor = (format: "xlsx" | "csv") => {
    const query = new URLSearchParams({ startDate, endDate, status, format });
    return `/api/admin/reports/merch/export?${query.toString()}`;
  };

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Export orders</span>
      <p className="mt-3 max-w-xl text-sm text-black/50">
        Download every merch order placed in this date range. Excel has two sheets: one row per order, and one row per
        item for product totals and packing. CSV has one row per order.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
        <label className="field-label">
          Start date
          <input type="date" className="text-field" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="field-label">
          End date
          <input type="date" className="text-field" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="field-label">
          Status
          <SearchableSelect
            className="h-11"
            value={status}
            onChange={(value) => setStatus(value as MerchOrderStatus | "all")}
            options={MERCH_ORDER_STATUS_OPTIONS}
          />
        </label>
      </div>
      {invalidRange && <p className="mt-3 text-sm font-semibold text-red-600">Start date must be on or before the end date.</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        {(["xlsx", "csv"] as const).map((format) => (
          <a
            key={format}
            href={invalidRange ? undefined : hrefFor(format)}
            aria-disabled={invalidRange}
            className={`button ${format === "xlsx" ? "button-dark" : "button-outline-ink"} ${invalidRange ? "pointer-events-none opacity-50" : ""}`}
          >
            {format === "xlsx" ? "Download Excel" : "Download CSV"}
          </a>
        ))}
      </div>
    </div>
  );
}
