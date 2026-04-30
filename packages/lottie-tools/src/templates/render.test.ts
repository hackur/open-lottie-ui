/**
 * Smoke test: load each shipped template, validate sample params, render, and
 * sanity-check the resulting Lottie. Run with:
 *
 *   pnpm --filter @open-lottie/lottie-tools test
 *
 * (uses node:test + --experimental-strip-types per package.json scripts)
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { loadTemplate, listTemplates } from "./load.ts";
import { validateParams } from "./validate.ts";
import { render } from "./render.ts";
import type { TemplateParams } from "./types.ts";

/** Reasonable default params per template id, derived from each schema. */
const SAMPLE_PARAMS: Record<string, TemplateParams> = {
  "color-pulse": {
    color_a: [0.13, 0.74, 0.91, 1],
    color_b: [0.93, 0.44, 0.13, 1],
    duration_frames: 60,
    size: 200,
  },
  "fade-in": {
    duration_frames: 30,
    size: 200,
    color: [0.078, 0.722, 0.651, 1],
    // easing defaults to "easeOut" via ajv useDefaults.
  },
  "scale-bounce": {
    duration_frames: 48,
    overshoot_pct: 110,
    size: 200,
    color: [0.078, 0.722, 0.651, 1],
  },
  "draw-on-path": {
    path_d: "M0 0 L100 0 L100 100 L0 100 Z",
    duration_frames: 60,
    stroke_width: 4,
    stroke_color: [0.078, 0.722, 0.651, 1],
    size: 200,
    loop: false,
  },
  "slide-in": {
    from: [-100, 100],
    to: [100, 100],
    duration_frames: 30,
    size: 200,
    shape: "circle",
    color: [0.078, 0.722, 0.651, 1],
    // easing defaults to "easeOutCubic".
  },
};

const EXPECTED_TEMPLATE_IDS = [
  "color-pulse",
  "draw-on-path",
  "fade-in",
  "scale-bounce",
  "slide-in",
];

test("listTemplates returns all 5 shipped templates", async () => {
  const ids = await listTemplates();
  for (const id of EXPECTED_TEMPLATE_IDS) {
    assert.ok(ids.includes(id), `expected listTemplates() to include ${id}, got ${ids.join(", ")}`);
  }
});

for (const id of EXPECTED_TEMPLATE_IDS) {
  test(`render(${id}) produces a valid-looking Lottie`, async () => {
    const tpl = await loadTemplate(id);
    const params = { ...SAMPLE_PARAMS[id]! };

    // Validate params (this also fills in schema defaults via ajv useDefaults).
    const v = validateParams(tpl, params);
    assert.equal(v.valid, true, `params for ${id} failed validation: ${JSON.stringify(v.errors)}`);

    const { lottie } = render(tpl, params);

    // Required top-level Lottie fields.
    for (const k of ["v", "fr", "ip", "op", "w", "h", "layers"] as const) {
      assert.ok(k in lottie, `${id}: lottie missing top-level field ${k}`);
    }
    assert.equal(typeof lottie.v, "string", `${id}: v should be a string`);
    assert.equal(typeof lottie.fr, "number", `${id}: fr should be a number`);
    assert.equal(typeof lottie.ip, "number", `${id}: ip should be a number`);
    assert.equal(typeof lottie.op, "number", `${id}: op should be a number`);
    assert.equal(typeof lottie.w, "number", `${id}: w should be a number`);
    assert.equal(typeof lottie.h, "number", `${id}: h should be a number`);

    // Layers present.
    assert.ok(Array.isArray(lottie.layers), `${id}: layers must be an array`);
    const layers = lottie.layers as unknown[];
    assert.ok(layers.length >= 1, `${id}: expected at least 1 layer, got ${layers.length}`);

    // No unsubstituted placeholders left in the JSON output.
    const json = JSON.stringify(lottie);
    assert.ok(
      !/\{\{[^}]+\}\}/.test(json),
      `${id}: rendered Lottie still contains unsubstituted placeholders`,
    );

    // op must equal duration_frames param (each template wires this).
    assert.equal(
      lottie.op,
      params.duration_frames,
      `${id}: op (${lottie.op}) does not match params.duration_frames (${params.duration_frames})`,
    );
  });
}

test("render() throws on missing required param", async () => {
  const tpl = await loadTemplate("fade-in");
  assert.throws(
    () => render(tpl, { duration_frames: 30, size: 200 } as TemplateParams),
    /missing required param/,
  );
});

test("render() resolves array indexing (foo.0)", async () => {
  const tpl = await loadTemplate("slide-in");
  const params = { ...SAMPLE_PARAMS["slide-in"]! };
  const v = validateParams(tpl, params);
  assert.equal(v.valid, true);
  const { lottie } = render(tpl, params);
  // Walk down to the position keyframe to confirm from.0/from.1 resolved to numbers.
  const layer0 = (lottie.layers as Array<Record<string, unknown>>)[0]!;
  const ks = layer0.ks as Record<string, unknown>;
  const p = ks.p as Record<string, unknown>;
  const k = p.k as Array<Record<string, unknown>>;
  const startKeyframe = k[0]!;
  const s = startKeyframe.s as unknown[];
  assert.equal(s[0], -100);
  assert.equal(s[1], 100);
});
