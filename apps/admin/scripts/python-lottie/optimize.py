#!/usr/bin/env python3
"""
Optimize a Lottie JSON document.

Reads JSON from stdin, runs python-lottie's `heavy_strip` pass (the same
optimization `lottie_convert.py -O 2` applies — float rounding, drop unused
transform identity props, strip `ind`/`ix`/`nm`/`mn`), and prints a JSON
envelope of the form:

    {"optimized": <lottie>, "before_bytes": N, "after_bytes": M}

Spawned as a separate process by `apps/admin/lib/python-lottie.ts`.
python-lottie is AGPL-3.0 — we always shell out, never link.
"""
from __future__ import annotations

import json
import sys

try:
    from lottie.objects.animation import Animation
    from lottie.utils.stripper import heavy_strip
except Exception as exc:  # pragma: no cover
    sys.stderr.write(f"python-lottie import failed: {exc}\n")
    sys.exit(2)


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        sys.stderr.write("optimize.py: empty stdin\n")
        return 1
    try:
        before = json.loads(raw)
    except Exception as exc:
        sys.stderr.write(f"optimize.py: input is not JSON: {exc}\n")
        return 1
    try:
        anim = Animation.load(before)
        heavy_strip(anim)
        optimized = anim.to_dict()
    except Exception as exc:
        sys.stderr.write(f"optimize.py: optimize failed: {exc}\n")
        return 1

    before_bytes = len(json.dumps(before).encode("utf-8"))
    after_bytes = len(json.dumps(optimized).encode("utf-8"))
    sys.stdout.write(
        json.dumps(
            {
                "optimized": optimized,
                "before_bytes": before_bytes,
                "after_bytes": after_bytes,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
