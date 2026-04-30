/**
 * Read-only registry of `plugins/<id>/plugin.json` manifest stubs (M1).
 *
 * Per ADR-007 / ADR-008 the actual manifest-driven loader lands in M2. For M1
 * we only parse the shipped manifests so /settings can surface what's coming.
 * Nothing in this file ever runs a plugin.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../paths.ts";

/**
 * Shape of an on-disk `plugin.json`. Intentionally permissive — M1 just
 * surfaces the fields it knows about; M2 will swap in zod validation.
 */
export type PluginManifestFile = {
  id: string;
  manifest_version?: number;
  /** Manifests use `name`; we expose it as `title` for UI parity with the native registry. */
  name?: string;
  title?: string;
  description?: string;
  author?: string;
  homepage?: string;
  license?: string;
  external_tool_license?: string;
  surfaces?: unknown[];
  requires?: {
    node_modules?: string[];
    binaries?: string[];
    python_packages?: string[];
    /** Convenience alias used in some early drafts. */
    tools?: string[];
    node?: string;
  };
  io?: unknown;
  metadata?: Record<string, unknown>;
  run?: unknown;
};

export type PluginStatus = "m1-enabled" | "m1-stub" | "m1-stub-needs-tool";

export type PluginManifestWithStatus = PluginManifestFile & {
  status: PluginStatus;
  /** Binaries the manifest declares that aren't on PATH. Empty unless `m1-stub-needs-tool`. */
  missing_tools?: string[];
};

/** Plugin ids that are wired into the M1 native registry (see `./index.ts`). */
const M1_NATIVE_IDS = new Set<string>(["lottie-validate", "dotlottie-pack"]);

/**
 * Reads every `plugins/<id>/plugin.json` under `PATHS.pluginsDir`.
 *
 * Skips:
 *   - non-directories
 *   - directories without a `plugin.json`
 *   - manifests that fail to parse (we log + drop; the loader is M2)
 *
 * The order is `readdir` order (alphabetical on most filesystems) — fine for
 * M1 where the list is rendered as-is.
 */
export async function listPluginManifests(): Promise<PluginManifestFile[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(PATHS.pluginsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const manifests: PluginManifestFile[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(PATHS.pluginsDir, entry.name, "plugin.json");
    let raw: string;
    try {
      raw = await fs.readFile(manifestPath, "utf8");
    } catch {
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as PluginManifestFile;
      if (parsed && typeof parsed.id === "string") manifests.push(parsed);
    } catch (err) {
      // M1: tolerate broken manifests so one bad stub doesn't blank the page.
      console.warn(`[lottie-tools] failed to parse ${manifestPath}:`, err);
    }
  }
  return manifests;
}

/**
 * Combines manifests with their M1 lifecycle status.
 *
 * @param toolStatusMap Map of binary name → present-on-host. Caller (the admin)
 *                      owns tool detection; lottie-tools stays subprocess-free.
 *                      Pass `{}` (or omit) when tool status is unknown — every
 *                      stub with declared binaries will be flagged
 *                      `m1-stub-needs-tool`, which is the safe default.
 */
export async function listPluginsWithStatus(
  toolStatusMap: Record<string, boolean> = {},
): Promise<PluginManifestWithStatus[]> {
  const manifests = await listPluginManifests();
  return manifests.map((m) => {
    if (M1_NATIVE_IDS.has(m.id)) {
      return { ...m, status: "m1-enabled" as const };
    }
    const required = [
      ...(m.requires?.binaries ?? []),
      ...(m.requires?.tools ?? []),
    ];
    const missing = required.filter((t) => toolStatusMap[t] !== true);
    if (required.length > 0 && missing.length > 0) {
      return { ...m, status: "m1-stub-needs-tool" as const, missing_tools: missing };
    }
    return { ...m, status: "m1-stub" as const };
  });
}
