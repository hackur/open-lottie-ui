/**
 * Wrapper for the python-lottie plugin (PyPI `lottie`, AGPL-3.0).
 *
 * We NEVER link or bundle python-lottie — it is always invoked as a separate
 * `python3` process, so the AGPL boundary stays at the process level (per
 * ADR-008 and `docs/research/16-licenses.md`).
 *
 * The actual python is in `apps/admin/scripts/python-lottie/{svg,optimize}.py`;
 * data is exchanged via stdin/stdout JSON.
 */
import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolves to `apps/admin/scripts/python-lottie/<name>.py`. */
function scriptPath(name: "svg" | "optimize"): string {
  // __dirname during dev (next swc) → apps/admin/lib; in production build it
  // can be relocated, so we resolve relative to the file URL.
  return path.resolve(__dirname, "..", "scripts", "python-lottie", `${name}.py`);
}

/** Hard cap so a runaway python process can't wedge a request handler. */
const TIMEOUT_MS = 30_000;

class PythonLottieError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "missing-python"
      | "missing-module"
      | "timeout"
      | "non-zero-exit"
      | "bad-output",
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "PythonLottieError";
  }
}

export { PythonLottieError };

type RunResult = {
  stdout: Buffer;
  stderr: string;
};

function runPython(script: string, stdin: Buffer): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn("python3", [script], {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      reject(
        new PythonLottieError(
          `Failed to spawn python3: ${e instanceof Error ? e.message : String(e)}. Is Python 3 installed and on PATH?`,
          "missing-python",
        ),
      );
      return;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: string[] = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk.toString("utf8")));

    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      // ENOENT here = python3 binary not found.
      if (err.code === "ENOENT") {
        reject(
          new PythonLottieError(
            "python3 not found on PATH. Install Python 3 (`brew install python` on macOS) to use this plugin.",
            "missing-python",
          ),
        );
        return;
      }
      reject(
        new PythonLottieError(
          `python3 spawn error: ${err.message}`,
          "non-zero-exit",
        ),
      );
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      const stderr = stderrChunks.join("");
      if (timedOut) {
        reject(
          new PythonLottieError(
            `python-lottie timed out after ${TIMEOUT_MS}ms`,
            "timeout",
            stderr,
          ),
        );
        return;
      }
      if (code === 2 && /import failed/i.test(stderr)) {
        reject(
          new PythonLottieError(
            "python-lottie module not installed. Run `pip3 install lottie` to enable this plugin.",
            "missing-module",
            stderr,
          ),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new PythonLottieError(
            `python-lottie exited ${code}: ${stderr.trim() || "(no stderr)"}`,
            "non-zero-exit",
            stderr,
          ),
        );
        return;
      }
      resolve({ stdout: Buffer.concat(stdoutChunks), stderr });
    });

    child.stdin.on("error", () => {
      /* swallow EPIPE: child died early; close handler will reject. */
    });
    child.stdin.end(stdin);
  });
}

/**
 * Convert an SVG buffer into a Lottie JSON document via python-lottie's
 * `lottie.parsers.svg.parse_svg_file`. Throws `PythonLottieError` on failure.
 */
export async function convertSvgToLottie(svgBuffer: Buffer): Promise<unknown> {
  const { stdout } = await runPython(scriptPath("svg"), svgBuffer);
  const text = stdout.toString("utf8").trim();
  if (!text) {
    throw new PythonLottieError("python-lottie produced empty output", "bad-output");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (e) {
    throw new PythonLottieError(
      `python-lottie returned non-JSON output: ${e instanceof Error ? e.message : String(e)}`,
      "bad-output",
    );
  }
}

export type OptimizeResult = {
  optimized: unknown;
  before_bytes: number;
  after_bytes: number;
};

/**
 * Run python-lottie's `heavy_strip` over a Lottie JSON document. Equivalent to
 * `lottie_convert.py -O 2`. Returns the optimized document plus before/after
 * byte counts so callers can show savings.
 */
export async function optimizeLottie(animation: unknown): Promise<OptimizeResult> {
  const stdinBuf = Buffer.from(JSON.stringify(animation), "utf8");
  const { stdout } = await runPython(scriptPath("optimize"), stdinBuf);
  const text = stdout.toString("utf8").trim();
  if (!text) {
    throw new PythonLottieError("python-lottie produced empty output", "bad-output");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new PythonLottieError(
      `python-lottie returned non-JSON output: ${e instanceof Error ? e.message : String(e)}`,
      "bad-output",
    );
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("optimized" in parsed) ||
    !("before_bytes" in parsed) ||
    !("after_bytes" in parsed)
  ) {
    throw new PythonLottieError(
      "python-lottie optimize output missing expected fields",
      "bad-output",
    );
  }
  const obj = parsed as Record<string, unknown>;
  return {
    optimized: obj.optimized,
    before_bytes: Number(obj.before_bytes),
    after_bytes: Number(obj.after_bytes),
  };
}
