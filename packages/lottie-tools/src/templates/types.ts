/**
 * Tier-1 template engine types.
 *
 * A template is a small JSON document with two essential parts:
 *   - `params_schema`: a JSON Schema describing the inputs Claude must produce.
 *   - `body`: a partial Lottie JSON tree containing `{{placeholder}}` strings
 *     that get substituted with values from the params object.
 *
 * The renderer walks the body and replaces placeholders deterministically;
 * Claude only ever produces the params, never the Lottie itself.
 */

import type { ErrorObject } from "ajv";

/** Raw, on-disk template document. */
export interface Template {
  /** Stable kebab-case id that matches the filename (e.g. `color-pulse`). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Short prose used in tier-1 prompt-building. */
  description: string;
  /** JSON Schema describing the params object. */
  params_schema: Record<string, unknown>;
  /**
   * Partial Lottie JSON containing `{{path}}` placeholders. The renderer
   * substitutes values from `TemplateParams` and returns a complete Lottie.
   */
  body?: unknown;
  /** Forward-compat: allow extra fields (e.g. `scaffold_status`). */
  [extra: string]: unknown;
}

/** Concrete params Claude (or a test) supplies for a render call. */
export type TemplateParams = Record<string, unknown>;

/** Result of `validateParams`. */
export interface ValidateResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

/** Result of `render`. */
export interface RenderResult {
  /** Full Lottie JSON object — pass straight to the validator. */
  lottie: Record<string, unknown>;
  /** Echo of the template id used. */
  template_id: string;
  /** Echo of the params used (post-defaults if we ever apply them). */
  params: TemplateParams;
}
