# zetoqqq

Pavel Titov's personal site. Astro, no framework components, no CSS
framework.

## Commands

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview the build |
| `npm run astro` | Run Astro CLI commands (e.g. `astro check`) |
| `npm run test:unit` | Unit tests (`node --test`) |
| `npm run test:e2e` | Browser tests (Playwright) |
| `npm test` | Both |

## How the visual system works

`src/styles/tokens.css` holds every colour, type step and spacing value
as a CSS custom property, declared once for light and twice for dark
(OS preference and explicit toggle). **It is the only file allowed to
contain a literal colour** — `npm run test:unit` fails the build
otherwise. That rule is what lets a new page inherit the system without
being re-audited for theme support.

`src/styles/global.css` styles bare semantic elements against those
tokens, so Markdown renders correctly with no component work.

Adding a project means adding a Markdown file to
`src/content/projects/`. Adding a post means adding one to
`src/content/blog/` — the first post you commit makes the Writing
section and the nav item appear on their own.

Design notes: `docs/superpowers/specs/2026-09-22-personal-homepage-design.md`
