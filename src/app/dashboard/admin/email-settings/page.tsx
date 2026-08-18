import type { Metadata } from "next";
import EmailConfigManager from "@/features/admin/components/email-config-manager";
import { getMyEmailConfig } from "@/features/admin/lib/api";

export const metadata: Metadata = { title: "Email settings" };

export default async function AdminEmailSettingsPage() {
  const config = await getMyEmailConfig();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Email settings</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Every email your buyers receive — verification codes, tickets, refund updates — is sent from your own address.
        Setting this up is required before you can create events.
      </p>
      <div className="mt-8 max-w-3xl">
        <EmailConfigManager config={config} />
      </div>
    </div>
  );
}
