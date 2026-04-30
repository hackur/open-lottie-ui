import Link from "next/link";
import { data } from "@open-lottie/lottie-tools";
import { listSeedIds } from "@/lib/first-run";
import { WelcomeAck } from "@/components/welcome-ack";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WelcomePage() {
  const [seeds, library] = await Promise.all([listSeedIds(), data.listLibrary()]);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="text-3xl">✨</span>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to open-lottie-ui</h1>
      </div>

      <p className="mb-6 text-[var(--color-fg-muted)]">
        Local-first Lottie admin. Browse, generate, remix, and export Lottie animations — Claude CLI is the LLM driver, you approve every change.
      </p>

      <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
        <div className="mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
          First run — copied {seeds.length} seed animation{seeds.length === 1 ? "" : "s"} into <code className="font-mono text-xs">library/</code>
        </div>
        <ul className="space-y-1 text-sm">
          {seeds.map((id) => (
            <li key={id} className="flex items-center gap-2">
              <span className="text-[var(--color-success)]">✓</span>
              <code className="font-mono">{id}</code>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-xs text-[var(--color-fg-faint)]">
          {library.length} entries currently in your library.
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-start gap-3 rounded-md border border-[var(--color-border)] p-4">
          <span className="text-2xl">▦</span>
          <div>
            <div className="font-medium">Browse the library</div>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Three CC0 seeds are loaded. Click any card to preview, swap renderers, or export as <code className="font-mono text-xs">.lottie</code> / <code className="font-mono text-xs">.json</code>.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-[var(--color-border)] p-4">
          <span className="text-2xl">✨</span>
          <div>
            <div className="font-medium">Generate with templates or Claude</div>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Pick Tier 1 for deterministic template renders (5 templates shipped). Tier 3 sends your prompt to Claude CLI — output is reviewed before it lands in the library.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-[var(--color-border)] p-4">
          <span className="text-2xl">✓</span>
          <div>
            <div className="font-medium">Approve every change</div>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Generations land in the review queue. Use <kbd>a</kbd> to approve and <kbd>r</kbd> to reject. Decisions are logged in <code className="font-mono text-xs">decisions.jsonl</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <WelcomeAck />
        <Link
          href="/library"
          className="rounded-md bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
        >
          Take me to the library →
        </Link>
      </div>
    </div>
  );
}
