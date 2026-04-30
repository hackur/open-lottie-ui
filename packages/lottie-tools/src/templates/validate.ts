/**
 * JSON-Schema-validates a TemplateParams object against a template's
 * `params_schema`. Uses ajv with formats and strict-mode disabled (the schemas
 * are hand-authored and may use loose conventions).
 */

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { Template, TemplateParams, ValidateResult } from "./types.ts";

// Lazy ajv to avoid paying the import cost when the engine is only loaded for
// `loadTemplate`/`listTemplates` (e.g. UI render of a template gallery).
let _ajv: Ajv | null = null;
function getAjv(): Ajv {
  if (_ajv) return _ajv;
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    useDefaults: true,
    coerceTypes: false,
  });
  addFormats(ajv);
  _ajv = ajv;
  return ajv;
}

const _validatorCache = new WeakMap<object, ValidateFunction>();

function getValidator(template: Template): ValidateFunction {
  const schema = template.params_schema as object;
  let v = _validatorCache.get(schema);
  if (!v) {
    v = getAjv().compile(schema);
    _validatorCache.set(schema, v);
  }
  return v;
}

/** Runs `params` through `template.params_schema` and returns the result. */
export function validateParams(
  template: Template,
  params: TemplateParams,
): ValidateResult {
  const validate = getValidator(template);
  const valid = validate(params) as boolean;
  return {
    valid,
    errors: valid ? null : ((validate.errors ?? []) as ErrorObject[]),
  };
}
