import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const exec = promisify(execFile);

export type ToolStatus = {
  name: string;
  found: boolean;
  version?: string;
  /** Absolute path of the resolved binary. Plugins use this to spawn it. */
  resolvedPath?: string;
};

type ToolDef = {
  name: string;
  cmd: string;
  args: string[];
  /** Absolute paths to try if `which $cmd` fails — common for macOS .app bundles. */
  fallbacks?: string[];
  /**
   * Skip the spawn-based version probe. Some binaries (notably the bundled
   * `inlottie` v0.1.9-g) open a GUI window for *any* invocation, so spawning
   * on every page load would pop windows over the user's screen. We still
   * report `found: true` if the binary exists at the resolved path; the
   * version string falls back to a fixed label.
   */
  fileOnly?: boolean;
  /** Static label to show when `fileOnly` is true. */
  fileOnlyVersion?: string;
};

const TOOLS: ToolDef[] = [
  { name: "claude", cmd: "claude", args: ["--version"] },
  { name: "ffmpeg", cmd: "ffmpeg", args: ["-version"] },
  { name: "python3", cmd: "python3", args: ["--version"] },
  {
    name: "inlottie",
    cmd: "inlottie",
    args: [],
    fallbacks: [path.join(os.homedir(), ".cargo", "bin", "inlottie")],
    // The shipped 0.1.9-g build is a GUI viewer with no `--version`/`--help`
    // — every spawn pops a femtovg window. Detect via file existence only.
    fileOnly: true,
    fileOnlyVersion: "installed (GUI viewer; no headless export)",
  },
  {
    name: "glaxnimate",
    cmd: "glaxnimate",
    args: ["--version"],
    fallbacks: [
      "/Applications/glaxnimate.app/Contents/MacOS/glaxnimate",
      "/Applications/Glaxnimate.app/Contents/MacOS/glaxnimate",
    ],
  },
];

function whichSync(cmd: string): string | null {
  // Cheap PATH walk — avoids spawning a child just to know if a binary exists.
  const PATH = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of PATH) {
    if (!dir) continue;
    const p = path.join(dir, cmd);
    if (existsSync(p)) return p;
  }
  return null;
}

async function tryProbe(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await exec(cmd, args, { timeout: 2000 });
    return (stdout || stderr || "").trim().split("\n")[0];
  } catch {
    return null;
  }
}

export async function detectTools(): Promise<ToolStatus[]> {
  return Promise.all(
    TOOLS.map(async ({ name, cmd, args, fallbacks = [], fileOnly, fileOnlyVersion }) => {
      // file-only path: never spawn — just locate the binary.
      if (fileOnly) {
        const onPath = whichSync(cmd);
        if (onPath) {
          return {
            name,
            found: true,
            version: fileOnlyVersion ?? "installed",
            resolvedPath: onPath,
          };
        }
        for (const fb of fallbacks) {
          if (existsSync(fb)) {
            return {
              name,
              found: true,
              version: fileOnlyVersion ?? "installed",
              resolvedPath: fb,
            };
          }
        }
        return { name, found: false };
      }

      // Spawn-based probe (most tools).
      const out = await tryProbe(cmd, args);
      if (out !== null) return { name, found: true, version: out, resolvedPath: cmd };
      for (const fb of fallbacks) {
        if (!existsSync(fb)) continue;
        const v = await tryProbe(fb, args);
        if (v !== null) return { name, found: true, version: v, resolvedPath: fb };
      }
      return { name, found: false };
    }),
  );
}

/** Returns the resolved absolute path for a named tool, or null if not found. */
export async function resolveTool(name: string): Promise<string | null> {
  const tools = await detectTools();
  const hit = tools.find((t) => t.name === name && t.found);
  return hit?.resolvedPath ?? null;
}
