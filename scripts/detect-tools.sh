#!/usr/bin/env bash
# Probe the host for the CLI tools open-lottie-ui knows about.
# Used at boot via Node's child_process; this shell version is for human debugging.
#
# Usage: ./scripts/detect-tools.sh

set -u

probe() {
  local name="$1"
  local cmd="$2"
  shift 2
  local fallbacks=("$@")
  local resolved=""
  if command -v "$cmd" >/dev/null 2>&1; then
    resolved="$cmd"
  else
    for f in "${fallbacks[@]}"; do
      if [ -x "$f" ]; then
        resolved="$f"
        break
      fi
    done
  fi
  if [ -n "$resolved" ]; then
    local v
    v=$("$resolved" --version 2>&1 | head -n 1 || true)
    printf '✓ %-22s %s\n' "$name" "${v:-(version unknown)}"
  else
    printf '✗ %-22s (not found)\n' "$name"
  fi
}

probe_python_pkg() {
  local pkg="$1"
  if python3 -c "import $pkg" >/dev/null 2>&1; then
    local v
    v=$(python3 -c "import $pkg, sys; sys.stdout.write(getattr($pkg, '__version__', '?'))" 2>/dev/null)
    printf '✓ %-22s %s\n' "py:$pkg" "$v"
  else
    printf '✗ %-22s (not importable)\n' "py:$pkg"
  fi
}

# File-only check: report present if any of the supplied paths exists.
# Used for binaries that pop a GUI for any invocation (e.g. inlottie 0.1.9-g).
probe_file() {
  local name="$1"
  shift
  for f in "$@"; do
    if [ -x "$f" ] || [ -f "$f" ]; then
      printf '✓ %-22s %s\n' "$name" "installed at $f"
      return 0
    fi
  done
  printf '✗ %-22s (not found)\n' "$name"
  return 1
}

echo "── Required ─────────────────────────────────────────────────"
probe "node"          node
probe "pnpm"          pnpm
probe "claude"        claude

echo ""
echo "── Recommended ──────────────────────────────────────────────"
probe "ffmpeg"        ffmpeg

echo ""
echo "── Optional plugin deps ─────────────────────────────────────"
probe "python3"       python3
probe "glaxnimate"    glaxnimate \
      "/Applications/glaxnimate.app/Contents/MacOS/glaxnimate" \
      "/Applications/Glaxnimate.app/Contents/MacOS/glaxnimate"
# inlottie is a GUI viewer — file-only check to avoid popping a window.
probe_file "inlottie" \
      "$HOME/.cargo/bin/inlottie"
probe_python_pkg     lottie

echo ""
echo "Done. Missing tools are not fatal; plugins that need them will appear disabled."
echo ""
echo "Install hints:"
echo "  glaxnimate  — no homebrew cask. Download macOS DMG from https://glaxnimate.org/"
echo "  inlottie    — \`cargo install inlottie\` (Rust Lottie renderer; provides \`inlottie\`, \`vello\`, \`blend2d\`)"
echo "  py:lottie   — \`pip3 install --user --break-system-packages lottie\` (python-lottie / AGPL-3.0)"
