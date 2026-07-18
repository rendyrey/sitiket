import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { inter, lexendDeca } from "@/app/fonts";
import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import SessionProvider from "@/features/auth/components/session-provider";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SiTIKET — Be There", template: "%s — SiTIKET" },
  description: "Discover and book the best events in your city.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${lexendDeca.variable}`}>
        <SessionProvider user={user}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <Toaster position="top-center" toastOptions={{ style: { borderRadius: 0, fontWeight: 700 } }} />
        </SessionProvider>
      </body>
    </html>
  );
}
