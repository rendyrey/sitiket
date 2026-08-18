import Image from "next/image";
import { formatPrice } from "@/data/events";
import type { PaymentInstructions } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

/**
 * Every way a buyer can pay for this order: the organizer's payout bank
 * account(s) and/or their QRIS code. Either list can be absent — the backend
 * only returns instructions when at least one method exists.
 */
export default function BankTransferInstructions({ instructions }: { instructions: PaymentInstructions }) {
  const hasBankAccounts = instructions.bankAccounts.length > 0;

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">{hasBankAccounts ? "Transfer to" : "Pay with QRIS"}</span>
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

        {instructions.qris && (
          <div className="border-2 border-black/10 p-4">
            {hasBankAccounts && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Or pay with QRIS</span>
            )}
            <div className="relative mx-auto mt-3 aspect-square w-full max-w-[260px] bg-white">
              <Image
                src={toAssetUrl(instructions.qris.qrisImageUrl)}
                alt={`QRIS code for ${instructions.qris.merchantName}`}
                fill
                sizes="260px"
                className="object-contain"
              />
            </div>
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-widest text-black/60">
              {instructions.qris.merchantName}
            </p>
            <p className="mt-2 text-center text-xs text-black/45">
              Scan with any e-wallet or mobile banking app (GoPay, OVO, DANA, BCA mobile, …).
            </p>
          </div>
        )}

        <dl className="space-y-4 text-sm">
          <Row label="Amount" value={formatPrice(instructions.amount)} emphasize />
        </dl>
      </div>
      <p className="mt-5 border-t border-black/10 pt-4 text-xs leading-5 text-black/45">
        Pay the exact amount using {hasBankAccounts && instructions.qris ? "any one of the methods above" : hasBankAccounts ? "any one of the accounts above" : "the QRIS code above"},
        then upload your proof of payment below. The organizer reviews it manually — this is not instant.
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
