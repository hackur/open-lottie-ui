#!/usr/bin/env python3
"""
Populate the local open-lottie-ui dev server with realistic sample data
exercising every M1 feature: Tier-1 generations across all 11 templates,
remixes (for visual diff), approvals, rejections, optimizes, video import,
and pre-exported video files. Idempotent enough to re-run.

Usage:
  python3 scripts/seed-samples.py           # full populate
  python3 scripts/seed-samples.py --dry-run # just print plan

Requires the dev server running at http://127.0.0.1:3000.
"""
from __future__ import annotations

import json
import os
import pathlib
import sys
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:3000"
DRY = "--dry-run" in sys.argv
SAMPLES_DIR = pathlib.Path("/Volumes/JS-DEV/open-lottie-ui/samples")
SAMPLES_DIR.mkdir(exist_ok=True)


def log(msg: str) -> None:
    print(f"[seed] {msg}", flush=True)


def post(path: str, body: dict) -> dict:
    if DRY:
        return {"id": "DRY_RUN_" + path.replace("/", "_")}
    req = urllib.request.Request(
        BASE + path,
        method="POST",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json"},
    )
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()[:300]
        raise RuntimeError(f"HTTP {e.code} on {path}: {body_text}") from None


def get_bin(path: str) -> bytes:
    if DRY:
        return b""
    return urllib.request.urlopen(BASE + path, timeout=60).read()


