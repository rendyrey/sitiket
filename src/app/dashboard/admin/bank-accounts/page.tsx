import type { Metadata } from "next";
import BankAccountManager from "@/features/admin/components/bank-account-manager";
import { listBankAccounts } from "@/features/admin/lib/api";

export const metadata: Metadata = { title: "Bank accounts" };

export default async function AdminBankAccountsPage() {
  const accounts = await listBankAccounts();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Bank accounts</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        The accounts buyers transfer to. Each event can use your default account or a specific one — see the event&apos;s
        Details tab.
      </p>
      <div className="mt-8 max-w-3xl">
        <BankAccountManager accounts={accounts} />
      </div>
    </div>
  );
}
