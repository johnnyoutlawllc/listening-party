import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SjSeedBootstrap } from "@/components/SjSeedBootstrap";
import "./globals.css";

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Listening Party",
  description:
    "Import public YouTube into playlists, share them, discover better takes, and listen together when you want.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        <SjSeedBootstrap />
        <SiteHeader />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
