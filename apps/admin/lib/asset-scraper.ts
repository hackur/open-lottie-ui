/**
 * Asset scraper — given a page URL, find Lottie asset references in HTML and
 * validate each candidate.
 *
 * Single-page only. User-initiated. We never crawl, never queue follow-ups.
 *
 * The two public functions are deliberately small and testable:
 *   - findCandidates(pageUrl)      — fetch the HTML, regex-extract candidates
 *   - scanCandidates(candidates)   — fetch each, validate, return enriched results
 *
 * Implementation notes:
 *   - No dependency on cheerio / parse5; we lean on regex over the raw HTML.
 *     That's "good enough" for the embed patterns Lottie consumers actually use
 *     (player-element src, anchor href, data-* attrs, lottie-web loadAnimation).
 *   - Every fetch has a 5-second AbortController timeout and a per-asset byte cap.
 *   - We resolve every URL absolute against the page URL.
 *   - Inline <script type="application/json"> blocks that smoke-pass as Lottie
 *     are surfaced as `pageUrl#inline-N` candidates.
 */
import { Buffer } from "node:buffer";
import { hash, pack, validator } from "@open-lottie/lottie-tools";

export type AssetCandidate = {
  /** Absolute resolved URL (or `pageUrl#inline-N` for inline JSON blocks). */
  url: string;
  source:
    | "lottie-player"
    | "dotlottie-player"
    | "anchor"
    | "data-attr"
    | "load-animation"
    | "inline-json";
  format: "json" | "lottie" | "unknown";
};

export type ScannedAsset = {
  candidate: AssetCandidate;
  ok: boolean;
  reason?: string;
  bytes?: number;
  intrinsic?: {
    fr: number;
    w: number;
    h: number;
    ip: number;
    op: number;
    layer_count: number;
  };
  /** The parsed Lottie JSON if valid. Callers may strip this for large assets. */
  preview?: unknown;
  contentHash?: string;
};

const DEFAULT_USER_AGENT = "open-lottie-ui scraper / contact: local-dev";
const FETCH_TIMEOUT_MS = 5_000;

const DEFAULT_CAPS = {
  maxAssets: 30,
  maxBytesPerAsset: 5 * 1024 * 1024, // 5 MB
  maxTotalBytes: 50 * 1024 * 1024, // 50 MB
} as const;

/**
 * Source-attributed regex patterns. Order matters: the first match wins so we
 * prefer the more specific element-tag patterns over the generic data-attr.
 *
 * Each regex captures the URL in group 1.
 */
