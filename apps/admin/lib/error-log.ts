import "server-only";

/**
 * Process-wide ring buffer of recent server errors.
 *
 * Pinned to `globalThis` via a Symbol.for() key so HMR (which hot-reloads this
 * module) does not reset the buffer. Capacity 100, FIFO. Every recorded error
 * is also `console.error`-ed so it stays visible in the dev-server log.
 *
 * See `app/api/debug/route.ts` for the snapshot endpoint and
 * `app/__debug/page.tsx` for the dev UI.
 */

export type ErrorRecord = {
  ts: string;
  message: string;
  stack: string;
  /** Free-form route or operation label, e.g. `"GET /api/generate/.../events"`. */
  context?: string;
  /** Caller-supplied structured data — request URL, method, params. */
  data?: unknown;
};

const KEY = Symbol.for("open-lottie.errorRing");
const CAPACITY = 100;

type Ring = ErrorRecord[];
type GlobalWithRing = typeof globalThis & { [KEY]?: Ring };
const g = globalThis as GlobalWithRing;
const ring: Ring = (g[KEY] ??= []);

function toMessageStack(err: unknown): { message: string; stack: string } {
  if (err instanceof Error) {
    return { message: err.message || err.name || "Error", stack: err.stack ?? "" };
  }
  if (typeof err === "string") return { message: err, stack: "" };
  try {
    return { message: JSON.stringify(err), stack: "" };
  } catch {
    return { message: String(err), stack: "" };
  }
}

/**
 * Record an error in the ring buffer and `console.error` it. Never throws —
 * if logging itself fails we silently drop the entry.
 */
export function recordError(err: unknown, context?: string, data?: unknown): void {
  try {
    const { message, stack } = toMessageStack(err);
    const record: ErrorRecord = {
      ts: new Date().toISOString(),
      message,
      stack,
      context,
      data,
    };
    ring.push(record);
    while (ring.length > CAPACITY) ring.shift();
    // Mirror to the dev-server log so it shows up alongside Next.js's own output.
    if (context) {
      console.error(`[error-log] ${context}:`, err);
    } else {
      console.error("[error-log]", err);
    }
  } catch {
    /* swallow — logging must never crash the request */
  }
}

/** Return the last `n` entries (newest last, matching ring order). */
export function tailErrors(n: number): ErrorRecord[] {
  if (n <= 0) return [];
  return ring.slice(-n);
}

/** Drop every entry. Used by the /__debug "Clear errors" button. */
export function clearErrors(): void {
  ring.length = 0;
}

/** Total count currently in the ring. */
export function errorCount(): number {
  return ring.length;
}
