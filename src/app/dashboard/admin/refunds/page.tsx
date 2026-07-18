import type { Metadata } from "next";
import RefundsOverview from "@/features/admin/components/refunds-overview";
import { listMyRefundRequests } from "@/features/admin/lib/api";

export const metadata: Metadata = { title: "Refunds" };

export default async function AdminRefundsPage() {
  const refundRequests = await listMyRefundRequests();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Refund requests</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">Across every event you own. Refunds are manual — mark one "money sent" only after you've actually transferred it back.</p>
      <div className="mt-8 max-w-3xl">
        <RefundsOverview refundRequests={refundRequests} />
      </div>
    </div>
  );
}
