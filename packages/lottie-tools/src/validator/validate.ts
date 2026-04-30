import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ValidationError, ValidateResult } from "./types.ts";

// Resolve the vendored schema relative to this source file. We use readFileSync
// rather than `import ... with { type: "json" }` so that the same module works
// whether it's executed via tsx, node --experimental-strip-types, or a bundler
// that doesn't yet honor JSON import attributes.
const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "../../schema/lottie.schema.json");
const schema: object = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  // The pragmatic subset uses only standard keywords, but real-world Lottie
  // files have extra fields we tolerate via additionalProperties: true. Keep
  // strict off so future schema refreshes don't bork on unknown formats.
});
addFormats.default(ajv);

const compiledValidator = ajv.compile(schema);

function ajvErrorToValidationError(err: ErrorObject): ValidationError {
  // Ajv 8/2020 uses `instancePath` as the JSON-Pointer into the data. For
  // `required` errors the missing key is in `params.missingProperty` and is
  // not reflected in the instance path, so append it ourselves for clarity.
  let path = err.instancePath || "/";
  if (
    err.keyword === "required" &&
    typeof (err.params as { missingProperty?: unknown }).missingProperty === "string"
  ) {
    const prop = (err.params as { missingProperty: string }).missingProperty;
    path = `${path === "/" ? "" : path}/${prop}`;
  }
  return {
    path,
    message: err.message ?? "validation error",
    keyword: err.keyword,
  };
}

/**
 * Validate a parsed Lottie JSON object against the vendored schema.
 *
 * The compiled validator is built once at module load and reused on every call,
 * so this is cheap to invoke per animation.
 */
export function validate(json: unknown): ValidateResult {
  const valid = compiledValidator(json) as boolean;
  if (valid) return { valid: true, errors: [] };
  const errors: ValidationError[] = (compiledValidator.errors ?? []).map(
    ajvErrorToValidationError,
  );
  return { valid: false, errors };
}
