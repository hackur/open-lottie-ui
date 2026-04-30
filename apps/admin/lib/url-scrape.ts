/**
 * URL-scrape helper.
 *
 * Pasted-URL flow: given a single URL, return a flat list of
 * Lottie-shaped {@link ScrapedAsset}s the user can pick from. This lives
 * alongside the richer `asset-scraper.ts` (which feeds the page-scan UI and
 * writes directly to the library); it stays small and dependency-free so the
 * new `/api/import/url` + `/api/import/url/save` endpoints can lean on it
 * without inheriting the page-scan pipeline.
 *
 * Behaviors enforced:
 *   - 10 s per-fetch timeout (AbortController).
 *   - 5 MB body cap; anything larger is dropped.
 *   - Up to 3 redirects via Node's built-in `redirect: "follow"` (fetch caps
 *     internally; we additionally reject `Location` chains > 3 by setting
 *     `redirect: "manual"` and walking the chain ourselves).
 *   - Honors `application/json`, `application/zip`, `text/html`. Anything else
 *     is best-effort sniffed by extension only.
 *   - For HTML, only the top 5–10 candidates are eagerly parsed; the rest
 *     ride on HEAD metadata.
 *   - No external HTML parsers — tiny regex pass.
 */
import { Buffer } from "node:buffer";

export type ScrapedAsset = {
  /** Absolute URL we'd fetch to import this. */
  url: string;
  /** Best-guess filename (`loader-pulse.json`, `bundle.lottie`, `inline-0.json`). */
  filename: string;
  /** Size in bytes if reported by HEAD/GET (else null). */
  size_bytes: number | null;
  /** Reported / inferred content-type. */
  content_type: string;
  /** Parsed Lottie JSON when we successfully validated; else absent. */
  preview?: unknown;
};

const USER_AGENT = "open-lottie-ui scraper";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB body cap
const MAX_REDIRECTS = 3;
/** How many of the discovered candidates we eagerly GET + parse. */
const MAX_PARSE_CANDIDATES = 10;

/**
 * The single regex used to scan HTML for Lottie-shaped asset URLs. Matches:
 *   - href / src / data-* attributes whose VALUE ends in .json or .lottie.
 *   - <source src=...> tags.
 *   - lottie-player / dotlottie-player tag src attributes.
 *   - LottieFiles CDN paths (any URL containing "/lottiefiles" + .json).
 *
 * Group 1 captures the URL.
 */
const HTML_LOTTIE_RE =
  /(?:href|src|data-(?:src|animation|lottie|animation-path))\s*=\s*["']([^"']+?\.(?:json|lottie)(?:\?[^"']*)?)["']|<source[^>]+src\s*=\s*["']([^"']+?\.(?:json|lottie)(?:\?[^"']*)?)["']|["'](https?:\/\/[^"']*lottiefiles[^"']*\.json[^"']*)["']/gi;

/** Inline `<script type="application/json">…</script>` blocks. */
const INLINE_JSON_RE =
  /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function inferFilename(url: string, fallback = "asset.json"): string {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
    if (last) return last;
  } catch {
    // fall through
  }
  return fallback;
}

function looksLikeLottie(parsed: unknown): boolean {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false;
  }
  const o = parsed as Record<string, unknown>;
  return "v" in o && "fr" in o && "layers" in o;
}

