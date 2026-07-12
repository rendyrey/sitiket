export const mainNavigation = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/events?category=music", label: "Music" },
] as const;

export const footerNavigation = [
  { href: "/events", label: "All events" },
  { href: "/events?category=music", label: "Music" },
  { href: "/events?category=community", label: "Community" },
  { href: "/login", label: "My tickets" },
] as const;