const PATTERNS: ReadonlyArray<{ source: AssetCandidate["source"]; re: RegExp }> = [
  {
    source: "lottie-player",
    re: /<lottie-player[^>]+src=["']([^"']+)["']/gi,
  },
  {
    source: "dotlottie-player",
    re: /<dotlottie-player[^>]+src=["']([^"']+)["']/gi,
  },
  {
    source: "dotlottie-player",
    re: /<dotlottie-wc[^>]+src=["']([^"']+)["']/gi,
  },
  {
    source: "anchor",
    re: /<a[^>]+href=["']([^"']+\.(?:json|lottie))(?:\?[^"']*)?["']/gi,
  },
  {
    source: "data-attr",
    re: /data-(?:animation|lottie|src|animation-path)=["']([^"']+\.(?:json|lottie))(?:\?[^"']*)?["']/gi,
  },
  {
    source: "load-animation",
    re: /loadAnimation\s*\(\s*\{[^}]*?path\s*:\s*["']([^"']+)["']/gi,
  },
];

const INLINE_JSON_SCRIPT_RE =
  /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;

function inferFormat(url: string): AssetCandidate["format"] {
  const noQuery = url.split("?")[0]?.split("#")[0] ?? "";
  if (noQuery.endsWith(".lottie")) return "lottie";
  if (noQuery.endsWith(".json")) return "json";
  return "unknown";
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Resolve `raw` against `pageUrl`, return absolute http(s) URL or null. */
function tryResolve(raw: string, pageUrl: string): string | null {
  // Skip protocol-handler-style refs we can't fetch.
  const lower = raw.trim().toLowerCase();
  if (
    lower.startsWith("data:") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("about:") ||
    lower.startsWith("#")
  ) {
    return null;
  }
  try {
    const resolved = new URL(raw, pageUrl).href;
    return isHttpUrl(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch a page and extract every reference to a Lottie asset. Always returns
 * a deduped list (by absolute URL) of candidates.
 *
 * Throws if the page itself is unreachable.
 */
export async function findCandidates(pageUrl: string): Promise<AssetCandidate[]> {
  const { candidates } = await fetchAndExtract(pageUrl);
  return candidates;
}

/**
 * Like {@link findCandidates}, but also returns the raw HTML so callers can
 * pass it through to {@link scanCandidates} via `inlineHtml` (needed to resolve
 * `inline-json` candidates).
 */
export async function fetchAndExtract(
  pageUrl: string,
): Promise<{ candidates: AssetCandidate[]; html: string }> {
  if (!isHttpUrl(pageUrl)) {
    throw new Error(`pageUrl must be http(s): ${pageUrl}`);
  }
  const res = await fetchWithTimeout(pageUrl, {
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  return { candidates: extractCandidatesFromHtml(html, pageUrl), html };
}

/**
 * Pure: given raw HTML and the page URL, extract candidates. Exported for
 * testability (call from a unit test without going to the network).
 */
export function extractCandidatesFromHtml(
  html: string,
  pageUrl: string,
): AssetCandidate[] {
  const seen = new Map<string, AssetCandidate>();

  for (const { source, re } of PATTERNS) {
    re.lastIndex = 0;
    for (let m: RegExpExecArray | null; (m = re.exec(html)); ) {
      const raw = m[1];
      if (!raw) continue;
      const abs = tryResolve(raw, pageUrl);
      if (!abs) continue;
      if (seen.has(abs)) continue;
      seen.set(abs, { url: abs, source, format: inferFormat(abs) });
    }
  }

  // Inline <script type="application/json"> Lottie blocks. We don't parse here
  // (keep regex pass cheap); the scanner does the smoke-check.
  let inlineN = 0;
  INLINE_JSON_SCRIPT_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = INLINE_JSON_SCRIPT_RE.exec(html)); ) {
    const body = (m[1] ?? "").trim();
    if (!body) continue;
    // Cheap pre-filter: must look like a Lottie object.
    if (!/"layers"\s*:/.test(body) || !/"fr"\s*:/.test(body)) continue;
    const inlineUrl = `${pageUrl}#inline-${inlineN++}`;
    seen.set(inlineUrl, {
      url: inlineUrl,
      source: "inline-json",
      format: "json",
    });
  }

  return Array.from(seen.values());
}

/** Read the body of a fetch Response, capping at `maxBytes`. */
async function readBodyCapped(
  res: Response,
  maxBytes: number,
): Promise<{ buf: Buffer; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, truncated: buf.byteLength > maxBytes };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      truncated = true;
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      break;
    }
    chunks.push(value);
  }
  return { buf: Buffer.concat(chunks.map((c) => Buffer.from(c))), truncated };
}

/**
 * For a list of candidates: fetch + validate each. Caps total bytes and total
 * count to stay polite. Order of input is preserved in the output.
 */
export async function scanCandidates(
  candidates: AssetCandidate[],
  opts?: {
    maxAssets?: number;
    maxBytesPerAsset?: number;
    maxTotalBytes?: number;
    userAgent?: string;
    /** For inline-json sources: provide the raw HTML so we can resolve them. */
    inlineHtml?: string;
  },
): Promise<ScannedAsset[]> {
  const maxAssets = opts?.maxAssets ?? DEFAULT_CAPS.maxAssets;
  const maxBytesPerAsset = opts?.maxBytesPerAsset ?? DEFAULT_CAPS.maxBytesPerAsset;
  const maxTotalBytes = opts?.maxTotalBytes ?? DEFAULT_CAPS.maxTotalBytes;
  const userAgent = opts?.userAgent ?? DEFAULT_USER_AGENT;

  const out: ScannedAsset[] = [];
  let totalBytes = 0;

  const inlineBlocks: string[] = [];
  if (opts?.inlineHtml) {
    INLINE_JSON_SCRIPT_RE.lastIndex = 0;
    for (
      let m: RegExpExecArray | null;
      (m = INLINE_JSON_SCRIPT_RE.exec(opts.inlineHtml));
    ) {
      const body = (m[1] ?? "").trim();
      if (body) inlineBlocks.push(body);
    }
  }

  for (const c of candidates) {
    if (out.length >= maxAssets) {
      out.push({ candidate: c, ok: false, reason: "max-assets-reached" });
      continue;
    }
    if (totalBytes >= maxTotalBytes) {
      out.push({ candidate: c, ok: false, reason: "max-total-bytes-reached" });
      continue;
    }
    try {
      const scanned = await scanOne(c, {
        maxBytesPerAsset,
        userAgent,
        inlineBlocks,
      });
      if (typeof scanned.bytes === "number") {
        totalBytes += scanned.bytes;
      }
      out.push(scanned);
    } catch (err) {
      out.push({
        candidate: c,
        ok: false,
        reason: `scan-failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return out;
}

async function scanOne(
  candidate: AssetCandidate,
  opts: { maxBytesPerAsset: number; userAgent: string; inlineBlocks: string[] },
): Promise<ScannedAsset> {
  // Inline JSON blocks: parse from the html captured by the caller.
  if (candidate.source === "inline-json") {
    const idxMatch = candidate.url.match(/#inline-(\d+)$/);
    const idx = idxMatch ? Number(idxMatch[1]) : -1;
    const body = idx >= 0 ? opts.inlineBlocks[idx] : undefined;
    if (!body) {
      return { candidate, ok: false, reason: "inline-not-found" };
    }
    return validateJsonBody(candidate, Buffer.from(body, "utf8"));
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(candidate.url, {
      headers: { "user-agent": opts.userAgent, accept: "*/*" },
      redirect: "follow",
    });
  } catch (err) {
    return {
      candidate,
      ok: false,
      reason: `fetch-failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!res.ok) {
    return { candidate, ok: false, reason: `not-found: ${res.status}` };
  }

  const { buf, truncated } = await readBodyCapped(res, opts.maxBytesPerAsset);
  if (truncated) {
    return {
      candidate,
      ok: false,
      reason: "too-large",
      bytes: buf.byteLength,
    };
  }

  // Sniff: if content starts with a ZIP signature (PK\x03\x04), it's a .lottie
  // bundle regardless of file extension.
  const isZip =
    buf.byteLength >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04;

  if (isZip || candidate.format === "lottie") {
    return validateDotLottieBody(candidate, buf);
  }
  return validateJsonBody(candidate, buf);
}

function buildIntrinsic(parsed: unknown): ScannedAsset["intrinsic"] {
  const i = hash.intrinsics(parsed);
  return {
    fr: i.fr,
    ip: i.ip,
    op: i.op,
    w: i.w,
    h: i.h,
    layer_count: i.layer_count,
  };
}

function validateJsonBody(
  candidate: AssetCandidate,
  buf: Buffer,
): ScannedAsset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buf.toString("utf8"));
  } catch {
    return {
      candidate,
      ok: false,
      reason: "not-valid-json",
      bytes: buf.byteLength,
    };
  }
  const smoke = validator.smokeCheck(parsed);
  if (!smoke.ok) {
    return {
      candidate,
      ok: false,
      reason: `not-valid-lottie: missing ${smoke.missing.join(",")}`,
      bytes: buf.byteLength,
    };
  }
  return {
    candidate: { ...candidate, format: "json" },
    ok: true,
    bytes: buf.byteLength,
    intrinsic: buildIntrinsic(parsed),
    preview: parsed,
    contentHash: hash.contentHash(parsed),
  };
}

async function validateDotLottieBody(
  candidate: AssetCandidate,
  buf: Buffer,
): Promise<ScannedAsset> {
  const isZip =
    buf.byteLength >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04;
  if (!isZip) {
    return {
      candidate,
      ok: false,
      reason: "not-valid-dotlottie: missing PK signature",
      bytes: buf.byteLength,
    };
  }
  let unpacked;
  try {
    unpacked = await pack.unpackDotLottie(buf);
  } catch (err) {
    return {
      candidate,
      ok: false,
      reason: `not-valid-dotlottie: ${err instanceof Error ? err.message : String(err)}`,
      bytes: buf.byteLength,
    };
  }
  const first = unpacked.animations.find((a) => a.json && typeof a.json === "object");
  if (!first || !first.json) {
    return {
      candidate,
      ok: false,
      reason: "not-valid-dotlottie: no animation in archive",
      bytes: buf.byteLength,
    };
  }
  const smoke = validator.smokeCheck(first.json);
  if (!smoke.ok) {
    return {
      candidate,
      ok: false,
      reason: `not-valid-lottie: missing ${smoke.missing.join(",")}`,
      bytes: buf.byteLength,
    };
  }
  return {
    candidate: { ...candidate, format: "lottie" },
    ok: true,
    bytes: buf.byteLength,
    intrinsic: buildIntrinsic(first.json),
    preview: first.json,
    contentHash: hash.contentHash(first.json),
  };
}