function extInferContentType(url: string): string {
  const noQuery = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  if (noQuery.endsWith(".json")) return "application/json";
  if (noQuery.endsWith(".lottie")) return "application/zip";
  return "application/octet-stream";
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "user-agent": USER_AGENT,
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Walk up to {@link MAX_REDIRECTS} 3xx hops manually so we never get caught
 * in a redirect loop. Returns the final response (status < 300 or terminal
 * redirect with no Location header).
 */
async function fetchFollowingRedirects(
  url: string,
  method: "GET" | "HEAD" = "GET",
): Promise<{ res: Response; finalUrl: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchWithTimeout(current, {
      method,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { res, finalUrl: current };
      if (hop === MAX_REDIRECTS) {
        throw new Error(`too-many-redirects: > ${MAX_REDIRECTS}`);
      }
      try {
        current = new URL(loc, current).href;
      } catch {
        return { res, finalUrl: current };
      }
      continue;
    }
    return { res, finalUrl: current };
  }
  // Unreachable — loop returns inside.
  throw new Error("redirect-loop");
}

async function readBodyCapped(
  res: Response,
): Promise<{ buf: Buffer; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) {
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    return { buf, truncated: buf.byteLength > MAX_BYTES };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      return { buf: Buffer.alloc(0), truncated: true };
    }
    chunks.push(value);
  }
  return { buf: Buffer.concat(chunks.map((c) => Buffer.from(c))), truncated: false };
}

function tryParseJson(buf: Buffer): unknown | null {
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return null;
  }
}

/** Resolve a candidate against the page URL, dropping anything we can't fetch. */
function resolveCandidate(raw: string, pageUrl: string): string | null {
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

function extractCandidatesFromHtml(html: string, pageUrl: string): string[] {
  const found = new Set<string>();
  HTML_LOTTIE_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = HTML_LOTTIE_RE.exec(html)); ) {
    const raw = m[1] ?? m[2] ?? m[3];
    if (!raw) continue;
    const abs = resolveCandidate(raw, pageUrl);
    if (abs) found.add(abs);
  }
  return Array.from(found);
}

function extractInlineLottieBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  INLINE_JSON_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = INLINE_JSON_RE.exec(html)); ) {
    const body = (m[1] ?? "").trim();
    if (!body) continue;
    if (!/"layers"\s*:/.test(body) || !/"fr"\s*:/.test(body)) continue;
    try {
      const parsed = JSON.parse(body);
      if (looksLikeLottie(parsed)) out.push(parsed);
    } catch {
      // skip
    }
  }
  return out;
}

/**
 * Top-level entry. Fetches `url`, then either returns the URL itself as the
 * lone asset (if it's directly a Lottie / .lottie / json) or scans the HTML
 * for nested asset references and validates the most-likely candidates.
 */
