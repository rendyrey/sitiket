import type { Metadata } from "next";
import Link from "next/link";
import EventForm from "@/features/admin/components/event-form";
import { getMyEmailConfig, getMyQrisConfig, listBankAccounts } from "@/features/admin/lib/api";
import { listEventCategories } from "@/features/events/lib/api";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage() {
  const [categories, bankAccounts, qrisConfig, emailConfig] = await Promise.all([
    listEventCategories(),
    listBankAccounts(),
    getMyQrisConfig(),
    getMyEmailConfig(),
  ]);

  // Hard prerequisite, enforced backend-side too (409 EMAIL_CONFIG_REQUIRED):
  // every buyer email for this owner's events is sent from their own address.
  if (!emailConfig) {
    return (
      <div>
        <h1 className="text-3xl font-black uppercase">Create event</h1>
        <div className="mt-8 max-w-3xl border-2 border-ink bg-white p-5 sm:p-7">
          <span className="tag">Email setup required</span>
          <p className="mt-4 text-sm leading-6 text-black/60">
            Before creating your first event, set up the email address your buyers will hear from. Verification codes,
            tickets, and refund updates for your events are all sent from it.
          </p>
          <Link href="/dashboard/admin/email-settings" className="button button-dark button-large mt-6 inline-flex">
            Set up email settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Create event</h1>
      <div className="mt-8 max-w-3xl">
        <EventForm categories={categories} bankAccounts={bankAccounts} qrisConfig={qrisConfig} />
      </div>
    </div>
  );
}
