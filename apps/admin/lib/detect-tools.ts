import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

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
};

const TOOLS: ToolDef[] = [
  { name: "claude", cmd: "claude", args: ["--version"] },
  { name: "ffmpeg", cmd: "ffmpeg", args: ["-version"] },
  { name: "python3", cmd: "python3", args: ["--version"] },
  { name: "inlottie", cmd: "inlottie", args: ["--version"] },
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
    TOOLS.map(async ({ name, cmd, args, fallbacks = [] }) => {
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
