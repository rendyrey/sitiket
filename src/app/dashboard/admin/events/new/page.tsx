import type { Metadata } from "next";
import EventForm from "@/features/admin/components/event-form";
import { listBankAccounts } from "@/features/admin/lib/api";
import { listEventCategories } from "@/features/events/lib/api";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage() {
  const [categories, bankAccounts] = await Promise.all([listEventCategories(), listBankAccounts()]);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Create event</h1>
      <div className="mt-8 max-w-3xl">
        <EventForm categories={categories} bankAccounts={bankAccounts} />
      </div>
    </div>
  );
}
