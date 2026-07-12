import Link from "next/link";

export const eventCategories = [
  "All",
  "Music",
  "Community",
  "Lifestyle",
  "Comedy",
  "Conference",
] as const;

export default function EventFilters({ activeCategory }: { activeCategory?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-3" aria-label="Filter events by category">
      {eventCategories.map((category) => {
        const isAll = category === "All";
        const isActive = isAll
          ? !activeCategory
          : activeCategory?.toLowerCase() === category.toLowerCase();

        return (
          <Link
            key={category}
            href={isAll ? "/events" : `/events?category=${category.toLowerCase()}`}
            className={`filter-chip ${isActive ? "filter-chip-active" : ""}`}
          >
            {category}
          </Link>
        );
      })}
    </div>
  );
}
