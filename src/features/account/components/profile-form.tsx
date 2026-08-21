"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/ui/form-field";
import { updateProfileAction } from "@/features/account/lib/actions";
import type { User } from "@/lib/api/types";

/**
 * Contact + delivery address. Merch checkout requires the phone number and
 * address, so this panel is the fix-it destination the checkout links to
 * when the profile is incomplete.
 */
export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [province, setProvince] = useState(user.province ?? "");
  const [postalCode, setPostalCode] = useState(user.postalCode ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!phone.trim() || !address.trim()) {
      setError("Phone number and address are required.");
      return;
    }
    setSubmitting(true);
    const result = await updateProfileAction({
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim() || undefined,
      province: province.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
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
    <div id="profile" className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Contact &amp; delivery address</span>
      <p className="mt-3 text-xs text-black/45">Needed for merch checkout — sellers ship your orders here.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FormField
          label="Phone number"
          name="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="08123456789"
        />
        <FormField
          label="Postal code"
          name="postalCode"
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value)}
          placeholder="40111"
        />
        <label className="field-label sm:col-span-2">
          Street address
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={2}
            placeholder="Street, number, building, RT/RW…"
            className="text-field h-auto py-3"
          />
        </label>
        <FormField label="City" name="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Bandung" />
        <FormField
          label="Province"
          name="province"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          placeholder="Jawa Barat"
        />
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm font-bold text-[#5c8500]">Saved ✓</p>}
      <button type="button" onClick={() => void handleSave()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
        {submitting ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
