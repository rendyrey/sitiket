import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ScannerView from "@/features/scanner/components/scanner-view";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Gate check-in" };

export default async function ScanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard/scan");

  return (
    <div className="min-h-[calc(100vh-100px)] bg-paper py-10 sm:py-16">
      <div className="site-container">
        <span className="section-index">GATE CHECK-IN</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Scan a ticket.</h1>
        <p className="mt-3 max-w-xl text-black/50">
          Works for any event you own, manage, or have been invited to scan for — {user.name}.
        </p>
        <div className="mt-8 sm:mt-10">
          <ScannerView />
        </div>
      </div>
    </div>
  );
}
