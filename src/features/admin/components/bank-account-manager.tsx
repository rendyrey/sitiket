"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
import FormField from "@/components/ui/form-field";
import { createBankAccountAction, updateBankAccountAction } from "@/features/admin/lib/actions";
import type { BankAccount } from "@/lib/api/types";

export default function BankAccountManager({ accounts }: { accounts: BankAccount[] }) {
  const router = useRouter();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      const message = "Fill in all fields.";
      setError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    const result = await createBankAccountAction({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolderName: accountHolderName.trim(),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    setBankName("");
    setAccountNumber("");
    setAccountHolderName("");
    router.refresh();
  };

  const handleSetDefault = async (accountId: string) => {
    await updateBankAccountAction(accountId, { isDefault: true });
    router.refresh();
  };

  const columns: DataTableColumn<BankAccount>[] = [
    {
      key: "bankName",
      header: "Bank",
      sortAccessor: (account) => account.bankName.toLowerCase(),
      searchAccessor: (account) => `${account.bankName} ${account.accountNumber} ${account.accountHolderName}`,
      render: (account) => <span className="font-black uppercase">{account.bankName}</span>,
    },
    {
      key: "accountNumber",
      header: "Account number",
      sortAccessor: (account) => account.accountNumber,
      render: (account) => account.accountNumber,
    },
    {
      key: "accountHolderName",
      header: "Holder name",
      sortAccessor: (account) => account.accountHolderName.toLowerCase(),
      render: (account) => account.accountHolderName,
    },
    {
      key: "isDefault",
      header: "",
      align: "right",
      sortAccessor: (account) => (account.isDefault ? 0 : 1),
      render: (account) =>
        account.isDefault ? (
          <span className="tag">Default</span>
        ) : (
          <button type="button" onClick={() => void handleSetDefault(account.id)} className="button button-dark">
            Set as default
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {accounts.length === 0 && (
        <p className="border-2 border-red-500/60 bg-red-500/5 p-5 text-sm font-semibold text-red-700">
          No bank accounts yet — buyers can&apos;t see where to pay until you add one.
        </p>
      )}
      {accounts.length > 0 && (
        <DataTable
          columns={columns}
          data={accounts}
          getRowKey={(account) => account.id}
          searchPlaceholder="Search bank accounts…"
        />
      )}

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Add bank account</span>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField
            required
            label="Bank name *"
            name="bankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="BCA"
          />
          <FormField
            required
            label="Account number *"
            name="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <FormField
            required
            wrapperClassName="sm:col-span-2"
            label="Account holder name *"
            name="accountHolderName"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
          />
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleCreate()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Adding…" : "Add account"}
        </button>
      </div>
    </div>
  );
}
