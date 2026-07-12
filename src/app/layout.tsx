import type { Metadata } from "next";
import { inter, lexendDeca } from "@/app/fonts";
import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SiTIKET — Be There", template: "%s — SiTIKET" },
  description: "Discover and book the best events in your city.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lexendDeca.variable}`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
