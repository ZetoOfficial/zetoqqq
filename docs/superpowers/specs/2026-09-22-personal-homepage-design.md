# Personal homepage — design

Date: 2026-09-22
Status: approved, ready for implementation planning

## Goal

Turn this repository into Pavel Titov's personal homepage: a quiet,
document-like site whose visual system is reusable by pages that do not
exist yet.

The reference is cassidoo.co — a narrow single column, no hero, no
portfolio grid, everything expressed as a list — with its multicolour
link and tag palette removed. Personality comes from typography and
voice, not from colour.

Explicit non-goal: a portfolio landing page. No hero banner, no
call-to-action, no feature cards, no testimonials, no animated
statistics.

## Decisions already made

These were validated against rendered mockups during brainstorming and
are settled.

| Decision | Choice |
|---|---|
| Typographic direction | Mono ledger — monospace throughout |
| Typeface | IBM Plex Mono (400, 600, 400 italic), self-hosted |
| Surface | Light default, dark available, OS-driven with manual override |
| Accent | Ink blue — `#2b5c8a` light, `#7fa8cf` dark |
| Accent usage | Link underlines, active nav item, focus rings only |
| Language | English only, no i18n routing |
| Homepage shape | Dense index: intro, now, projects, writing, elsewhere |
| Ships now | `/`, `/about`, `/projects`, `/projects/[slug]` |
| Ships later | `/blog` — routes built but unlinked until a post exists |

