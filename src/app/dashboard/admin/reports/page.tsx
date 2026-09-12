import type { Metadata } from "next";
import SalesReportPanel from "@/features/admin/components/sales-report-panel";

export const metadata: Metadata = { title: "Reports" };

export default function AdminReportsPage() {
  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Reports</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">Export your sales data for accounting, reconciliation, or offline reporting.</p>
      <div className="mt-8">
        <SalesReportPanel />
      </div>
    </div>
  );
}
