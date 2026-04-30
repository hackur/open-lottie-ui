"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const items = [
  { href: "/library", label: "Library", icon: "▦" },
  { href: "/generate", label: "Generate", icon: "✨" },
  { href: "/review", label: "Review", icon: "✓" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <div className="px-5 py-5">
        <Link href="/library" className="block">
          <div className="text-lg font-semibold tracking-tight">open-lottie</div>
          <div className="text-xs text-[var(--color-fg-faint)]">local admin</div>
        </Link>
      </div>
      <nav className="flex-1 px-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
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
      <div className="border-t border-[var(--color-border)] p-4 text-xs text-[var(--color-fg-faint)]">
        <div>M1 build · MIT</div>
        <div className="mt-1">claude-cli driven</div>
      </div>
    </aside>
  );
}
