import "server-only";
import fs from "node:fs/promises";
import { PATHS, data } from "@open-lottie/lottie-tools";

export type AppSettings = {
  default_model: string;
  default_tier: 1 | 3;
  default_renderer: "lottie-web" | "dotlottie-web";
  default_export_format: "json" | "lottie";
  max_repair_attempts: number;
  concurrent_generations: number;
  theme: "system" | "dark" | "light";
};

export const DEFAULT_SETTINGS: AppSettings = {
  default_model: "claude-opus-4-7",
  default_tier: 1,
  default_renderer: "lottie-web",
  default_export_format: "lottie",
  max_repair_attempts: 1,
  concurrent_generations: 3,
  theme: "system",
};

const ALLOWED_KEYS = new Set<keyof AppSettings>([
  "default_model",
  "default_tier",
  "default_renderer",
  "default_export_format",
  "max_repair_attempts",
  "concurrent_generations",
  "theme",
]);

const ALLOWED_MODELS = new Set([
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
]);

/**
 * Load settings from `.config/settings.json`. Missing file or malformed JSON
 * falls back to {@link DEFAULT_SETTINGS}. Unknown keys are dropped on read.
 */
export async function loadSettings(): Promise<AppSettings> {
  let raw: string;
  try {
    raw = await fs.readFile(PATHS.settings, "utf8");
  } catch {
    return { ...DEFAULT_SETTINGS };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }

  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
  return mergeSettings(DEFAULT_SETTINGS, parsed as Record<string, unknown>);
}

/**
 * Validate + apply a partial settings patch. Reads existing settings, shallow
 * merges the patch, atomically writes the new file, and returns the merged
 * value. Throws on validation failure.
 */
export async function saveSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await loadSettings();
  const validated = validatePatch(patch);
  const next: AppSettings = { ...current, ...validated };

  // Ensure `.config/` exists; writeJsonAtomic also mkdirs but be explicit.
  await fs.mkdir(PATHS.config, { recursive: true });
  await data.writeJsonAtomic(PATHS.settings, next);
  return next;
}

/**
 * Validate a patch object. Drops unknown keys are rejected (throws); known
 * keys are type/range checked. Returns a clean Partial<AppSettings>.
 */
export function validatePatch(input: unknown): Partial<AppSettings> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SettingsValidationError("Body must be a JSON object");
  }
  const obj = input as Record<string, unknown>;
  const out: Partial<AppSettings> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!ALLOWED_KEYS.has(key as keyof AppSettings)) {
      throw new SettingsValidationError(`Unknown key: ${key}`);
    }
    switch (key as keyof AppSettings) {
      case "default_model":
        if (typeof value !== "string" || !ALLOWED_MODELS.has(value)) {
          throw new SettingsValidationError(
            `default_model must be one of ${[...ALLOWED_MODELS].join(", ")}`,
          );
        }
        out.default_model = value;
        break;
      case "default_tier":
        if (value !== 1 && value !== 3) {
          throw new SettingsValidationError("default_tier must be 1 or 3");
        }
        out.default_tier = value;
        break;
      case "default_renderer":
        if (value !== "lottie-web" && value !== "dotlottie-web") {
          throw new SettingsValidationError(
            "default_renderer must be 'lottie-web' or 'dotlottie-web'",
          );
        }
        out.default_renderer = value;
        break;
      case "default_export_format":
        if (value !== "json" && value !== "lottie") {
          throw new SettingsValidationError(
            "default_export_format must be 'json' or 'lottie'",
          );
        }
        out.default_export_format = value;
        break;
      case "max_repair_attempts": {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 5) {
          throw new SettingsValidationError(
            "max_repair_attempts must be an integer 0..5",
          );
        }
        out.max_repair_attempts = value;
        break;
      }
      case "concurrent_generations": {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 10) {
          throw new SettingsValidationError(
            "concurrent_generations must be an integer 1..10",
          );
        }
        out.concurrent_generations = value;
        break;
      }
      case "theme":
        if (value !== "system" && value !== "dark" && value !== "light") {
          throw new SettingsValidationError(
            "theme must be 'system', 'dark', or 'light'",
          );
        }
        out.theme = value;
        break;
    }
  }
  return out;
}

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

/**
 * Merge a defensive partial onto base. Unknown keys in `patch` are dropped;
 * type-mismatched values fall back to the base value.
 */
function mergeSettings(
  base: AppSettings,
  patch: Record<string, unknown>,
): AppSettings {
  const out: AppSettings = { ...base };
  try {
    const validated = validatePatch(patch);
    Object.assign(out, validated);
  } catch {
    // Defensive: if the file has a partially-bad shape, accept what we can.
    for (const key of ALLOWED_KEYS) {
      if (!(key in patch)) continue;
      try {
        const partial = validatePatch({ [key]: patch[key] });
        Object.assign(out, partial);
      } catch {
        // skip individual bad fields
      }
    }
  }
  return out;
}
