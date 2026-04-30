/**
 * Loads template JSON files from `prompts/templates/`.
 *
 * Templates are addressed by their `id` (e.g. `color-pulse`), which must match
 * the filename. The on-disk root is taken from `PATHS.promptTemplates` so a
 * test or sub-process can override it via `OPEN_LOTTIE_ROOT`.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../paths.ts";
import type { Template } from "./types.ts";

/** Reads `prompts/templates/<id>.json` and returns the parsed Template. */
export async function loadTemplate(id: string): Promise<Template> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(
      `loadTemplate: invalid template id ${JSON.stringify(id)} — expected kebab-case ascii.`,
    );
  }
  const file = path.join(PATHS.promptTemplates, `${id}.json`);
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (err) {
    throw new Error(
      `loadTemplate: could not read template ${id} at ${file}: ${(err as Error).message}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `loadTemplate: ${id}.json is not valid JSON: ${(err as Error).message}`,
    );
  }
  if (!isTemplateLike(parsed)) {
    throw new Error(
      `loadTemplate: ${id}.json is missing required fields (id, name, params_schema).`,
    );
  }
  if (parsed.id !== id) {
    throw new Error(
      `loadTemplate: ${id}.json declares id=${JSON.stringify(parsed.id)} which does not match its filename.`,
    );
  }
  return parsed;
}

/** Returns the ids of all templates in `prompts/templates/`. */
export async function listTemplates(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(PATHS.promptTemplates);
  } catch (err) {
    throw new Error(
      `listTemplates: could not read ${PATHS.promptTemplates}: ${(err as Error).message}`,
    );
  }
  return entries
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length))
    .sort();
}

function isTemplateLike(x: unknown): x is Template {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.params_schema === "object" &&
    o.params_schema !== null
  );
}
