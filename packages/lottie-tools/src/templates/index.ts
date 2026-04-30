/**
 * Public API for the Tier-1 template engine.
 *
 * Typical use:
 *   const tpl = await loadTemplate("color-pulse");
 *   const v = validateParams(tpl, params);
 *   if (!v.valid) throw ...;
 *   const { lottie } = render(tpl, params);
 */

export type {
  Template,
  TemplateParams,
  ValidateResult,
  RenderResult,
} from "./types.ts";
export { loadTemplate, listTemplates } from "./load.ts";
export { validateParams } from "./validate.ts";
export { render } from "./render.ts";
