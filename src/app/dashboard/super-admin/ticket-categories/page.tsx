import type { Metadata } from "next";
import TaxonomyManager from "@/features/super-admin/components/taxonomy-manager";
import { listTicketCategoriesAll } from "@/features/super-admin/lib/api";

export const metadata: Metadata = { title: "Ticket categories" };

export default async function SuperAdminTicketCategoriesPage() {
  const categories = await listTicketCategoriesAll();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Ticket categories</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">Picked when an organizer creates a ticket type (e.g. Early Bird, Regular).</p>
      <div className="mt-8 max-w-2xl">
        <TaxonomyManager resource="ticket-categories" items={categories} />
      </div>
    </div>
  );
}
