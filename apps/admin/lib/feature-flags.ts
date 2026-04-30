import "server-only";
import { NextResponse } from "next/server";
import { loadSettings, type AppSettings } from "./settings.ts";

/**
 * One-line ergonomic guards used by API route handlers + UI server
 * components. All flags default off so M1 ships only the web UI and the
 * LLM-driven generation paths; opt in to external tools from /settings.
 */

export type FeatureFlag =
  | "enable_inlottie"
  | "enable_glaxnimate"
  | "enable_python_lottie"
  | "enable_ffmpeg"
  | "enable_url_scrape";

export type FlagInfo = {
  flag: FeatureFlag;
  title: string;
  description: string;
};

export const FLAG_CATALOG: FlagInfo[] = [
  {
    flag: "enable_inlottie",
    title: "inlottie (Rust renderer)",
    description:
      "Enable headless thumbnail generation and visual diff via the inlottie binary. v0.1.9 is GUI-only on macOS — leave off unless you have a headless build.",
  },
  {
    flag: "enable_glaxnimate",
    title: "Glaxnimate edit-in plugin",
    description:
      "Show an 'Edit in Glaxnimate' button on library detail pages. Requires Glaxnimate.app installed locally.",
  },
  {
    flag: "enable_python_lottie",
    title: "python-lottie (SVG import + optimize)",
    description:
      "SVG → Lottie import and library optimization via the python-lottie subprocess. Requires `pip install lottie`. AGPL-3.0 — separate-process boundary, never linked.",
  },
  {
    flag: "enable_ffmpeg",
    title: "ffmpeg (video import + export)",
    description:
      "Lottie → transparent video export (MOV/WebM/GIF) and video → Lottie import. Requires the ffmpeg binary on PATH.",
  },
  {
    flag: "enable_url_scrape",
    title: "URL-scrape import",
    description:
      "Allow importing Lottie assets discovered on a public web page. Off by default to keep imports user-initiated and license-tracked.",
  },
];

/** Returns a snapshot of all flags. */
export async function getFlags(): Promise<Pick<AppSettings, FeatureFlag>> {
  const settings = await loadSettings();
  return {
    enable_inlottie: settings.enable_inlottie,
    enable_glaxnimate: settings.enable_glaxnimate,
    enable_python_lottie: settings.enable_python_lottie,
    enable_ffmpeg: settings.enable_ffmpeg,
    enable_url_scrape: settings.enable_url_scrape,
  };
}

/** True if a single flag is on. */
export async function isEnabled(flag: FeatureFlag): Promise<boolean> {
  const flags = await getFlags();
  return Boolean(flags[flag]);
}

/**
 * Convenience for route handlers: returns null if the flag is on, or a 503
 * NextResponse if it's off. Usage:
 *
 *   const blocked = await requireFlag("enable_ffmpeg");
 *   if (blocked) return blocked;
 */
export async function requireFlag(flag: FeatureFlag): Promise<Response | null> {
  if (await isEnabled(flag)) return null;
  const info = FLAG_CATALOG.find((f) => f.flag === flag);
  return NextResponse.json(
    {
      error: `Feature disabled. Enable ${flag} in /settings to use this endpoint.`,
      flag,
      title: info?.title,
      description: info?.description,
    },
    { status: 503 },
  );
}
