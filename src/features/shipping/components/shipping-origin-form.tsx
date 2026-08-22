"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SellerShippingOrigin, ShippingCourier } from "@/lib/api/types";
import { saveShippingOriginAction } from "../lib/actions";
import AddressPicker, { type AddressPickerSelection } from "./address-picker";

type ShippingOriginFormProps = {
  origin: SellerShippingOrigin | null;
  /** The known courier catalog (server-fetched) — the enable/disable checkboxes. */
  couriers: ShippingCourier[];
};

/**
 * The seller's shipping departure address + courier whitelist — mandatory
 * before selling merch: every checkout shipping quote for this seller's
 * products is priced from here, and buyers only see the couriers the seller
 * left enabled. One row per seller, replaced in place on save.
 */
export default function ShippingOriginForm({ origin, couriers }: ShippingOriginFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(origin?.address ?? "");
  const [selection, setSelection] = useState<AddressPickerSelection | null>(
    origin ? { villageCode: origin.villageCode, postalCodes: origin.postalCode ? [origin.postalCode] : [], isCourierSupport: true } : null,
  );
  const [postalCode, setPostalCode] = useState(origin?.postalCode ?? "");
  /** Checked courier codes — a saved null whitelist means "all couriers enabled". */
  const [enabledCouriers, setEnabledCouriers] = useState<Set<string>>(
    () => new Set(origin?.enabledCouriers ?? couriers.map((courier) => courier.code)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggleCourier = (code: string) => {
    setSaved(false);
    setEnabledCouriers((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!selection) {
      setError("Pick your departure region down to the village.");
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setError("Enter the street address of your departure point.");
      return;
    }
    if (enabledCouriers.size === 0) {
      setError("Enable at least one courier — buyers can't check out without a shipping option.");
      return;
    }
    setSubmitting(true);
    const allEnabled = couriers.every((courier) => enabledCouriers.has(courier.code));
    const result = await saveShippingOriginAction({
      villageCode: selection.villageCode,
      address: address.trim(),
      ...(postalCode ? { postalCode } : {}),
      // All boxes checked = no restriction — store null so couriers the
      // vendor adds later are offered automatically.
      enabledCouriers: allEnabled ? null : Array.from(enabledCouriers),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="border-2 border-ink bg-white p-5 @container sm:p-7">
      <span className="tag">Shipping departure address</span>
      <p className="mt-3 text-xs text-black/45">
        Where your merch ships from. Buyers&apos; shipping costs are calculated from this address, so it must be set
        before you can sell merch.
      </p>
      {origin && (
        <p className="mt-4 border-2 border-black/10 bg-paper p-3 text-xs text-black/60">
          Current: {[origin.address, origin.village, origin.district, origin.city, origin.province, origin.postalCode].filter(Boolean).join(", ")}
        </p>
      )}
      <div className="mt-5 space-y-4">
        <AddressPicker
          initial={origin ?? undefined}
          onChange={(next) => {
            setSelection(next);
            // Default to the village's own (usually single) postal code.
            setPostalCode(next?.postalCodes[0] ?? "");
          }}
        />
        {selection && !selection.isCourierSupport && (
          <p className="border-2 border-red-500/60 bg-red-500/5 p-3 text-xs font-semibold text-red-700">
            No courier serves this village yet — shipping quotes from it will fail. Pick a nearby supported village.
          </p>
        )}
        <div className="grid gap-4 @md:grid-cols-2">
          <label className="field-label @md:col-span-2">
            Street address
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Street, number, building, RT/RW…"
              className="text-field h-auto py-3"
            />
          </label>
          <label className="field-label">
            Postal code
            {selection && selection.postalCodes.length > 1 ? (
              <select value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className="text-field">
                {selection.postalCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            ) : (
              <input value={postalCode} readOnly placeholder="Auto-filled from the village" className="text-field bg-paper" />
            )}
          </label>
        </div>

        {/* Courier whitelist — buyers only see (and can only pick) what's checked here. */}
        <fieldset>
          <legend className="field-label">Couriers you offer</legend>
          <p className="mt-1 text-xs text-black/45">
            Buyers only see the couriers you enable. Untick the ones you don&apos;t want to hand packages to.
          </p>
          <div className="mt-3 grid gap-2 @sm:grid-cols-2 @xl:grid-cols-3">
            {couriers.map((courier) => (
              <label
                key={courier.code}
                className={`flex cursor-pointer items-center gap-2 border-2 p-2.5 text-sm font-semibold ${
                  enabledCouriers.has(courier.code) ? "border-ink bg-lime/20" : "border-black/15 text-black/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabledCouriers.has(courier.code)}
                  onChange={() => toggleCourier(courier.code)}
                />
                {courier.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm font-bold text-[#5c8500]">Saved ✓</p>}
      <button type="button" onClick={() => void handleSave()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
        {submitting ? "Saving…" : "Save shipping settings"}
      </button>
    </div>
  );
}
