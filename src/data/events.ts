export type EventItem = {
  slug: string;
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  tag: string;
  theme: "lime" | "orange" | "blue" | "pink" | "silver";
  image?: string;
  description: string;
};

export const events: EventItem[] = [
  {
    slug: "bigreds-friendly-match",
    title: "Bigreds Friendly Match",
    category: "Community",
    date: "20 Jun 2026",
    time: "16:00 WIB",
    venue: "LFC Stadium Senayan",
    city: "Jakarta",
    price: 75000,
    tag: "Nearly sold out",
    theme: "lime",
    image: "/friendly-match.png",
    description:
      "An afternoon of football, friendship, and community. Watch two supporter teams face off and stay for the post-match gathering.",
  },
  {
    slug: "jakarta-noise-fest",
    title: "Jakarta Noise Fest",
    category: "Music",
    date: "28 Jun 2026",
    time: "18:30 WIB",
    venue: "Hall A, JIExpo",
    city: "Jakarta",
    price: 185000,
    tag: "Selling fast",
    theme: "orange",
    description:
      "A high-voltage night bringing together the city’s loudest emerging bands, visual artists, and independent collectives.",
  },
  {
    slug: "midnight-market",
    title: "Midnight Market Vol. 4",
    category: "Lifestyle",
    date: "05 Jul 2026",
    time: "17:00 WIB",
    venue: "Pos Bloc",
    city: "Jakarta",
    price: 45000,
    tag: "New",
    theme: "blue",
    description:
      "Discover local labels, food experiments, records, and after-dark performances in one buzzing city market.",
  },
  {
    slug: "laugh-lab-live",
    title: "Laugh Lab: Live",
    category: "Comedy",
    date: "12 Jul 2026",
    time: "20:00 WIB",
    venue: "Salihara Theater",
    city: "Jakarta",
    price: 125000,
    tag: "Limited seats",
    theme: "pink",
    description:
      "Six sharp comics test brand-new material in an intimate room. No recordings, no reruns, just one night of fresh jokes.",
  },
  {
    slug: "future-form",
    title: "Future/Form 2026",
    category: "Conference",
    date: "25 Jul 2026",
    time: "09:00 WIB",
    venue: "The Kasablanka",
    city: "Jakarta",
    price: 295000,
    tag: "Early bird",
    theme: "silver",
    description:
      "A one-day gathering for people building better digital products, brands, and creative businesses across Southeast Asia.",
  },
  {
    slug: "after-hours-session",
    title: "After Hours Session",
    category: "Music",
    date: "02 Aug 2026",
    time: "21:00 WIB",
    venue: "M Bloc Live House",
    city: "Jakarta",
    price: 95000,
    tag: "Just announced",
    theme: "lime",
    description:
      "An intimate late-night session featuring three genre-bending acts, immersive lighting, and a dance floor built for discovery.",
  },
];

export const formatPrice = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);

export const getEvent = (slug: string) =>
  events.find((event) => event.slug === slug);
