import Link from "next/link";

const TABS = [
  { segment: "", label: "Details" },
  { segment: "/images", label: "Images" },
  { segment: "/ticket-types", label: "Ticket types" },
  { segment: "/promo-codes", label: "Promo codes" },
  { segment: "/staff", label: "Gate staff" },
  { segment: "/orders", label: "Orders" },
];

export default function EventTabs({ activeSegment = "", slug }: { activeSegment?: string; slug: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b-2 border-ink pb-4" aria-label="Event sections">
      {TABS.map((tab) => (
        <Link
          key={tab.segment}
          href={`/dashboard/admin/events/${slug}${tab.segment}`}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wide ${
            tab.segment === activeSegment ? "bg-ink text-lime" : "border-2 border-ink hover:bg-ink hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
