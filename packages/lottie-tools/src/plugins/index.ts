/**
 * Hardcoded plugin registry for M1 (per ADR-008).
 *
 * The manifest-driven plugin loader is M2 work; M1 ships two plugins
 * baked into the data layer:
 *   - `lottie-validate` (uses our validator)
 *   - `dotlottie-pack`  (uses our .lottie packer)
 *
 * The shape mirrors the `plugin.json` v1 schema (ADR-007) so M2 can
 * swap in a real loader without changing call sites.
 */

import type { ValidateResult } from "../validator/types.ts";

export type PluginSurface = "library-action" | "review-action" | "import" | "export";

export interface PluginManifest {
  id: string;
  title: string;
  description: string;
  surfaces: PluginSurface[];
  enabled: boolean;
  /** True if the plugin is implemented natively in the app (not via a manifest). */
  native: true;
}

export interface ValidatePluginResult {
  pluginId: "lottie-validate";
  result: ValidateResult;
}

export interface PackPluginResult {
  pluginId: "dotlottie-pack";
  bytes: Uint8Array;
}

const REGISTRY: PluginManifest[] = [
  {
    id: "lottie-validate",
    title: "Validate Lottie",
    description: "Validates against the bundled lottie-spec subset.",
    surfaces: ["library-action", "review-action"],
    enabled: true,
    native: true,
  },
  {
    id: "dotlottie-pack",
    title: "Export as .lottie",
    description: "Packs the animation as a single-entry .lottie ZIP.",
    surfaces: ["library-action", "export"],
    enabled: true,
    native: true,
  },
];

export function listPlugins(surface?: PluginSurface): PluginManifest[] {
  if (!surface) return REGISTRY.filter((p) => p.enabled);
  return REGISTRY.filter((p) => p.enabled && p.surfaces.includes(surface));
}

export function getPlugin(id: string): PluginManifest | null {
  return REGISTRY.find((p) => p.id === id) ?? null;
}

// Read-only manifest registry (M1; loader lives in M2 per ADR-007).
export {
  listPluginManifests,
  listPluginsWithStatus,
  type PluginManifestFile,
  type PluginManifestWithStatus,
  type PluginStatus,
} from "./manifests.ts";