export async function scrapeUrl(url: string): Promise<ScrapedAsset[]> {
  if (!isHttpUrl(url)) {
    throw new Error("URL must start with http:// or https://");
  }

  const { res, finalUrl } = await fetchFollowingRedirects(url, "GET");
  if (!res.ok) {
    throw new Error(`fetch-failed: ${res.status} ${res.statusText}`);
  }

  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  const lowerUrl = finalUrl.toLowerCase();

  // Direct Lottie JSON: validate and return as a single asset.
  if (ct.includes("application/json") || ct.includes("text/json")) {
    const { buf, truncated } = await readBodyCapped(res);
    if (truncated) {
      throw new Error("body-too-large (>5MB)");
    }
    const parsed = tryParseJson(buf);
    if (parsed && looksLikeLottie(parsed)) {
      return [
        {
          url: finalUrl,
          filename: inferFilename(finalUrl, "asset.json"),
          size_bytes: buf.byteLength,
          content_type: ct || "application/json",
          preview: parsed,
        },
      ];
    }
    // Valid JSON but not Lottie → no assets.
    return [];
  }

  // Direct .lottie bundle (or .json by extension if server lied about ct).
  if (
    ct.includes("application/zip") ||
    ct.includes("octet-stream") ||
    lowerUrl.endsWith(".lottie")
  ) {
    const { buf, truncated } = await readBodyCapped(res);
    if (truncated) {
      throw new Error("body-too-large (>5MB)");
    }
    return [
      {
        url: finalUrl,
        filename: inferFilename(finalUrl, "asset.lottie"),
        size_bytes: buf.byteLength,
        content_type: ct || "application/zip",
        // No preview — caller can unpack via pack.unpackDotLottie.
      },
    ];
  }

  // HTML: scrape for embedded Lottie references.
  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    const { buf, truncated } = await readBodyCapped(res);
    if (truncated) {
      throw new Error("page-too-large (>5MB)");
    }
    const html = buf.toString("utf8");
    const out: ScrapedAsset[] = [];

    // Inline JSON blocks first — already-parsed, no extra fetch.
    const inline = extractInlineLottieBlocks(html);
    inline.forEach((parsed, i) => {
      const body = JSON.stringify(parsed);
      out.push({
        url: `${finalUrl}#inline-${i}`,
        filename: `inline-${i}.json`,
        size_bytes: Buffer.byteLength(body, "utf8"),
        content_type: "application/json",
        preview: parsed,
      });
    });

    const candidates = extractCandidatesFromHtml(html, finalUrl);
    // HEAD each candidate to filter obvious non-Lottie noise.
    const probes = await Promise.all(
      candidates.map(async (cu) => {
        try {
          const probe = await fetchFollowingRedirects(cu, "HEAD");
          const pct = (probe.res.headers.get("content-type") ?? "").toLowerCase();
          const lenHdr = probe.res.headers.get("content-length");
          const size = lenHdr ? Number.parseInt(lenHdr, 10) : null;
          const fallbackCt = extInferContentType(cu);
          // Skip ones that obviously aren't lottie-shaped.
          if (
            pct &&
            !pct.includes("json") &&
            !pct.includes("zip") &&
            !pct.includes("octet-stream") &&
            !pct.includes("text/plain")
          ) {
            return null;
          }
          return {
            url: probe.finalUrl,
            filename: inferFilename(probe.finalUrl, "asset.json"),
            size_bytes: Number.isFinite(size as number) ? (size as number) : null,
            content_type: pct || fallbackCt,
          } satisfies ScrapedAsset;
        } catch {
          return null;
        }
      }),
    );
    const survivors = probes.filter((p): p is ScrapedAsset => p !== null);

    // For the top N, GET + try-parse to populate preview.
    const toParse = survivors.slice(0, MAX_PARSE_CANDIDATES);
    await Promise.all(
      toParse.map(async (asset) => {
        try {
          const { res: gres, finalUrl: gfinal } = await fetchFollowingRedirects(
            asset.url,
            "GET",
          );
          if (!gres.ok) return;
          const { buf, truncated } = await readBodyCapped(gres);
          if (truncated) return;
          asset.url = gfinal;
          asset.size_bytes = buf.byteLength;
          if (asset.content_type.includes("json") || gfinal.toLowerCase().endsWith(".json")) {
            const parsed = tryParseJson(buf);
            if (parsed && looksLikeLottie(parsed)) {
              asset.preview = parsed;
            }
          }
          // .lottie files: leave preview undefined; the save endpoint will unpack.
        } catch {
          // Best-effort.
        }
      }),
    );

    out.push(...survivors);
    return out;
  }

  // Fallback: try to interpret by extension only.
  if (lowerUrl.endsWith(".json") || lowerUrl.endsWith(".lottie")) {
    const { buf, truncated } = await readBodyCapped(res);
    if (truncated) throw new Error("body-too-large (>5MB)");
    const isJson = lowerUrl.endsWith(".json");
    if (isJson) {
      const parsed = tryParseJson(buf);
      if (parsed && looksLikeLottie(parsed)) {
        return [
          {
            url: finalUrl,
            filename: inferFilename(finalUrl, "asset.json"),
            size_bytes: buf.byteLength,
            content_type: "application/json",
            preview: parsed,
          },
        ];
      }
      return [];
    }
    return [
      {
        url: finalUrl,
        filename: inferFilename(finalUrl, "asset.lottie"),
        size_bytes: buf.byteLength,
        content_type: "application/zip",
      },
    ];
  }

  return [];
}
