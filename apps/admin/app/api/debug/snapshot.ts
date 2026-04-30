import "server-only";
import type { ErrorRecord } from "@/lib/error-log";

/**
 * The debug snapshot is built behind a small dependency-injected facade so
 * the /__debug server component can call this directly (no HTTP roundtrip)
 * and the route-handler can reuse it. The injected types match the real
 * exports — we just avoid a static import cycle.
 */

export type DebugSnapshot = {
  now: string;
  tools: Record<string, { found: boolean; version?: string; path?: string }>;
  settings: Record<string, unknown>;
  flags: Record<string, boolean>;
  library_count: number;
  generations: {
    running: number;
    pending_review: number;
    approved: number;
    rejected: number;
    failed_validation: number;
    failed_render: number;
    cancelled: number;
    total: number;
  };
  process_registry_size: number;
  process_registry: Array<{
    id: string;
    status: string;
    started_at: string;
    age_ms: number;
    buffered_events: number;
  }>;
  recent_decisions: Array<Record<string, unknown>>;
  recent_errors: ErrorRecord[];
  env: {
    node_env: string;
    node_version: string;
    pid: number;
    uptime_s: number;
    memory_mb: number;
  };
};

const IS_PROD = process.env.NODE_ENV === "production";

type Deps = {
  data: typeof import("@open-lottie/lottie-tools").data;
  processRegistry: Map<string, { id: string; status: string; startedAt: number; buffer: unknown[] }>;
  detectTools: () => Promise<Array<{ name: string; found: boolean; version?: string; resolvedPath?: string }>>;
  loadSettings: () => Promise<Record<string, unknown>>;
  getFlags: () => Promise<Record<string, boolean>>;
  tailErrors: (n: number) => ErrorRecord[];
};

export async function buildDebugSnapshot(deps: Deps): Promise<DebugSnapshot> {
  const [tools, settings, flags, libraryEntries, gens] = await Promise.all([
    deps.detectTools().catch(() => []),
    deps.loadSettings().catch(() => ({})),
    deps.getFlags().catch(() => ({})),
    deps.data.listLibrary().catch(() => []),
    deps.data.listGenerations().catch(() => []),
  ]);

  const counts = {
    running: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    failed_validation: 0,
    failed_render: 0,
    cancelled: 0,
    total: gens.length,
  };
  for (const g of gens) {
    switch (g.meta.status) {
      case "running":
        counts.running++;
        break;
      case "pending-review":
        counts.pending_review++;
        break;
      case "approved":
        counts.approved++;
        break;
      case "rejected":
        counts.rejected++;
        break;
      case "failed-validation":
        counts.failed_validation++;
        break;
      case "failed-render":
        counts.failed_render++;
        break;
      case "cancelled":
        counts.cancelled++;
        break;
    }
  }

  const recentDecisions = await deps.data
    .tailDecisions(10)
    .then((entries) => [...entries].reverse())
    .catch(() => []);

  const recentErrors = deps.tailErrors(20).slice().reverse();
  // In production, drop stack traces — the rest of the snapshot is fine.
  const sanitizedErrors = IS_PROD
    ? recentErrors.map((e) => ({ ...e, stack: "" }))
    : recentErrors;

  const now = Date.now();
  const registryDump = Array.from(deps.processRegistry.values()).map((p) => ({
    id: p.id,
    status: p.status,
    started_at: new Date(p.startedAt).toISOString(),
    age_ms: now - p.startedAt,
    buffered_events: Array.isArray(p.buffer) ? p.buffer.length : 0,
  }));

  const memoryMb = Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;

  return {
    now: new Date().toISOString(),
    tools: Object.fromEntries(
      tools.map((t) => [t.name, { found: t.found, version: t.version, path: t.resolvedPath }]),
    ),
    settings: settings as Record<string, unknown>,
    flags,
    library_count: libraryEntries.length,
    generations: counts,
    process_registry_size: deps.processRegistry.size,
    process_registry: registryDump,
    recent_decisions: recentDecisions as Array<Record<string, unknown>>,
    recent_errors: sanitizedErrors,
    env: {
      node_env: process.env.NODE_ENV ?? "development",
      node_version: process.version,
      pid: process.pid,
      uptime_s: Math.round(process.uptime()),
      memory_mb: memoryMb,
    },
  };
}
