"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import cn from "@/utils/class-names";
import FormField from "@/components/ui/form-field";
import { createEventAction, updateEventAction } from "@/features/admin/lib/actions";
import type { BankAccount, CreateEventRequest, Event, MeetingPlatform, TaxonomyItem, ValidationIssue } from "@/lib/api/types";

/** `datetime-local` inputs need `"YYYY-MM-DDTHH:mm"`; ISO strings round-trip fine through `Date`. */
const toDateTimeLocal = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

/** Field order used to pick which errored field to scroll/focus first. */
const FIELD_ORDER = [
  "name",
  "description",
  "categoryId",
  "startDate",
  "endDate",
  "meetingUrl",
  "contactPersonName",
  "contactPersonEmail",
  "contactPersonPhone",
] as const;

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/** Maps the backend's raw Zod issues (`ActionResult.details`) to `{ fieldName: message }`. */
const fieldErrorsFromDetails = (details: unknown): Record<string, string> => {
  if (!Array.isArray(details)) return {};
  const errors: Record<string, string> = {};
  for (const issue of details as ValidationIssue[]) {
    const key = issue?.path?.[0];
    if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
  }
  return errors;
};

const focusField = (key: string) => {
  const el = document.getElementById(key);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el instanceof HTMLElement) el.focus({ preventScroll: true });
};

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!values.name.trim()) errors.name = "Event name is required.";
    if (!values.description.trim()) errors.description = "Description is required.";
    if (!values.categoryId) errors.categoryId = "Category is required.";
    if (!values.startDate) errors.startDate = "Start date/time is required.";
    if (!values.endDate) errors.endDate = "End date/time is required.";
    if (values.startDate && values.endDate && new Date(values.endDate) < new Date(values.startDate)) {
      errors.endDate = "End must be on or after the start.";
    }
    if (values.meetingUrl.trim() && !isValidUrl(values.meetingUrl.trim())) {
      errors.meetingUrl = "Enter a valid URL, e.g. https://zoom.us/j/...";
    }
    if (!values.contactPersonName.trim()) errors.contactPersonName = "Contact name is required.";
    if (!values.contactPersonEmail.trim()) errors.contactPersonEmail = "Contact email is required.";
    if (!values.contactPersonPhone.trim()) errors.contactPersonPhone = "Contact phone is required.";
    return errors;
  };

  const handleSubmit = async () => {
    setError(null);

    const validationErrors = validate();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Fix the highlighted fields before saving.");
      focusField(FIELD_ORDER.find((key) => validationErrors[key])!);
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
      const backendErrors = fieldErrorsFromDetails(result.details);
      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors(backendErrors);
        toast.error("Fix the highlighted fields before saving.");
        const firstKey = FIELD_ORDER.find((key) => backendErrors[key]);
        if (firstKey) focusField(firstKey);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
      return;
    }

    setFieldErrors({});
    toast.success(isEdit ? "Event details updated." : "Event created.");
    router.push(`/dashboard/admin/events/${result.data.slug}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Section title="Basics">
        <FormField
          required
          wrapperClassName="sm:col-span-2"
          label="Event name *"
          name="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          error={fieldErrors.name}
        />
        <label className="field-label sm:col-span-2">
          Description *
          <textarea
            required
            id="description"
            className={cn("text-field mt-2 h-32 py-3", fieldErrors.description && "!border-red-500")}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
          {fieldErrors.description && (
            <span className="mt-1.5 block text-xs font-semibold normal-case tracking-normal text-red-600">
              {fieldErrors.description}
            </span>
          )}
        </label>
        <label className="field-label">
          Category *
          <select
            required
            id="categoryId"
            className={cn("text-field mt-2", fieldErrors.categoryId && "!border-red-500")}
            value={values.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <span className="mt-1.5 block text-xs font-semibold normal-case tracking-normal text-red-600">
              {fieldErrors.categoryId}
            </span>
          )}
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
        <FormField
          required
          label="Starts *"
          name="startDate"
          type="datetime-local"
          value={values.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          error={fieldErrors.startDate}
        />
        <FormField
          required
          label="Ends *"
          name="endDate"
          type="datetime-local"
          value={values.endDate}
          onChange={(e) => set("endDate", e.target.value)}
          error={fieldErrors.endDate}
        />
      </Section>

      <Section title="Location">
        <FormField label="Venue name" name="venueName" value={values.venueName} onChange={(e) => set("venueName", e.target.value)} />
        <FormField label="City" name="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
        <FormField wrapperClassName="sm:col-span-2" label="Address" name="address" value={values.address} onChange={(e) => set("address", e.target.value)} />
        <FormField label="Province" name="province" value={values.province} onChange={(e) => set("province", e.target.value)} />
        <FormField label="Country" name="country" value={values.country} onChange={(e) => set("country", e.target.value)} />
        <FormField
          label="Meeting URL (online events)"
          name="meetingUrl"
          value={values.meetingUrl}
          onChange={(e) => set("meetingUrl", e.target.value)}
          error={fieldErrors.meetingUrl}
        />
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
        <FormField
          required
          label="Name *"
          name="contactPersonName"
          value={values.contactPersonName}
          onChange={(e) => set("contactPersonName", e.target.value)}
          error={fieldErrors.contactPersonName}
        />
        <FormField
          required
          label="Email *"
          name="contactPersonEmail"
          type="email"
          value={values.contactPersonEmail}
          onChange={(e) => set("contactPersonEmail", e.target.value)}
          error={fieldErrors.contactPersonEmail}
        />
        <FormField
          required
          label="Phone *"
          name="contactPersonPhone"
          value={values.contactPersonPhone}
          onChange={(e) => set("contactPersonPhone", e.target.value)}
          error={fieldErrors.contactPersonPhone}
        />
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
