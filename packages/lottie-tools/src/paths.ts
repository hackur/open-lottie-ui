import path from "node:path";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");

const root = process.env.OPEN_LOTTIE_ROOT
  ? path.resolve(process.env.OPEN_LOTTIE_ROOT)
  : REPO_ROOT;

export const PATHS = {
  root,
  library: path.join(root, "library"),
  generations: path.join(root, "generations"),
  decisions: path.join(root, "decisions.jsonl"),
  seedLibrary: path.join(root, "seed-library"),
  prompts: path.join(root, "prompts"),
  promptTemplates: path.join(root, "prompts", "templates"),
  starterPrompts: path.join(root, "prompts", "starter-prompts.json"),
  systemPromptDefault: path.join(root, "prompts", "system", "default.md"),
  cache: path.join(root, ".cache"),
  config: path.join(root, ".config"),
  settings: path.join(root, ".config", "settings.json"),
  pluginsDir: path.join(root, "plugins"),
} as const;
