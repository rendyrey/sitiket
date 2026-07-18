"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/ui/form-field";
import { createEventAction, updateEventAction } from "@/features/admin/lib/actions";
import type { BankAccount, CreateEventRequest, Event, MeetingPlatform, TaxonomyItem } from "@/lib/api/types";

/** `datetime-local` inputs need `"YYYY-MM-DDTHH:mm"`; ISO strings round-trip fine through `Date`. */
const toDateTimeLocal = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

type EventFormProps = {
  bankAccounts: BankAccount[];
  categories: TaxonomyItem[];
  event?: Event;
};

export default function EventForm({ bankAccounts, categories, event }: EventFormProps) {
  const router = useRouter();
  const isEdit = Boolean(event);

  const [values, setValues] = useState({
    name: event?.name ?? "",
    description: event?.description ?? "",
    categoryId: event?.category.id ?? categories[0]?.id ?? "",
    startDate: toDateTimeLocal(event?.startDate),
    endDate: toDateTimeLocal(event?.endDate),
    venueName: event?.venueName ?? "",
    address: event?.address ?? "",
    city: event?.city ?? "",
    province: event?.province ?? "",
    country: event?.country ?? "Indonesia",
    meetingUrl: event?.meetingUrl ?? "",
    meetingPlatform: (event?.meetingPlatform ?? "") as MeetingPlatform | "",
    contactPersonName: event?.contactPersonName ?? "",
    contactPersonEmail: event?.contactPersonEmail ?? "",
    contactPersonPhone: event?.contactPersonPhone ?? "",
    bankAccountId: event?.bankAccountId ?? "",
    maxTicketsPerUser: event?.maxTicketsPerUser ?? 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    setError(null);

    if (!values.name.trim() || !values.description.trim() || !values.categoryId) {
      setError("Name, description, and category are required.");
      return;
    }
    if (!values.startDate || !values.endDate) {
      setError("Start and end date/time are required.");
      return;
    }
    if (!values.contactPersonName.trim() || !values.contactPersonEmail.trim() || !values.contactPersonPhone.trim()) {
      setError("Contact person name, email, and phone are required.");
      return;
    }

    const payload: CreateEventRequest = {
      name: values.name.trim(),
      description: values.description.trim(),
      categoryId: values.categoryId,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      venueName: values.venueName.trim() || undefined,
      address: values.address.trim() || undefined,
      city: values.city.trim() || undefined,
      province: values.province.trim() || undefined,
      country: values.country.trim() || undefined,
      meetingUrl: values.meetingUrl.trim() || undefined,
      meetingPlatform: values.meetingPlatform || undefined,
      contactPersonName: values.contactPersonName.trim(),
      contactPersonEmail: values.contactPersonEmail.trim(),
      contactPersonPhone: values.contactPersonPhone.trim(),
      bankAccountId: values.bankAccountId || undefined,
      maxTicketsPerUser: values.maxTicketsPerUser,
    };

    setSubmitting(true);
    const result = isEdit && event ? await updateEventAction(event.id, payload) : await createEventAction(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/dashboard/admin/events/${result.data.slug}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Section title="Basics">
        <FormField wrapperClassName="sm:col-span-2" label="Event name" name="name" value={values.name} onChange={(e) => set("name", e.target.value)} />
        <label className="field-label sm:col-span-2">
          Description
          <textarea className="text-field mt-2 h-32 py-3" value={values.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className="field-label">
          Category
          <select className="text-field mt-2" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <FormField
          label="Max tickets per buyer"
          name="maxTicketsPerUser"
          type="number"
          min={1}
          value={values.maxTicketsPerUser}
          onChange={(e) => set("maxTicketsPerUser", Number(e.target.value))}
        />
      </Section>

      <Section title="Date & time">
        <FormField label="Starts" name="startDate" type="datetime-local" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} />
        <FormField label="Ends" name="endDate" type="datetime-local" value={values.endDate} onChange={(e) => set("endDate", e.target.value)} />
      </Section>

      <Section title="Location">
        <FormField label="Venue name" name="venueName" value={values.venueName} onChange={(e) => set("venueName", e.target.value)} />
        <FormField label="City" name="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
        <FormField wrapperClassName="sm:col-span-2" label="Address" name="address" value={values.address} onChange={(e) => set("address", e.target.value)} />
        <FormField label="Province" name="province" value={values.province} onChange={(e) => set("province", e.target.value)} />
        <FormField label="Country" name="country" value={values.country} onChange={(e) => set("country", e.target.value)} />
        <FormField label="Meeting URL (online events)" name="meetingUrl" value={values.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} />
        <label className="field-label">
          Meeting platform
          <select
            className="text-field mt-2"
            value={values.meetingPlatform}
            onChange={(e) => set("meetingPlatform", e.target.value as MeetingPlatform | "")}
          >
            <option value="">Not online</option>
            <option value="zoom">Zoom</option>
            <option value="google_meet">Google Meet</option>
            <option value="other">Other</option>
          </select>
        </label>
      </Section>

      <Section title="Contact person">
        <FormField label="Name" name="contactPersonName" value={values.contactPersonName} onChange={(e) => set("contactPersonName", e.target.value)} />
        <FormField
          label="Email"
          name="contactPersonEmail"
          type="email"
          value={values.contactPersonEmail}
          onChange={(e) => set("contactPersonEmail", e.target.value)}
        />
        <FormField label="Phone" name="contactPersonPhone" value={values.contactPersonPhone} onChange={(e) => set("contactPersonPhone", e.target.value)} />
      </Section>

      <Section title="Payout">
        <label className="field-label sm:col-span-2">
          Bank account
          <select className="text-field mt-2" value={values.bankAccountId} onChange={(e) => set("bankAccountId", e.target.value)}>
            <option value="">Use my default account</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.bankName} · {account.accountNumber}
              </option>
            ))}
          </select>
          {bankAccounts.length === 0 && (
            <span className="mt-2 block text-xs font-semibold text-red-600">
              You have no bank accounts yet — add one under Bank accounts before buyers can pay you.
            </span>
          )}
        </label>
      </Section>

      {error && <p className="border-2 border-red-500/60 bg-red-500/5 p-4 text-sm font-semibold text-red-700">{error}</p>}

      <button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="button button-dark button-large disabled:opacity-50">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create event"}
      </button>
    </div>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">{title}</span>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </div>
  );
}
