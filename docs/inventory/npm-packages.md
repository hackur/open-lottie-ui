# Inventory — npm packages

Versions are illustrative; pin in `package.json` at scaffold time.

## Core framework

| Package | Role | License | Notes |
|---|---|---|---|
| `next` | App framework | MIT | App Router, Node runtime everywhere. |
| `react`, `react-dom` | UI | MIT | v19. |
| `typescript` | Lang | Apache-2.0 | strict mode. |
| `tailwindcss` | CSS | MIT | v4 with `@tailwindcss/postcss`. |
| `@tailwindcss/typography` | Prose plugin | MIT | for review notes. |
| `clsx` | classnames | MIT | — |
| `tailwind-merge` | classname merge | MIT | required by shadcn. |

## UI primitives

| Package | Role | License |
|---|---|---|
| `@radix-ui/react-*` | accessible primitives | MIT |
| `lucide-react` | icons | ISC |
| `sonner` | toasts | MIT |
| `vaul` | drawer (optional) | MIT |
| `@tanstack/react-table` | data grid | MIT |
| `cmdk` | command palette | MIT |
| `react-hook-form` | forms | MIT |
| `zod` | schemas / form validation | MIT |
| `@hookform/resolvers` | hook-form ↔ zod glue | MIT |

shadcn/ui components are *copied into* `components/ui/`, not added as a runtime dep. Generated via `pnpm dlx shadcn-ui@latest add <name>`.

## State & data

| Package | Role | License |
|---|---|---|
| `zustand` | small client state | MIT |
| `@tanstack/react-query` | client-side caching | MIT |
| `nanoid` | id generator | MIT |
| `date-fns` | dates | MIT |

## Lottie players

| Package | Role | License |
|---|---|---|
| `lottie-web` | reference renderer (used in headless render too) | MIT |
| `lottie-react` | React wrapper for lottie-web | MIT |
| `@lottiefiles/dotlottie-web` | modern player core | MIT |
| `@lottiefiles/dotlottie-react` | React wrapper for dotlottie-web | MIT |

## Lottie tooling

| Package | Role | License |
|---|---|---|
| `@lottiefiles/dotlottie-js` | read/write `.lottie` containers | MIT |
| `ajv` | JSON Schema validator (for lottie-spec) | MIT |
| `ajv-formats` | extra ajv formats | MIT |
| `svg-to-lottie` (`stepancar/svg-to-lottie`) | SVG → Lottie scaffolding | MIT |

## Headless rendering / image diff

| Package | Role | License |
|---|---|---|
| `puppeteer` | headless Chromium | Apache-2.0 |
| `puppeteer-lottie` | Lottie → frames via puppeteer | MIT |
| `sharp` | image resize / convert | Apache-2.0 |
| `resvg-js` | SVG → PNG (faster fallback) | MPL-2.0 |
| `pixelmatch` | per-pixel diff | ISC |
| `pngjs` | PNG decode for pixelmatch | MIT |
| `odiff-bin` | fast native diff for large images | MIT (wrapper) |

## Process / IO

| Package | Role | License |
|---|---|---|
| `execa` | nicer child_process wrapper (optional) | MIT |
| `chokidar` | watch library/ for changes | MIT |
| `fs-extra` | nicer fs (optional) | MIT |
| `fast-glob` | glob | MIT |

## Dev tooling

| Package | Role | License |
|---|---|---|
| `eslint` + `eslint-config-next` | lint | MIT |
| `prettier` | format | MIT |
| `vitest` | unit tests | MIT |
| `@playwright/test` | e2e (UI flows) | Apache-2.0 |

## Why these and not others

- **`puppeteer` over `playwright`** for rendering: smaller surface, the existing `puppeteer-lottie` library is built on it. Playwright stays for our own e2e tests.
- **`@tanstack/react-table` over `react-data-grid`**: smaller, headless, MIT, fits shadcn aesthetic.
- **No `next-auth`** — no auth in v1.
- **No tRPC** — server actions cover our needs; one less abstraction.
- **No Storybook** — the app *is* the storybook for our components.

## Bundle size budget (rough)

| Bundle | Target |
|--------|--------|
| Initial route load | < 250 KB JS gz |
| With dotlottie-web on detail pages | < 1.0 MB gz (dominated by WASM) |
| Library grid (cached) | < 350 KB gz |

Tracked with `next build --analyze`.

## Sources

- [Vercel — Next.js & shadcn/ui dashboard template](https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard)
- [shadcn/ui docs](https://ui.shadcn.com)
- License/version checks via each package's npm page.
