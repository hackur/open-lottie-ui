import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { data, validator } from "@open-lottie/lottie-tools";
import {
  convertSvgToLottie,
  PythonLottieError,
} from "@/lib/python-lottie";
import { requireFlag } from "@/lib/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/import/svg
 *
 * Accepts an SVG via either:
 *   - `multipart/form-data` with a single `file` field, or
 *   - a raw body with `content-type: image/svg+xml` (or `application/svg+xml`).
 *
 * Hands the SVG to python-lottie (separate process), validates the resulting
 * Lottie, and creates a Tier-1 generation pending review.
 */
export async function POST(req: Request): Promise<Response> {
  const blocked = await requireFlag("enable_python_lottie");
  if (blocked) return blocked;

  const ct = req.headers.get("content-type") || "";

  let svgBuffer: Buffer | null = null;
  let filename = "imported.svg";

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "multipart upload missing `file` field" },
          { status: 400 },
        );
      }
      filename = file.name || filename;
      svgBuffer = Buffer.from(await file.arrayBuffer());
    } else if (ct.includes("svg") || ct.includes("text/xml") || ct.includes("application/xml") || ct.includes("text/plain")) {
      const ab = await req.arrayBuffer();
      svgBuffer = Buffer.from(ab);
    } else {
      return NextResponse.json(
        { error: `Unsupported content-type: ${ct || "(empty)"}. Use multipart/form-data or image/svg+xml.` },
        { status: 415 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read body: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  if (!svgBuffer || svgBuffer.length === 0) {
    return NextResponse.json({ error: "Empty SVG body" }, { status: 400 });
  }

  // Sanity-check: should at least look like SVG.
  const head = svgBuffer.slice(0, 512).toString("utf8");
  if (!/<svg[\s>]/i.test(head)) {
    return NextResponse.json(
      { error: "Body does not look like SVG (no <svg> tag found in first 512 bytes)" },
      { status: 400 },
    );
  }

  let animation: unknown;
  try {
    animation = await convertSvgToLottie(svgBuffer);
  } catch (e) {
    if (e instanceof PythonLottieError) {
      const status = e.code === "missing-python" || e.code === "missing-module" ? 503 : 500;
      return NextResponse.json({ error: e.message, code: e.code, stderr: e.stderr }, { status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const validation = validator.validate(animation);

  const promptSummary = `Import: ${filename}`;
  const gen = await data.createGeneration({
    prompt_summary: promptSummary,
    tier: 1,
    template_id: null,
    model: "python-lottie:svg",
    base_id: null,
    prompt_markdown: importPromptMd({ filename, bytes: svgBuffer.length }),
  });

  await data.writeGenerationVersion(gen.id, 1, animation);
  const entry = await data.getGeneration(gen.id);
  await fs.copyFile(
    path.join(entry.dir, "v1.json"),
    path.join(entry.dir, "final.json"),
  );

  await data.updateGenerationMeta(gen.id, {
    final_version: 1,
    versions: [{ v: 1, validated: validation.valid, errors_count: validation.errors.length }],
    validation: { ok: validation.valid, errors: validation.errors as unknown[] },
    cost_usd: 0,
    num_turns: 0,
  });
  await data.setGenerationStatus(gen.id, "pending-review");

  await data.appendDecision({
    gen: gen.id,
    action: "created",
    tier: 1,
    plugin: "python-lottie:svg",
    filename,
    bytes_in: svgBuffer.length,
  });
  await data.appendDecision({
    gen: gen.id,
    action: "validated",
    ok: validation.valid,
    errors: validation.errors.length,
  });

  return NextResponse.json({ id: gen.id });
}

function importPromptMd(opts: { filename: string; bytes: number }): string {
  return [
    "# SVG import",
    "",
    `**Plugin**: \`python-lottie\` (svg → lottie, AGPL-3.0, run as separate process)`,
    `**File**: \`${opts.filename}\``,
    `**Size**: ${opts.bytes} bytes`,
    "",
    "## Notes",
    "- Deterministic conversion via `lottie.parsers.svg.parse_svg_file`.",
    "- No LLM was involved.",
    "",
  ].join("\n");
}
