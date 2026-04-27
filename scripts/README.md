# scripts/

Shell utilities used during development and CI. None of these are required for the application to run; they're for humans.

| Script | Purpose |
|--------|---------|
| `detect-tools.sh` | Probe the host for the CLI tools open-lottie-ui knows about. The same logic ships in the Node `lib/claude/probe.ts` for runtime detection. |

## Add a script

1. Drop it in this directory.
2. `chmod +x your-script.sh` (or `.ts` if it's a tsx-runnable script).
3. Add a row to the table above.
4. PR.

## Conventions

- Bash scripts: start with `#!/usr/bin/env bash` and `set -u`. Use `set -e` only if the script is non-interactive and you've thought through the failure cases.
- Don't `cd` into directories — use absolute paths or work from the user's CWD.
- Don't read or modify files outside the project root.
