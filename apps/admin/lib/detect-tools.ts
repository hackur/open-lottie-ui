import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type ToolStatus = { name: string; found: boolean; version?: string };

const TOOLS: Array<{ name: string; cmd: string; args: string[] }> = [
  { name: "claude", cmd: "claude", args: ["--version"] },
  { name: "ffmpeg", cmd: "ffmpeg", args: ["-version"] },
  { name: "python3", cmd: "python3", args: ["--version"] },
  { name: "glaxnimate", cmd: "glaxnimate", args: ["--version"] },
];

export async function detectTools(): Promise<ToolStatus[]> {
  return Promise.all(
    TOOLS.map(async ({ name, cmd, args }) => {
      try {
        const { stdout, stderr } = await exec(cmd, args, { timeout: 2000 });
        const out = (stdout || stderr || "").trim().split("\n")[0];
        return { name, found: true, version: out };
      } catch {
        return { name, found: false };
      }
    }),
  );
}
