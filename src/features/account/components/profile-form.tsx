"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/ui/form-field";
import SearchableSelect from "@/components/ui/searchable-select";
import { updateProfileAction } from "@/features/account/lib/actions";
import AddressPicker, { type AddressPickerSelection } from "@/features/shipping/components/address-picker";
import type { User } from "@/lib/api/types";

/**
 * Contact + delivery address. Merch checkout requires the phone number and a
 * full region-picked address (down to the village — shipping costs are quoted
 * per village), so this panel is the fix-it destination the checkout links to
 * when the profile is incomplete.
 */
export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  /** The picked village, prefilled from the saved profile codes. */
  const [selection, setSelection] = useState<AddressPickerSelection | null>(
    user.villageCode
      ? { villageCode: user.villageCode, postalCodes: user.postalCode ? [user.postalCode] : [], isCourierSupport: true }
      : null,
  );
  const [postalCode, setPostalCode] = useState(user.postalCode ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!phone.trim() || !address.trim()) {
      setError("Phone number and street address are required.");
      return;
    }
    if (!selection) {
      setError("Pick your region down to the village — shipping costs are calculated from it.");
      return;
    }
    setSubmitting(true);
    const result = await updateProfileAction({
      phone: phone.trim(),
      address: address.trim(),
      villageCode: selection.villageCode,
      ...(postalCode ? { postalCode } : {}),
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
    // @container: the panel sizes its own columns — it renders in the narrow
    // account sidebar, where viewport (sm:) breakpoints would wrongly apply.
    <div id="profile" className="border-2 border-ink bg-white p-5 @container sm:p-7">
      <span className="tag">Contact &amp; delivery address</span>
      <p className="mt-3 text-xs text-black/45">
        Needed for merch checkout — sellers ship your orders here, and shipping costs are quoted from your village.
      </p>
      {user.villageCode && (
        <p className="mt-4 border-2 border-black/10 bg-paper p-3 text-xs text-black/60">
          Saved: {[user.address, user.village, user.district, user.city, user.province, user.postalCode].filter(Boolean).join(", ")}
        </p>
      )}
      <div className="mt-5 space-y-4">
        <div className="grid gap-4 @md:grid-cols-2">
          <FormField
            label="Phone number"
            name="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="08123456789"
          />
          <label className="field-label">
            Postal code
            {selection && selection.postalCodes.length > 1 ? (
              <SearchableSelect
                value={postalCode}
                onChange={setPostalCode}
                options={selection.postalCodes.map((code) => ({ value: code, label: code }))}
              />
            ) : (
              <input value={postalCode} readOnly placeholder="Auto-filled from the village" className="text-field bg-paper" />
            )}
          </label>
          <label className="field-label @md:col-span-2">
            Street address
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              placeholder="Street, number, building, RT/RW…"
              className="text-field h-auto py-3"
            />
          </label>
        </div>
        <AddressPicker
          initial={user}
          onChange={(next) => {
            setSelection(next);
            // Default to the village's own (usually single) postal code.
            setPostalCode(next?.postalCodes[0] ?? "");
          }}
        />
        {selection && !selection.isCourierSupport && (
          <p className="border-2 border-red-500/60 bg-red-500/5 p-3 text-xs font-semibold text-red-700">
            No courier serves this village yet — merch shipping quotes to it will fail. Pick a nearby supported
            village if you plan to buy merch.
          </p>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm font-bold text-[#5c8500]">Saved ✓</p>}
      <button type="button" onClick={() => void handleSave()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
        {submitting ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