Rejected, with reasons, so they are not relitigated: serif-body and
sans-body directions (less distinctive for a developer's site);
JetBrains Mono, DM Mono, Space Mono (respectively too cold at length,
too fragile in dark mode, too hard to read in paragraphs); single-theme
builds (adding the second theme later means re-auditing every page built
by then); a colourless accent (in a page set entirely in one typeface,
the underline colour is the only thing distinguishing a link from bold
text).

## Foundation

Scaffold the official Astro blog starter (`npm create astro@latest --
--template blog`) into a temporary directory and bring its files into
this repository, replacing the basics-starter files currently present.

Taken from the starter: `BaseHead.astro`, `Header.astro`,
`Footer.astro`, `HeaderLink.astro`, `FormattedDate.astro`,
`layouts/BlogPost.astro`, `content.config.ts`, `pages/rss.xml.js`,
`consts.ts`, and the `@astrojs/mdx`, `@astrojs/rss`, `@astrojs/sitemap`
integrations.

Deleted: `components/Welcome.astro`, `assets/astro.svg`,
`assets/background.svg`, and the starter's own blog content, blog
images, and `README.md` boilerplate.

The blog pipeline stays wired and building from day one. It is the part
of the starter with the most value later, and deleting it now costs more
than keeping it.

## Visual system

### Token layer

`src/styles/tokens.css` defines every colour, size and spacing value as
a CSS custom property.

- Colour: `--bg`, `--bg-subtle`, `--ink`, `--ink-dim`, `--rule`,
  `--accent`, `--accent-hover`, `--selection`
- Type: `--font-mono`, a five-step size scale (`--fs-xs` through
  `--fs-xl`), `--lh-tight`, `--lh-base`, `--lh-loose`
- Space: an eight-step scale, `--sp-1` through `--sp-8`
- Layout: `--measure`, the reading column width

Light values sit on `:root`. Dark values are declared twice: under
`@media (prefers-color-scheme: dark)` guarded so an explicit light
choice wins, and under `[data-theme="dark"]` for the manual toggle.

**Invariant: no component hardcodes a colour.** Every colour reference
resolves to a token. This is the rule that keeps the system reusable —
it is what makes a page built six months from now survive the theme
flip without being re-audited.

### Global stylesheet

`src/styles/global.css` styles bare semantic elements against the
tokens: `h1`–`h4`, `p`, `ul`, `ol`, `li`, `a`, `blockquote`, `code`,
`pre`, `hr`, `table`, `img`.

The consequence worth stating explicitly: Markdown content renders
correctly with no component involvement. A future blog post and a
future project detail page inherit the system for free. This is why the
approach was chosen over per-component scoped styles (which would
duplicate the type rules between components and a `.prose` wrapper) and
over Tailwind (which for Markdown-dominant content means configuring
your way back to a stylesheet).

### Components

Each has one job and a documented interface.

- **`Section.astro`** — an uppercase label, a hairline rule, a slot.
  The primitive the dense index is built from. Props: `label`.
- **`Entry.astro`** — one list row: title link, meta line, optional
  blurb, optional tags. Props: `title`, `href`, `date?`, `blurb?`,
  `tags?`. Used by projects now, writing later, anything else after.
- **`ThemeToggle.astro`** — light/dark switch, backed by an inline
  script in `<head>` that applies the stored preference before first
  paint so there is no flash.
- **`Header.astro`** — name, role line, nav row.
- **`Footer.astro`** — elsewhere links, copyright.
- **`FormattedDate.astro`** — from the starter, unchanged in behaviour.

### Layouts

- **`Base.astro`** — document shell, skip link, header, the narrow
  `<main>` column, footer. Everything renders through it.
- **`Page.astro`** — `Base` plus the title-and-prose pattern, used by
  `/about` and `/projects`.
- **`BlogPost.astro`** — the starter's, rebuilt on `Base`.

## Content architecture

**`src/data/profile.ts`** is the single source of truth for identity:
name, role line, location, the "now" text, and the elsewhere links
(GitHub `ZetoOfficial`, LinkedIn `in/zetoqqq`, email
`zetoqqq@gmail.com`). No page restates any of it.

**`src/content.config.ts`** defines two collections:

- `blog` — the starter's, kept as-is.
- `projects` — new. Schema: `title`, `summary`, `date`, `stack`
  (string array), `url?` (live demo), `repo?`, `draft?`. Adding a
  project means adding a Markdown file, and each file gets a detail
  page at `/projects/[slug]`.

## Pages

**`/`** — dense index, in order: intro prose (two or three short
paragraphs in Pavel's voice), `Now`, `Projects` (the three most recent
from the collection), `Writing` (conditional, see below), `Elsewhere`.

**`/about`** — long-form prose drafted from the CV: Go backend
engineer, five years across fintech and e-commerce, currently at Tabby,
moving toward LLM and agentic systems, master's in AI at ITMO
(2026–2028), bachelor's at TyumGU (2021–2025).

**`/projects`** — the collection as a list of `Entry` rows. Anchor
entry is AI Interviewer: an LLM platform for technical interviews
(Python, FastAPI, LangGraph, PostgreSQL, Redis, S3, WebRTC, LiveKit),
demo at `ai-interviewer.zetoqqq.ru`.

**`/blog`, `/blog/[slug]`, `/rss.xml`** — built and styled, linked from
nowhere while the collection is empty.

### Conditional writing section

The homepage `Writing` section and the nav's `writing` item both render
only when the `blog` collection is non-empty. With zero posts neither
appears; committing the first post makes both appear with no further
change. This avoids shipping a dead heading now and avoids re-plumbing
the homepage later.

## Content sourcing

`/about` copy and the project entries are drafted from Pavel's CV, in
English, in a plainer register than a CV uses. Every place where his own
voice matters more than accuracy carries a `TODO` comment. Drafted copy
is a starting point for his editing, not a finished artifact.

## Quality and accessibility

- Semantic landmarks, a skip link, and a visible focus ring drawn in
  `--accent`.
- `prefers-reduced-motion` respected.
- IBM Plex Mono self-hosted via Astro 7's native Fonts API
  (`fontProviders.google()` in `astro.config.mjs`, `<Font>` in
  `BaseHead`), which downloads and serves the font from our own origin at
  build time — no third-party request on page load. This supersedes the
  `@fontsource/ibm-plex-mono` package named in earlier drafts; the
  starter already uses this API for its own font, so it is the
  framework-native path rather than an added dependency.
- Text contrast meets WCAG AA in both themes. The accent is verified
  against `--bg` in both.
- No layout shift on theme application.

## Verification

The gate is `astro check` and `astro build`, both clean.

Playwright smoke tests cover the two pieces with real logic:

1. The theme toggle persists across a reload and applies before first
   paint (no flash of the wrong theme).
2. The `Writing` section and nav item are absent with an empty `blog`
   collection and present when a post exists.

No broader test framework. Asserting on otherwise-static markup mostly
tests the test.

## Out of scope

Blog post content; analytics; newsletter or subscription; comments;
search; i18n; a CMS; deployment configuration.
