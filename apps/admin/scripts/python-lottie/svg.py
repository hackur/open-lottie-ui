#!/usr/bin/env python3
"""
Convert SVG (read from stdin as bytes) into Lottie JSON (printed to stdout).

Spawned as a separate process by `apps/admin/lib/python-lottie.ts`.
The python-lottie package is AGPL-3.0; we keep it process-isolated so the
host Next.js app does not link or bundle it (see ADR-008, docs/research/16-licenses.md).

Usage:
    cat foo.svg | python3 svg.py

Errors are emitted on stderr; the process exits non-zero on failure so the
caller can surface a 5xx with the captured stderr.
"""
from __future__ import annotations

import io
import json
import sys

try:
    from lottie.parsers.svg import parse_svg_file
except Exception as exc:  # pragma: no cover - import failure surfaced to host
    sys.stderr.write(f"python-lottie import failed: {exc}\n")
    sys.exit(2)


def main() -> int:
    raw = sys.stdin.buffer.read()
    if not raw:
        sys.stderr.write("svg.py: empty stdin\n")
        return 1
    try:
        anim = parse_svg_file(io.BytesIO(raw))
    except Exception as exc:
        sys.stderr.write(f"svg.py: parse failed: {exc}\n")
        return 1
    sys.stdout.write(json.dumps(anim.to_dict()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
