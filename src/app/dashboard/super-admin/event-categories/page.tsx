import type { Metadata } from "next";
import TaxonomyManager from "@/features/super-admin/components/taxonomy-manager";
import { listEventCategoriesAll } from "@/features/super-admin/lib/api";

export const metadata: Metadata = { title: "Event categories" };

export default async function SuperAdminEventCategoriesPage() {
  const categories = await listEventCategoriesAll();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Event categories</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">Shown as filters on the public catalog and picked when an organizer creates an event.</p>
      <div className="mt-8 max-w-2xl">
        <TaxonomyManager resource="event-categories" items={categories} />
      </div>
    </div>
  );
}
