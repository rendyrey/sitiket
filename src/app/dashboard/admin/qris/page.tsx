import type { Metadata } from "next";
import QrisConfigManager from "@/features/admin/components/qris-config-manager";
import { getMyQrisConfig } from "@/features/admin/lib/api";

export const metadata: Metadata = { title: "QRIS" };

export default async function AdminQrisPage() {
  const config = await getMyQrisConfig();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">QRIS</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Your static QRIS code — buyers scan it with any e-wallet or mobile banking app. Enable it per event from the
        event&apos;s Details tab; bank transfer keeps working alongside it.
      </p>
      <div className="mt-8 max-w-3xl">
        <QrisConfigManager config={config} />
      </div>
    </div>
  );
}
