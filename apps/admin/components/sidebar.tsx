import Link from "next/link";
import { getFlags } from "@/lib/feature-flags";
import { SidebarNav, type SidebarItem } from "@/components/sidebar-nav";

const BASE_ITEMS: ReadonlyArray<SidebarItem> = [
  { href: "/library", label: "Library", icon: "▦" },
  { href: "/generate", label: "Generate", icon: "✨" },
  { href: "/import", label: "Import", icon: "↥" },
  { href: "/review", label: "Review", icon: "✓" },
  { href: "/activity", label: "Activity", icon: "≡" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

/**
 * Server-rendered sidebar. Reads feature flags so the Import nav entry can
 * be hidden when no import-related sources are enabled. Delegates the
 * client-only `usePathname` / active-state logic to {@link SidebarNav}.
 */
export async function Sidebar() {
  const flags = await getFlags();
  const anyImportEnabled =
    flags.enable_python_lottie || flags.enable_url_scrape || flags.enable_ffmpeg;
  const items: SidebarItem[] = anyImportEnabled
    ? [...BASE_ITEMS]
    : BASE_ITEMS.filter((i) => i.href !== "/import");

  return (
    <aside className="flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <div className="px-5 py-5">
        <Link href="/library" className="block">
          <div className="text-lg font-semibold tracking-tight">open-lottie</div>
          <div className="text-xs text-[var(--color-fg-faint)]">local admin</div>
        </Link>
      </div>
      <SidebarNav items={items} />
      <div className="border-t border-[var(--color-border)] p-4 text-xs text-[var(--color-fg-faint)]">
        <Link
          href="/__debug"
          className="mb-2 flex items-center gap-2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          <span>🐛</span>
          <span>debug</span>
        </Link>
        <div>M1 build · MIT</div>
        <div className="mt-1">claude-cli driven</div>
      </div>
    </aside>
  );
}
