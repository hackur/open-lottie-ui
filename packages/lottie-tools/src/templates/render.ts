/**
 * Substitutes `{{...}}` placeholders in a template body with values from a
 * params object and returns a complete Lottie JSON.
 *
 * Substitution semantics (mirrors prompts/templates/README.md):
 *   - A string value of exactly `"{{path}}"` is replaced with the resolved
 *     param value (preserving its type — array stays array, number stays
 *     number, etc.).
 *   - A string value containing one or more `{{path}}` segments alongside
 *     other text is interpolated to a string. Non-string substitutions are
 *     `JSON.stringify`-ed inside that string.
 *   - Object keys are NOT substituted — placeholders only live in values.
 *   - Path resolution supports up to 2 levels: `foo`, `foo.bar`, `foo.0`.
 *
 * Missing keys throw — better to fail loud at render time than to ship a
 * Lottie containing a literal `"{{unknown}}"` string.
 */

import type {
  RenderResult,
  Template,
  TemplateParams,
} from "./types.ts";

const PLACEHOLDER_FULL = /^\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}$/;
const PLACEHOLDER_ANY = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g;

/** Renders `template.body` with `params` and returns a full Lottie JSON. */
export function render(template: Template, params: TemplateParams): RenderResult {
  if (template.body === undefined) {
    throw new Error(
      `render: template ${template.id} has no body — fill in the body field before calling render().`,
    );
  }
  const lottie = walk(template.body, params, template.id) as Record<string, unknown>;
  if (!lottie || typeof lottie !== "object" || Array.isArray(lottie)) {
    throw new Error(
      `render: template ${template.id} body did not resolve to a Lottie object (got ${typeof lottie}).`,
    );
  }
  return { lottie, template_id: template.id, params };
}

function walk(node: unknown, params: TemplateParams, tplId: string): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node === "string") return substituteString(node, params, tplId);
  if (typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map((child) => walk(child, params, tplId));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    out[k] = walk(v, params, tplId);
  }
  return out;
}

function substituteString(
  s: string,
  params: TemplateParams,
  tplId: string,
): unknown {
  // Whole-string placeholder — return the resolved value with its native type.
  const full = s.match(PLACEHOLDER_FULL);
  if (full) {
    return resolve(full[1]!, params, tplId);
  }
  // Embedded placeholder(s) — string-interpolate.
  if (!s.includes("{{")) return s;
  return s.replace(PLACEHOLDER_ANY, (_match, path: string) => {
    const v = resolve(path, params, tplId);
    return typeof v === "string" ? v : JSON.stringify(v);
  });
}

function resolve(rawPath: string, params: TemplateParams, tplId: string): unknown {
  const parts = rawPath.split(".");
  if (parts.length > 2) {
    throw new Error(
      `render(${tplId}): placeholder ${JSON.stringify(rawPath)} has more than 2 levels of nesting (max supported).`,
    );
  }
  const [head, sub] = parts as [string, string?];
  if (!(head in params)) {
    throw new Error(
      `render(${tplId}): missing required param ${JSON.stringify(head)}.`,
    );
  }
  const top = params[head];
  if (sub === undefined) return top;

  // Second level: support array index or object key.
  if (Array.isArray(top)) {
    const idx = Number(sub);
    if (!Number.isInteger(idx) || idx < 0 || idx >= top.length) {
      throw new Error(
        `render(${tplId}): index ${JSON.stringify(sub)} out of range for array param ${head} (len=${top.length}).`,
      );
    }
    return top[idx];
  }
  if (top && typeof top === "object") {
    const o = top as Record<string, unknown>;
    if (!(sub in o)) {
      throw new Error(
        `render(${tplId}): key ${JSON.stringify(sub)} not found on param ${head}.`,
      );
    }
    return o[sub];
  }
  throw new Error(
    `render(${tplId}): cannot resolve sub-path ${JSON.stringify(sub)} on non-array/object param ${head}.`,
  );
}
