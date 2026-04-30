/**
 * On-disk data-layer types.
 *
 * These mirror the schemas in `docs/architecture/data-model.md`. Keep them in
 * sync with that doc — the validator module enforces shape, this module just
 * trusts the inputs.
 */

// ---------- Library ----------

export type LibrarySource =
  | "seed"
  | "lottiefiles"
  | "lordicon"
  | "useanimations"
  | "iconscout"
  | "generation"
  | "import"
  | (string & {}); // allow forward-compat sources without losing autocomplete

export interface LibraryIntrinsic {
  /** Frame rate. */
  fr: number;
  /** In-point (start frame). */
  ip: number;
  /** Out-point (end frame). */
  op: number;
  /** Width. */
  w: number;
  /** Height. */
  h: number;
  layer_count: number;
  size_bytes: number;
}

export interface LibraryMeta {
  id: string;
  title: string;
  tags: string[];
  source: LibrarySource;
  source_url: string | null;
  license_id: string;
  license_url: string | null;
  attribution_required: boolean;
  attribution_text: string | null;
  imported_at: string;
  imported_by: string;
  /** Hex SHA-256 prefixed with `sha256:`. */
  content_hash: string;
  intrinsic: LibraryIntrinsic;
  /** Set if this entry was promoted from a generation. */
  from_generation: string | null;
}

export interface LibraryEntry {
  id: string;
  /** Absolute path to the entry directory. */
  dir: string;
  meta: LibraryMeta;
}

// ---------- Generations ----------

export type GenerationStatus =
  | "running"
  | "pending-review"
  | "approved"
  | "rejected"
  | "failed-validation"
  | "failed-render"
  | "cancelled";

export type GenerationTier = 1 | 2 | 3;

export interface GenerationValidation {
  ok: boolean;
  errors: unknown[];
}

export interface GenerationRender {
  ok: boolean;
  blank_frames: number;
  total_frames: number;
}

export interface GenerationVersionInfo {
  v: number;
  validated: boolean;
  errors_count: number;
}

export interface GenerationMeta {
  id: string;
  status: GenerationStatus;
  /** Library id this remix is based on, or null. */
  base_id: string | null;
  prompt_summary: string;
  tier: GenerationTier;
  /** Set when tier === 1, otherwise null. */
  template_id: string | null;
  model: string;
  session_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  cost_usd: number | null;
  num_turns: number | null;
  validation: GenerationValidation;
  render: GenerationRender;
  versions: GenerationVersionInfo[];
  /** Selected version surfaced for review. Null while still running. */
  final_version: number | null;
}

export interface GenerationEntry {
  id: string;
  /** Absolute path to the generation directory. */
  dir: string;
  meta: GenerationMeta;
}

export interface CreateGenerationOptions {
  /** Optional pre-computed id. If omitted, a `<YYYY-MM-DD>_<rand6>` id is generated. */
  id?: string;
  base_id?: string | null;
  prompt_summary: string;
  tier: GenerationTier;
  template_id?: string | null;
  model: string;
  session_id?: string | null;
  /** Markdown body to seed `prompt.md` with. Optional. */
  prompt_markdown?: string;
}

export interface GenerationListFilter {
  status?: GenerationStatus | GenerationStatus[];
}

// ---------- Decisions ----------

export type DecisionAction =
  | "created"
  | "validated"
  | "rendered"
  | "approve"
  | "reject"
  | "committed"
  | "cancelled"
  | (string & {});

/**
 * Decision log entries are open-ended on purpose — different actions carry
 * different fields. The required keys are `ts`, `gen`, `action`.
 */
export interface DecisionEntry {
  ts: string;
  gen: string;
  action: DecisionAction;
  [extra: string]: unknown;
}

// ---------- Promote ----------

export interface PromoteOptions {
  /** Slug fragment used in the new library id (kebab-case ASCII). */
  slug: string;
  title: string;
  tags?: string[];
  license_id?: string;
  license_url?: string | null;
  attribution_required?: boolean;
  attribution_text?: string | null;
  imported_by?: string;
  /** Override for the source field; defaults to `"generation"`. */
  source?: LibrarySource;
  source_url?: string | null;
}
