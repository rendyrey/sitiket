"use client";

import { useState } from "react";
import FormField from "@/components/ui/form-field";
import { applyAdminAction } from "../lib/actions";

export default function ApplyAdminForm() {
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!businessName.trim() || !contactPhone.trim()) {
      setError("Business name and contact phone are required.");
      return;
    }

    setSubmitting(true);
    const result = await applyAdminAction({
      businessName: businessName.trim(),
      businessDescription: businessDescription.trim() || undefined,
      contactPhone: contactPhone.trim(),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="border-2 border-ink bg-white p-6">
        <span className="tag">Application submitted</span>
        <p className="mt-4 text-sm text-black/60">
          Thanks — a Super Admin will review your application. You&apos;ll be able to create events once it&apos;s
          approved.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-ink bg-white p-6">
      <span className="tag">Become an organizer</span>
      <h3 className="mt-4 text-xl font-black uppercase">Sell tickets on SiTIKET.</h3>
      <p className="mt-2 text-sm text-black/50">
        Apply for an Admin account to create and manage your own events. Requires Super Admin approval.
      </p>
      <div className="mt-6 space-y-4">
        <FormField
          label="Business / organizer name"
          name="businessName"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Your company or brand name"
        />
        <FormField
          label="Contact phone"
          name="contactPhone"
          type="tel"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
          placeholder="+62 812 3456 7890"
        />
        <label className="field-label">
          What do you plan to run? (optional)
          <textarea
            className="text-field mt-2 h-24 py-3"
            value={businessDescription}
            onChange={(event) => setBusinessDescription(event.target.value)}
            placeholder="Tell us briefly about the events you want to organize"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="button button-dark button-large mt-5 w-full disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Apply"}
      </button>
    </div>
  );
}
