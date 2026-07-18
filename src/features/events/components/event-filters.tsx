import Link from "next/link";
import type { TaxonomyItem } from "@/lib/api/types";

type EventFiltersProps = {
  activeCategory?: string;
  categories: TaxonomyItem[];
};

export default function EventFilters({ activeCategory, categories }: EventFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-3" aria-label="Filter events by category">
      <Link href="/events" className={`filter-chip ${!activeCategory ? "filter-chip-active" : ""}`}>
        All
      </Link>
      {categories.map((category) => {
        const isActive = activeCategory?.toLowerCase() === category.slug.toLowerCase();
        return (
          <Link
            key={category.id}
            href={`/events?category=${category.slug}`}
            className={`filter-chip ${isActive ? "filter-chip-active" : ""}`}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
