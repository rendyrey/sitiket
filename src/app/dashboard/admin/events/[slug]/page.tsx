import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventForm from "@/features/admin/components/event-form";
import EventStatusControls from "@/features/admin/components/event-status-controls";
import EventTabs from "@/features/admin/components/event-tabs";
import { listBankAccounts } from "@/features/admin/lib/api";
import { getEventBySlug, listEventCategories } from "@/features/events/lib/api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return { title: event?.name ?? "Event" };
}

export default async function AdminEventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [categories, bankAccounts] = await Promise.all([listEventCategories(), listBankAccounts()]);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} />
      </div>
      <div className="mt-8 max-w-3xl space-y-6">
        <EventStatusControls event={event} />
        <EventForm event={event} categories={categories} bankAccounts={bankAccounts} />
      </div>
    </div>
  );
}
