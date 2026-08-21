export const mainNavigation = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/merch", label: "Merch" },
] as const;

export const footerNavigation = [
  { href: "/events", label: "All events" },
  { href: "/merch", label: "Merch" },
  { href: "/events?category=community", label: "Community" },
  { href: "/login", label: "My tickets" },
] as const;