def post_form(path: str, file_path: pathlib.Path, content_type: str = "application/octet-stream") -> dict:
    if DRY:
        return {"id": "DRY_RUN_FORM"}
    boundary = "----boundary" + str(time.time_ns())
    fname = file_path.name
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode() + file_path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        BASE + path,
        method="POST",
        data=body,
        headers={"content-type": f"multipart/form-data; boundary={boundary}"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


# ---- Tier-1 sample params per template ----

TIER1_SAMPLES = {
    "color-pulse":     {"duration_frames": 60, "size": 200, "color_a": [0.13, 0.74, 0.91, 1], "color_b": [0.13, 0.74, 0.91, 0.2]},
    "fade-in":         {"duration_frames": 30, "size": 200, "color": [0.95, 0.5, 0.5, 1], "easing": "easeOut"},
    "scale-bounce":    {"duration_frames": 48, "size": 200, "color": [0.5, 0.7, 0.95, 1], "overshoot_pct": 115},
    "draw-on-path":    {"duration_frames": 60, "size": 200, "stroke_color": [0.13, 0.74, 0.91, 1], "stroke_width": 4, "loop": False, "path_d": "M0 0 L100 100"},
    "slide-in":        {"duration_frames": 30, "size": 200, "color": [0.95, 0.5, 0.5, 1], "from": [-200, 0], "to": [0, 0], "shape": "rect", "easing": "easeOutCubic"},
    "rotate-spin":     {"duration_frames": 60, "size": 200, "color": [0.078, 0.722, 0.651, 1], "stroke_width": 8, "clockwise": True},
    "shake":           {"duration_frames": 24, "size": 200, "color": [0.85, 0.18, 0.18, 1], "amplitude_deg": 15, "cycles": 4},
    "heartbeat":       {"duration_frames": 36, "size": 200, "color": [0.95, 0.27, 0.27, 1], "peak_scale": 130},
    "confetti-burst":  {"duration_frames": 45, "size": 240, "count": 8, "colors": [[0.078, 0.722, 0.651, 1], [0.95, 0.55, 0.18, 1], [0.92, 0.32, 0.6, 1], [0.95, 0.85, 0.2, 1]]},
    "typing-dots":     {"duration_frames": 60, "size": 200, "color": [0.4, 0.4, 0.4, 1], "dot_count": 3},
    "progress-bar":    {"duration_frames": 60, "size": 200, "track_color": [0.4, 0.4, 0.4, 0.3], "fill_color": [0.13, 0.74, 0.91, 1], "corner_radius": 4},
}


def main() -> int:
    if DRY:
        log("DRY RUN — no changes will be made")
    log(f"target: {BASE}")
    if not DRY:
        try:
            urllib.request.urlopen(BASE + "/healthz", timeout=3).read()
        except Exception as e:
            log(f"FATAL: dev server not reachable ({e}). Start it with `pnpm dev`.")
            return 1

    state = {
        "tier1_generated": [],
        "approved_to_library": [],
        "rejected": [],
        "remixes": [],
        "imports": [],
        "exports": [],
    }

    # ===== 1. Tier-1: one generation per template =====
    log("=== Tier-1: render every template ===")
    for tid, params in TIER1_SAMPLES.items():
        try:
            res = post("/api/generate", {
                "tier": 1,
                "template_id": tid,
                "params": params,
                "prompt_summary": f"Sample: {tid}",
            })
            state["tier1_generated"].append((tid, res["id"]))
            log(f"  + {tid:18s} → {res['id']}")
        except RuntimeError as e:
            log(f"  ! {tid:18s} FAILED: {e}")

    # ===== 2. Approve 8/11, leave 2 pending, reject 1 =====
    log("=== Approve / reject / leave-pending ===")
    to_approve = state["tier1_generated"][:8]
    to_reject = state["tier1_generated"][8:9]
    to_pending = state["tier1_generated"][9:]

    for tid, gid in to_approve:
        try:
            res = post(f"/api/generate/{gid}/approve", {})
            lib_id = res.get("library_id")
            state["approved_to_library"].append((tid, gid, lib_id))
            log(f"  ✓ approved {tid:18s} → library/{lib_id}")
        except RuntimeError as e:
            log(f"  ! approve failed: {e}")

    for tid, gid in to_reject:
        try:
            post(f"/api/generate/{gid}/reject", {
                "codes": ["wrong-color", "looks-broken"],
                "note": "demo rejection — color drift on primary",
            })
            state["rejected"].append((tid, gid))
            log(f"  ✗ rejected {tid:18s} ({gid})")
        except RuntimeError as e:
            log(f"  ! reject failed: {e}")

    for tid, gid in to_pending:
        log(f"  ⊘ left pending {tid:18s} ({gid}) — visit /review to act on it")

    # ===== 3. Remix: take an approved entry, run a Tier-1 with the same template
    # and `base_id` set so visual diff has something to compare =====
    log("=== Remixes (for visual diff) ===")
    if state["approved_to_library"]:
        # Remix loader-pulse with a different color
        base_lib = next((lib for tid, gid, lib in state["approved_to_library"] if tid == "color-pulse"), None)
        if base_lib:
            res = post("/api/generate", {
                "tier": 1,
                "template_id": "color-pulse",
                "params": {**TIER1_SAMPLES["color-pulse"], "color_a": [0.95, 0.27, 0.27, 1], "color_b": [0.95, 0.27, 0.27, 0.2]},
                "prompt_summary": "Sample remix: color-pulse → red",
                "base_id": base_lib,
            })
            state["remixes"].append(("color-pulse → red", res["id"], base_lib))
            log(f"  + remix color-pulse → {res['id']} (base: {base_lib})")

    # ===== 4. Optimize an existing seed via python-lottie =====
    log("=== python-lottie optimize ===")
    try:
        res = post("/api/library/loader-pulse/optimize", {})
        state["imports"].append(("optimize loader-pulse", res["id"]))
        log(f"  + optimize loader-pulse → generation {res['id']}")
    except RuntimeError as e:
        log(f"  ! optimize failed: {e}")

    # ===== 5. SVG import =====
    log("=== SVG import (red star) ===")
    svg_path = SAMPLES_DIR / "star.svg"
    svg_path.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">'
        '<polygon points="50,5 61,38 95,38 67,58 78,90 50,70 22,90 33,58 5,38 39,38" '
        'fill="#f59e0b" stroke="#92400e" stroke-width="2"/></svg>',
        encoding="utf-8",
    )
    if not DRY:
        try:
            req = urllib.request.Request(
                BASE + "/api/import/svg",
                method="POST",
                data=svg_path.read_bytes(),
                headers={"content-type": "image/svg+xml"},
            )
            res = json.loads(urllib.request.urlopen(req, timeout=30).read())
            state["imports"].append(("svg star.svg", res["id"]))
            log(f"  + svg-import → generation {res['id']}")
        except Exception as e:
            log(f"  ! svg-import failed: {e}")

    # ===== 6. Video → Lottie import (10-frame testsrc gif) =====
    log("=== Video → Lottie import (1s testsrc gif) ===")
    gif_path = SAMPLES_DIR / "testsrc.gif"
    if not DRY:
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=size=200x200:rate=10:duration=1",
                 str(gif_path)],
                check=True, capture_output=True, timeout=30,
            )
        except Exception as e:
            log(f"  ! ffmpeg gif gen failed: {e}")
            gif_path = None

    if gif_path and gif_path.exists():
        try:
            res = post_form("/api/import/video?fps=10&maxFrames=10&width=200", gif_path, "image/gif")
            state["imports"].append(("video testsrc.gif", res["id"]))
            log(f"  + video-import {gif_path.name} → generation {res['id']} ({res.get('frame_count')} frames)")
        except Exception as e:
            log(f"  ! video-import failed: {e}")

    # ===== 7. URL scrape (self-fetch) =====
    log("=== URL scrape (self) ===")
    try:
        # Use the local server's own preview endpoint as a sample asset.
        scan_res = post("/api/import/url/scan", {
            "url": f"{BASE}/api/library/loader-pulse/animation.json",
        })
        candidates = scan_res.get("scanned", scan_res.get("candidates", []))
        log(f"  + scan returned {len(candidates)} candidate(s)")
        # The URL is itself a Lottie JSON, so it should be the single candidate.
        if candidates:
            asset_url = candidates[0].get("candidate", {}).get("url") or candidates[0].get("url")
            if asset_url:
                fetch_res = post("/api/import/url/fetch", {
                    "asset_url": asset_url,
                    "page_url": asset_url,
                    "license_id": "CC0-1.0",
                    "title": "Sample URL import",
                    "tags": ["sample", "url-import"],
                })
                state["imports"].append(("url-import self", fetch_res.get("library_id", "?")))
                log(f"  + url-import → library/{fetch_res.get('library_id')}")
    except RuntimeError as e:
        log(f"  ! url-scrape skipped: {e}")

    # ===== 8. Pre-export video samples =====
    log("=== Pre-export sample videos ===")
    if state["approved_to_library"]:
        first_lib = state["approved_to_library"][0][2]
        for fmt, ext in [("mov-prores", "mov"), ("webm-vp9", "webm"), ("gif", "gif")]:
            target = SAMPLES_DIR / f"{first_lib}.{ext}"
            if not DRY:
                try:
                    bytes_ = get_bin(f"/api/library/{first_lib}/export/video?format={fmt}")
                    target.write_bytes(bytes_)
                    state["exports"].append((fmt, str(target), len(bytes_)))
                    log(f"  + exported {fmt:12s} → {target.name} ({len(bytes_)} bytes)")
                except Exception as e:
                    log(f"  ! export {fmt} failed: {e}")

    # ===== Summary =====
    log("=" * 60)
    log("SUMMARY")
    log(f"  Tier-1 generated:    {len(state['tier1_generated'])}")
    log(f"  Approved → library:  {len(state['approved_to_library'])}")
    log(f"  Rejected:            {len(state['rejected'])}")
    log(f"  Remixes:             {len(state['remixes'])}")
    log(f"  Imports:             {len(state['imports'])}")
    log(f"  Video exports:       {len(state['exports'])}")
    log(f"  Files in samples/:   {len(list(SAMPLES_DIR.iterdir()))}")
    log("")
    log("Browse:")
    log(f"  Library:    {BASE}/library")
    log(f"  Review:     {BASE}/review (3 entries waiting)")
    log(f"  Activity:   {BASE}/activity (decision audit log)")
    log(f"  Settings:   {BASE}/settings (8 plugin manifests + host tools)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
