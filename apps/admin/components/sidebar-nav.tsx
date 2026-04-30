"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export type SidebarItem = { href: string; label: string; icon: string };

/**
 * Client-side sidebar navigation. Receives the (already filtered) items list
 * from the server `Sidebar` wrapper so flag-gated entries can be hidden
 * without round-tripping through the client.
 */
export function SidebarNav({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-2">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[var(--color-bg-elev-2)] text-[var(--color-fg)]"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]",
            )}
          >
            <span className="w-4 text-center text-[var(--color-accent)]">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
