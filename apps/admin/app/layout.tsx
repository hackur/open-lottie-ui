import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { HostStatus } from "@/components/host-status";
import { ensureFirstRun } from "@/lib/first-run";

export const metadata: Metadata = {
  title: "open-lottie-ui",
  description: "Local-first Lottie admin",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureFirstRun();
  return (
    <html lang="en">
      <body>
        <div className="grid min-h-screen grid-cols-[14rem_1fr]">
          <Sidebar />
          <main className="flex flex-col">
            <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
              <div className="text-sm text-[var(--color-fg-muted)]">
                <span className="text-[var(--color-fg)]">open-lottie-ui</span>
                <span className="mx-2">·</span>
                <span>localhost:3000</span>
              </div>
              <HostStatus />
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
