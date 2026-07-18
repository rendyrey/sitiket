"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

export type DashboardNavItem = {
  href: string;
  label: string;
};

type DashboardShellProps = {
  children: ReactNode;
  navItems: DashboardNavItem[];
  title: string;
  user: { email: string; name: string };
};

/**
 * Shared shell for the Admin and Super Admin dashboards — a fresh, minimal
 * layout (not the legacy `src/core`/Hydrogen template shell, which is
 * unrelated demo content — see docs' frontend exploration notes). Sidebar
 * on desktop, a top nav strip on phones.
 */
export default function DashboardShell({ children, navItems, title, user }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || (href !== "/dashboard/admin" && href !== "/dashboard/super-admin" && pathname.startsWith(href));

  return (
    <div className="min-h-[calc(100vh-100px)] bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b-4 border-ink bg-ink text-white lg:sticky lg:top-0 lg:h-[calc(100vh-0px)] lg:border-b-0 lg:border-r-4">
        <div className="p-6">
          <span className="text-xs font-bold uppercase tracking-widest text-lime">{title}</span>
          <p className="mt-1 truncate text-sm font-bold">{user.name}</p>
          <p className="truncate text-xs text-white/40">{user.email}</p>
        </div>
        <nav className="flex flex-wrap gap-1 border-t border-white/10 p-3 lg:flex-col lg:gap-0.5" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2.5 text-xs font-black uppercase tracking-wide transition-colors lg:w-full ${
                isActive(item.href) ? "bg-lime text-black" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={() => void handleSignOut()} className="w-full px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-white/50 hover:text-lime">
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</div>
    </div>
  );
}
