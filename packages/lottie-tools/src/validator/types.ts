export type ValidationError = {
  /** JSON Pointer-ish path into the input where the error was found, e.g. `/layers/0/ks`. */
  path: string;
  /** Human-readable message. */
  message: string;
  /** Ajv keyword that failed (e.g. `required`, `type`, `enum`). */
  keyword: string;
};

export type ValidateResult = {
  valid: boolean;
  errors: ValidationError[];
};

export type SmokeResult = {
  ok: boolean;
  /** Required top-level Bodymovin fields that are missing from the input. */
  missing: string[];
};
