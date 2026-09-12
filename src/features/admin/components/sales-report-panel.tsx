"use client";

import dayjs from "dayjs";
import { useState } from "react";

/**
 * Date-range picker + download link for the admin's Excel sales report
 * (`GET /api/admin/reports/export`) — one workbook, two sheets: every merch
 * order and every ticket order the admin owns in the range. The link is a
 * plain `<a>`; the route handler's `Content-Disposition: attachment` header
 * does the download, no client-side fetch/blob needed.
 */
export default function SalesReportPanel() {
  const [startDate, setStartDate] = useState(() => dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(() => dayjs().format("YYYY-MM-DD"));

  const invalidRange = startDate > endDate;
  const downloadHref = `/api/admin/reports/export?startDate=${startDate}&endDate=${endDate}`;

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Sales report</span>
      <p className="mt-3 max-w-xl text-sm text-black/50">
        Download an Excel workbook of every merch order and ticket order placed in this date range — one sheet each, with buyer details and items.
      </p>
      <div className="mt-5 grid gap-4 sm:max-w-md sm:grid-cols-2">
        <label className="field-label">
          Start date
          <input type="date" className="text-field" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="field-label">
          End date
          <input type="date" className="text-field" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      {invalidRange && <p className="mt-3 text-sm font-semibold text-red-600">Start date must be on or before the end date.</p>}
      <div className="mt-5">
        <a
          href={invalidRange ? undefined : downloadHref}
          aria-disabled={invalidRange}
          className={`button button-dark inline-block ${invalidRange ? "pointer-events-none opacity-50" : ""}`}
        >
          Download Excel
        </a>
      </div>
    </div>
  );
}
