import { formatPrice } from "@/data/events";
import type { PaymentInstructions } from "@/lib/api/types";

export default function BankTransferInstructions({ instructions }: { instructions: PaymentInstructions }) {
  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Transfer to</span>
      <div className="mt-5 space-y-4">
        {instructions.bankAccounts.map((account) => (
          <dl key={account.id} className="space-y-4 border-2 border-black/10 p-4 text-sm">
            {account.isRecommended && instructions.bankAccounts.length > 1 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Recommended</span>
            )}
            <Row label="Bank" value={account.bankName} />
            <Row label="Account number" value={account.accountNumber} />
            <Row label="Account holder" value={account.accountHolderName} />
          </dl>
        ))}
        <dl className="space-y-4 text-sm">
          <Row label="Amount" value={formatPrice(instructions.amount)} emphasize />
        </dl>
      </div>
      <p className="mt-5 border-t border-black/10 pt-4 text-xs leading-5 text-black/45">
        Transfer the exact amount to any one of the accounts above, then upload your proof of transfer below. The
        organizer reviews it manually — this is not instant.
      </p>
    </div>
  );
}

function Row({ emphasize = false, label, value }: { emphasize?: boolean; label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/10 pb-3">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-black/40">{label}</dt>
      <dd className={emphasize ? "text-xl font-black" : "font-bold"}>{value}</dd>
    </div>
  );
}
