# Personal Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this Astro repository into Pavel Titov's document-like personal homepage, built on a token-driven visual system that `/about`, `/projects` and a future blog all reuse.

**Architecture:** Replace the current *basics* starter with the official *blog* starter, then layer a design system on top of it: `tokens.css` holds every colour/size/space value as a CSS custom property with light and dark values; `global.css` styles bare semantic HTML against those tokens so Markdown renders correctly with no component work; a small set of single-purpose components (`Section`, `Entry`, `ThemeToggle`) compose the pages. Page-specific logic is pulled out into plain TypeScript modules so it can be unit-tested without a browser.

**Tech Stack:** Astro 7.3.3, `@astrojs/mdx`, `@astrojs/rss`, `@astrojs/sitemap`, Astro native Fonts API (IBM Plex Mono via `fontProviders.google()`), plain CSS custom properties, `node --test` for unit tests, Playwright for browser tests.

**Spec:** `docs/superpowers/specs/2026-09-22-personal-homepage-design.md`

## Global Constraints

- Node `>=22.12.0`. Astro `^7.3.3`. Package manager: npm.
- **No component hardcodes a colour.** Every colour resolves to a token from `tokens.css`. Task 2 adds an automated guard that fails the build if this is violated; do not weaken or skip it.
- Typeface: IBM Plex Mono, weights 400 and 600, plus 400 italic, latin subset, self-hosted through Astro's Fonts API. No `@fontsource` package, no Google CDN `<link>`.
- Accent colours, exact values: light `#2b5c8a`, dark `#7fa8cf`. Accent appears **only** on link underlines, the active nav item, and focus rings. Never on backgrounds, never on headings.
- Light is the default theme. Dark applies via `prefers-color-scheme` unless the user has explicitly chosen light, and via `[data-theme="dark"]` when toggled.
- Site language is English only. No i18n routing.
- This is **not** a portfolio landing page. No hero banner, no call-to-action button, no feature cards, no testimonials, no animated statistics. One narrow column, everything as a list.
- Text contrast must meet WCAG AA (4.5:1 for body text) in both themes.
- Work happens on branch `feat/personal-homepage`.
- All drafted prose is a starting point for Pavel's editing. Where his own voice matters more than factual accuracy, leave an HTML/JS comment starting `TODO:`.

---

### Task 1: Swap the basics starter for the blog starter

Replaces the scaffolding this repo currently has with the official blog template, and switches its font to IBM Plex Mono. Ends with a site that builds and serves — ugly, but structurally correct.

**Files:**
- Create: `src/components/BaseHead.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/HeaderLink.astro`, `src/components/FormattedDate.astro`, `src/layouts/BlogPost.astro`, `src/content.config.ts`, `src/consts.ts`, `src/pages/about.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`, `src/pages/rss.xml.js`, `src/styles/global.css`
- Modify: `package.json`, `astro.config.mjs`, `src/pages/index.astro`
- Delete: `src/components/Welcome.astro`, `src/assets/astro.svg`, `src/assets/background.svg`

**Interfaces:**
- Consumes: nothing.
- Produces: the starter's module surface that later tasks modify —
  - `src/consts.ts` exports `SITE_TITLE: string`, `SITE_DESCRIPTION: string`
  - `src/content.config.ts` exports `collections` containing `blog`
  - `BaseHead.astro` props: `{ title: string; description: string; image?: ImageMetadata }`
  - `FormattedDate.astro` props: `{ date: Date }`
  - Blog entry slug is `post.id` (not `post.slug`)

- [ ] **Step 1: Scaffold the official blog starter to a temp directory**

```bash
cd /tmp && rm -rf astro-blog-starter
npm create astro@latest astro-blog-starter -- --template blog --no-install --no-git --skip-houston --yes
```

Expected: `Project initialized!` and `/tmp/astro-blog-starter/src` exists.

- [ ] **Step 2: Copy the starter's source over this repo's source**

```bash
cd /Users/zeto/go/src/github.com/ZetoOfficial/zetoqqq
rm -rf src/components src/layouts src/pages src/styles src/assets
cp -R /tmp/astro-blog-starter/src ./src
cp /tmp/astro-blog-starter/astro.config.mjs ./astro.config.mjs
```

- [ ] **Step 3: Delete the starter's demo content and its Atkinson font**

The blog collection must end up **empty** — the spec's conditional-writing behaviour depends on it. The placeholder images go too, since nothing will reference them.

```bash
cd /Users/zeto/go/src/github.com/ZetoOfficial/zetoqqq
rm -f src/content/blog/*.md src/content/blog/*.mdx
rm -f src/assets/blog-placeholder-*.jpg
rm -rf src/assets/fonts
mkdir -p src/content/blog
touch src/content/blog/.gitkeep
```

- [ ] **Step 4: Point `package.json` dependencies at the starter's set**

Replace the `dependencies` block in `package.json` with:

```json
  "dependencies": {
    "@astrojs/mdx": "^8.0.1",
    "@astrojs/rss": "^4.0.19",
    "@astrojs/sitemap": "^3.7.4",
    "astro": "^7.3.3",
    "sharp": "^0.35.0"
  },
```

Also set the package name, which is currently empty:

```json
  "name": "zetoqqq",
```

- [ ] **Step 5: Rewrite `astro.config.mjs` for IBM Plex Mono**

The starter ships an Atkinson local-font config; we deleted those font files, so this must be replaced wholesale. Write `astro.config.mjs`:

```js
// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://zetoqqq.ru',
	integrations: [mdx(), sitemap()],
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'IBM Plex Mono',
			cssVariable: '--font-ibm-plex-mono',
			fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
			weights: [400, 600],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
		},
	],
});
```

`fontProviders.google()` downloads the font at build time and serves it from our own origin — there is no runtime request to Google.

TODO: `site` is set to `https://zetoqqq.ru`. If Pavel deploys elsewhere, this one value needs updating — it drives canonical URLs, the sitemap and RSS.

- [ ] **Step 6: Update `BaseHead.astro` for the new font and the removed fallback image**

`BaseHead.astro` imports `FallbackImage from '../assets/blog-placeholder-1.jpg'`, which we deleted, and preloads `--font-atkinson`, which no longer exists. Make the og:image optional instead of reintroducing a placeholder.

Replace the frontmatter block of `src/components/BaseHead.astro` with:

```astro
---
// Import the global.css file here so that it is included on
// all pages through the use of the <BaseHead /> component.
import '../styles/global.css';
import type { ImageMetadata } from 'astro';
import { SITE_TITLE } from '../consts';
import { Font } from 'astro:assets';

interface Props {
	title: string;
	description: string;
	image?: ImageMetadata;
}

const canonicalURL = new URL(Astro.url.pathname, Astro.site);

const { title, description, image } = Astro.props;
---
```

Replace the font preload line:

```astro
<Font cssVariable="--font-ibm-plex-mono" preload />
```

And make the two image meta tags conditional — replace the `og:image` line with:

```astro
{image && <meta property="og:image" content={new URL(image.src, Astro.url)} />}
```

Change the twitter card line to:

```astro
<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
```

- [ ] **Step 7: Set the site constants**

Write `src/consts.ts`:

```ts
// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Pavel Titov';
export const SITE_DESCRIPTION =
	'Go backend engineer working on distributed services, production automation, and LLM agents.';
```

- [ ] **Step 8: Install and verify the build**

```bash
cd /Users/zeto/go/src/github.com/ZetoOfficial/zetoqqq
npm install
npx astro check
npm run build
```

Expected: `astro check` reports `0 errors`. `npm run build` completes and writes `dist/`. The blog index renders as an empty list — that is correct at this stage.

If `astro check` complains that `image` is possibly undefined in `BaseHead.astro`, the conditional guards from Step 6 were not applied correctly — fix those rather than widening the type.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: replace basics starter with official blog starter

Swaps in the blog template's components, layouts, content collection and
RSS pipeline, and switches the font from Atkinson to IBM Plex Mono via
Astro's native Fonts API. Demo posts and placeholder images removed so
the blog collection starts empty."
```

---

### Task 2: Token layer, global stylesheet, and the no-hardcoded-colour guard

The heart of the system. After this task the site is monochrome-correct in both themes and the invariant that keeps it reusable is enforced by a test rather than by discipline.

**Files:**
- Create: `src/styles/tokens.css`, `tests/tokens.test.js`
- Modify: `src/styles/global.css`, `package.json`

**Interfaces:**
- Consumes: `src/components/BaseHead.astro` imports `../styles/global.css` (from Task 1).
- Produces: the token names every later task must use —
  - Colour: `--bg`, `--bg-subtle`, `--ink`, `--ink-dim`, `--rule`, `--accent`, `--accent-hover`, `--selection`
  - Type: `--font-mono`, `--fs-xs`, `--fs-sm`, `--fs-base`, `--fs-lg`, `--fs-xl`, `--lh-tight`, `--lh-base`, `--lh-loose`
  - Space: `--sp-1` … `--sp-8`
  - Layout: `--measure`
  - Utility classes: `.column`, `.label`, `.dim`, `.sr-only`, `.skip-link`

- [ ] **Step 1: Write the failing test**

This test enforces the spec's central invariant. It scans every `.astro` and `.css` file under `src/` except `tokens.css` and fails if any contains a literal colour.

Create `tests/tokens.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;
const TOKENS = join(SRC, 'styles/tokens.css');

// Literal hex colours, plus rgb()/hsl() function forms.
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/g;

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else if (/\.(astro|css)$/.test(name)) out.push(full);
	}
	return out;
}

test('tokens.css defines both themes for every colour token', () => {
	const css = readFileSync(TOKENS, 'utf8');
	const names = [
		'--bg', '--bg-subtle', '--ink', '--ink-dim',
		'--rule', '--accent', '--accent-hover', '--selection',
	];
	for (const name of names) {
		const count = css.split(`${name}:`).length - 1;
		assert.ok(
			count >= 3,
			`${name} must be declared for light, prefers-dark and [data-theme="dark"] — found ${count}`,
		);
	}
});

test('no file outside tokens.css hardcodes a colour', () => {
	const offenders = [];
	for (const file of walk(SRC)) {
		if (file === TOKENS) continue;
		const text = readFileSync(file, 'utf8');
		for (const match of text.match(COLOUR) ?? []) {
			offenders.push(`${relative(SRC, file)}: ${match}`);
		}
	}
	assert.deepEqual(
		offenders,
		[],
		`Colours must come from tokens.css:\n${offenders.join('\n')}`,
	);
});
```

- [ ] **Step 2: Add the test script and run it to verify it fails**

Add to the `scripts` block of `package.json`:

```json
    "test:unit": "node --test tests/",
```

Run: `npm run test:unit`

Expected: FAIL. `tokens.test.js` errors because `src/styles/tokens.css` does not exist, and the second test lists the colours hardcoded in the starter's `global.css`, `Header.astro` and `Footer.astro`.

- [ ] **Step 3: Write the token layer**

Create `src/styles/tokens.css`:

```css
/*
 * Design tokens. This is the ONLY file in the project allowed to contain
 * literal colour values — `npm run test:unit` enforces that.
 *
 * Every colour is declared three times: once for light, once for users whose
 * OS prefers dark (unless they have explicitly chosen light), and once for an
 * explicit [data-theme="dark"] from the toggle.
 */

:root {
	/* Colour — light */
	--bg: #fbfbf9;
	--bg-subtle: #f3f3ef;
	--ink: #16161a;
	--ink-dim: #6f6f78;
	--rule: #e4e4e7;
	--accent: #2b5c8a;
	--accent-hover: #1d4467;
	--selection: #dce7f1;

	/* Type */
	--font-mono: var(--font-ibm-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
	--fs-xs: 0.6875rem;
	--fs-sm: 0.8125rem;
	--fs-base: 0.9375rem;
	--fs-lg: 1.125rem;
	--fs-xl: 1.5rem;
	--lh-tight: 1.25;
	--lh-base: 1.7;
	--lh-loose: 1.9;

	/* Space */
	--sp-1: 0.25rem;
	--sp-2: 0.5rem;
	--sp-3: 0.75rem;
	--sp-4: 1rem;
	--sp-5: 1.5rem;
	--sp-6: 2rem;
	--sp-7: 3rem;
	--sp-8: 4.5rem;

	/* Layout */
	--measure: 38rem;

	color-scheme: light;
}

@media (prefers-color-scheme: dark) {
	:root:not([data-theme='light']) {
		--bg: #111113;
		--bg-subtle: #191920;
		--ink: #e5e5e1;
		--ink-dim: #8b8b94;
		--rule: #26262c;
		--accent: #7fa8cf;
		--accent-hover: #a6c4de;
		--selection: #24384a;

		color-scheme: dark;
	}
}

:root[data-theme='dark'] {
	--bg: #111113;
	--bg-subtle: #191920;
	--ink: #e5e5e1;
	--ink-dim: #8b8b94;
	--rule: #26262c;
	--accent: #7fa8cf;
	--accent-hover: #a6c4de;
	--selection: #24384a;

	color-scheme: dark;
}
```

- [ ] **Step 4: Replace the starter's global stylesheet**

The starter's `global.css` is built around its own `--accent` / `--gray-gradient` variables and a sans-serif body. Replace the entire file with this, which styles bare semantic elements so Markdown inherits the system:

```css
@import './tokens.css';

*,
*::before,
*::after {
	box-sizing: border-box;
}

html {
	background: var(--bg);
}

body {
	margin: 0;
	padding: 0;
	background: var(--bg);
	color: var(--ink);
	font-family: var(--font-mono);
	font-size: var(--fs-base);
	line-height: var(--lh-base);
	font-synthesis: none;
	-webkit-text-size-adjust: 100%;
}

::selection {
	background: var(--selection);
}

/* Layout ------------------------------------------------------------- */

.column {
	width: 100%;
	max-width: var(--measure);
	margin: 0 auto;
	padding: 0 var(--sp-4);
}

/* Headings ----------------------------------------------------------- */

h1,
h2,
h3,
h4 {
	margin: var(--sp-6) 0 var(--sp-3);
	font-weight: 600;
	line-height: var(--lh-tight);
	letter-spacing: -0.01em;
	color: var(--ink);
}

h1 {
	font-size: var(--fs-xl);
}
h2 {
	font-size: var(--fs-lg);
}
h3,
h4 {
	font-size: var(--fs-base);
}

/* Text --------------------------------------------------------------- */

p,
ul,
ol,
blockquote,
table {
	margin: 0 0 var(--sp-4);
}

ul,
ol {
	padding-left: var(--sp-5);
}

li {
	margin-bottom: var(--sp-2);
}

blockquote {
	padding-left: var(--sp-4);
	border-left: 2px solid var(--rule);
	color: var(--ink-dim);
}

strong,
b {
	font-weight: 600;
}

em,
i {
	font-style: italic;
}

small,
.dim {
	color: var(--ink-dim);
	font-size: var(--fs-sm);
}

.label {
	display: block;
	margin-bottom: var(--sp-2);
	padding-bottom: var(--sp-1);
	border-bottom: 1px solid var(--rule);
	color: var(--ink-dim);
	font-size: var(--fs-xs);
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

hr {
	height: 0;
	margin: var(--sp-6) 0;
	border: 0;
	border-top: 1px solid var(--rule);
}

/* Links -------------------------------------------------------------- */

a {
	color: inherit;
	text-decoration: underline;
	text-decoration-color: var(--accent);
	text-decoration-thickness: 1px;
	text-underline-offset: 3px;
}

a:hover {
	text-decoration-color: var(--accent-hover);
	text-decoration-thickness: 2px;
}

a:focus-visible,
button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
	border-radius: 1px;
}

/* Code --------------------------------------------------------------- */

code {
	padding: 0.1em 0.35em;
	background: var(--bg-subtle);
	border-radius: 2px;
	font-family: var(--font-mono);
	font-size: 0.9em;
}

pre {
	margin: 0 0 var(--sp-4);
	padding: var(--sp-4);
	overflow-x: auto;
	background: var(--bg-subtle);
	border: 1px solid var(--rule);
	border-radius: 2px;
	font-size: var(--fs-sm);
}

pre > code {
	padding: 0;
	background: none;
}

/* Tables and media --------------------------------------------------- */

table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--fs-sm);
}

th,
td {
	padding: var(--sp-2) var(--sp-3);
	border-bottom: 1px solid var(--rule);
	text-align: left;
}

th {
	color: var(--ink-dim);
	font-weight: 600;
}

img {
	max-width: 100%;
	height: auto;
	border: 1px solid var(--rule);
}

/* Accessibility ------------------------------------------------------ */

.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.skip-link {
	position: absolute;
	left: var(--sp-4);
	top: -3rem;
	z-index: 10;
	padding: var(--sp-2) var(--sp-3);
	background: var(--bg);
	border: 1px solid var(--rule);
	transition: top 0.15s ease;
}

.skip-link:focus {
	top: var(--sp-4);
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```

- [ ] **Step 5: Strip hardcoded colours from the starter components**

`Header.astro`, `Footer.astro`, `HeaderLink.astro` and `BlogPost.astro` still reference the starter's deleted variables and literal colours. These components get rewritten properly in Tasks 3 and 9; for now, delete their entire `<style>` blocks so the guard test passes and nothing references a variable that no longer exists.

```bash
cd /Users/zeto/go/src/github.com/ZetoOfficial/zetoqqq
```

Remove the `<style>…</style>` block from each of:
- `src/components/Header.astro`
- `src/components/Footer.astro`
- `src/components/HeaderLink.astro`
- `src/layouts/BlogPost.astro` (the `<style>` inside `<head>`)
- `src/pages/blog/index.astro`

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run test:unit`

Expected: PASS, both tests. If the colour test still lists offenders, they are real — fix the named files rather than loosening the regex.

- [ ] **Step 7: Verify the build still succeeds**

```bash
npx astro check && npm run build
```

Expected: `0 errors`, build completes.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add token layer and semantic global stylesheet

Every colour, type step and spacing value becomes a custom property with
light and dark values. global.css styles bare semantic elements so
Markdown inherits the system without component work.

Adds a node --test guard that fails if any file outside tokens.css
contains a literal colour."
```

---

### Task 3: Profile data, Base layout, Header and Footer

Establishes the document shell every page renders through, and the single source of truth for Pavel's identity.

**Files:**
- Create: `src/data/profile.ts`, `src/lib/nav.ts`, `src/layouts/Base.astro`, `tests/nav.test.js`
- Modify: `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/HeaderLink.astro`

**Interfaces:**
- Consumes: `SITE_TITLE`, `SITE_DESCRIPTION` from `src/consts.ts`; `BaseHead.astro` props from Task 1; the `.column`, `.label`, `.dim`, `.skip-link` classes from Task 2.
- Produces:
  - `src/data/profile.ts` exports `profile: Profile` where
    `type Link = { label: string; href: string }` and
    `type Profile = { name: string; role: string; location: string; now: string; links: Link[] }`
  - `src/lib/nav.ts` exports `type NavItem = { href: string; label: string }` and
    `buildNav(hasPosts: boolean): NavItem[]`
  - `src/layouts/Base.astro` props: `{ title: string; description?: string }`, one default `<slot />`

- [ ] **Step 1: Write the failing test for nav construction**

The conditional-writing rule from the spec is real logic, so it lives in a plain module and gets tested directly rather than through a browser.

Create `tests/nav.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNav } from '../src/lib/nav.ts';

test('nav omits writing when there are no posts', () => {
	const items = buildNav(false);
	assert.deepEqual(items, [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		{ href: '/about', label: 'about' },
	]);
});

test('nav includes writing when posts exist', () => {
	const items = buildNav(true);
	assert.deepEqual(items, [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		{ href: '/blog', label: 'writing' },
		{ href: '/about', label: 'about' },
	]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`

Expected: FAIL with `Cannot find module '../src/lib/nav.ts'`.

Note: Node 22 strips TypeScript types from `.ts` files natively. If this errors with `Unknown file extension ".ts"`, add `--experimental-strip-types` to the `test:unit` script.

- [ ] **Step 3: Write the nav module**

Create `src/lib/nav.ts`:

```ts
export type NavItem = { href: string; label: string };

/**
 * The `writing` item only appears once the blog collection has entries.
 * Committing the first post makes it appear with no further change here.
 */
export function buildNav(hasPosts: boolean): NavItem[] {
	return [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		...(hasPosts ? [{ href: '/blog', label: 'writing' }] : []),
		{ href: '/about', label: 'about' },
	];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`

Expected: PASS, all four tests (two from Task 2, two new).

- [ ] **Step 5: Write the profile data module**

Create `src/data/profile.ts`:

```ts
export type Link = { label: string; href: string };

export type Profile = {
	name: string;
	role: string;
	location: string;
	now: string;
	links: Link[];
};

/**
 * Single source of truth for identity. No page restates any of this.
 */
export const profile: Profile = {
	name: 'Pavel Titov',
	role: 'Go backend engineer',
	location: 'Dubai / remote',
	// TODO: Pavel — rewrite in your own words. This is drafted from the CV.
	now: 'Backend at Tabby, working on checkout and payments. Starting a master’s in AI at ITMO. Spending my evenings on LLM agents and the unglamorous problem of evaluating them.',
	links: [
		{ label: 'github', href: 'https://github.com/ZetoOfficial' },
		{ label: 'linkedin', href: 'https://linkedin.com/in/zetoqqq' },
		{ label: 'email', href: 'mailto:zetoqqq@gmail.com' },
	],
};
```

- [ ] **Step 6: Rewrite `HeaderLink.astro`**

Replace the whole file:

```astro
---
import type { HTMLAttributes } from 'astro/types';

type Props = HTMLAttributes<'a'>;

const { href, class: className, ...props } = Astro.props;
const pathname = Astro.url.pathname.replace(import.meta.env.BASE_URL, '');
const subpath = pathname.match(/[^\/]+/g);
const isActive = href === pathname || href === '/' + (subpath?.[0] || '');
---

<a
	href={href}
	class:list={[className, { active: isActive }]}
	aria-current={isActive ? 'page' : undefined}
	{...props}
>
	<slot />
</a>

<style>
	a {
		color: var(--ink-dim);
		text-decoration: none;
	}
	a.active {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}
	a:hover {
		color: var(--ink);
	}
</style>
```

- [ ] **Step 7: Rewrite `Header.astro`**

Replace the whole file. Note it takes the nav as a prop rather than computing it, so the layout owns the single `getCollection` call.

```astro
---
import type { NavItem } from '../lib/nav';
import { profile } from '../data/profile';
import HeaderLink from './HeaderLink.astro';

interface Props {
	nav: NavItem[];
}

const { nav } = Astro.props;
---

<header class="column">
	<p class="name"><a href="/">{profile.name}</a></p>
	<p class="role dim">{profile.role} &mdash; {profile.location}</p>
	<nav aria-label="Primary">
		{nav.map((item) => <HeaderLink href={item.href}>{item.label}</HeaderLink>)}
		<slot name="toggle" />
	</nav>
</header>

<style>
	header {
		padding-top: var(--sp-7);
	}
	.name {
		margin: 0;
		font-size: var(--fs-xl);
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.name a {
		text-decoration: none;
	}
	.role {
		margin: 0 0 var(--sp-5);
	}
	nav {
		display: flex;
		align-items: center;
		gap: var(--sp-4);
		padding: var(--sp-2) 0;
		border-top: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		font-size: var(--fs-sm);
	}
	nav :global(a) {
		margin-right: 0;
	}
</style>
```

- [ ] **Step 8: Rewrite `Footer.astro`**

Replace the whole file:

```astro
---
import { profile } from '../data/profile';

const year = new Date().getFullYear();
---

<footer class="column">
	<p class="links">
		{
			profile.links.map((link) => (
				<a href={link.href} rel="me noopener">
					{link.label}
				</a>
			))
		}
	</p>
	<p class="dim">&copy; {year} {profile.name}</p>
</footer>

<style>
	footer {
		margin-top: var(--sp-8);
		padding-top: var(--sp-4);
		padding-bottom: var(--sp-7);
		border-top: 1px solid var(--rule);
		font-size: var(--fs-sm);
	}
	.links {
		display: flex;
		gap: var(--sp-4);
		margin-bottom: var(--sp-2);
	}
</style>
```

- [ ] **Step 9: Write the Base layout**

Create `src/layouts/Base.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseHead from '../components/BaseHead.astro';
import Footer from '../components/Footer.astro';
import Header from '../components/Header.astro';
import { SITE_DESCRIPTION } from '../consts';
import { buildNav } from '../lib/nav';

interface Props {
	title: string;
	description?: string;
}

const { title, description = SITE_DESCRIPTION } = Astro.props;

const posts = await getCollection('blog');
const nav = buildNav(posts.length > 0);
---

<!doctype html>
<html lang="en">
	<head>
		<BaseHead title={title} description={description} />
	</head>
	<body>
		<a class="skip-link" href="#main">Skip to content</a>
		<Header nav={nav} />
		<main id="main" class="column">
			<slot />
		</main>
		<Footer />
	</body>
</html>
```

- [ ] **Step 10: Point the existing pages at the new layout so the build stays green**

`src/pages/index.astro`, `src/pages/about.astro` and `src/pages/blog/index.astro` still render `<html>` themselves and call `<Header />` with no `nav` prop, which now fails type checking. Replace the body of each with a minimal `Base` usage — these get their real content in Tasks 6–9.

`src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import { SITE_TITLE } from '../consts';
---

<Base title={SITE_TITLE}>
	<p>Placeholder — the homepage is built in Task 7.</p>
</Base>
```

`src/pages/about.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---

<Base title="About">
	<h1>About</h1>
	<p>Placeholder — this page is built in Task 8.</p>
</Base>
```

`src/pages/blog/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import FormattedDate from '../../components/FormattedDate.astro';

const posts = (await getCollection('blog')).sort(
	(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);
---

<Base title="Writing">
	<h1>Writing</h1>
	<ul>
		{
			posts.map((post) => (
				<li>
					<a href={`/blog/${post.id}/`}>{post.data.title}</a>{' '}
					<span class="dim">
						<FormattedDate date={post.data.pubDate} />
					</span>
				</li>
			))
		}
	</ul>
</Base>
```

- [ ] **Step 11: Verify tests and build**

```bash
npm run test:unit && npx astro check && npm run build
```

Expected: 4 unit tests pass, `0 errors`, build completes. The colour guard must still pass — the new `<style>` blocks use only tokens.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add Base layout, profile data and document header

Identity lives in one module; every page renders through Base, which owns
the skip link, the narrow column and the single blog-collection read that
decides whether the nav shows a writing item."
```

---

### Task 4: Theme toggle with no flash of the wrong theme

**Files:**
- Create: `src/components/ThemeToggle.astro`, `playwright.config.ts`, `tests/e2e/theme.spec.ts`
- Modify: `src/components/BaseHead.astro`, `src/layouts/Base.astro`, `package.json`, `.gitignore`

**Interfaces:**
- Consumes: `--ink`, `--ink-dim`, `--rule`, `--bg` tokens; the `.sr-only` class.
- Produces: `ThemeToggle.astro`, no props. Sets `document.documentElement.dataset.theme` to `'light'` or `'dark'` and persists it under `localStorage` key `theme`.

- [ ] **Step 1: Install Playwright**

```bash
cd /Users/zeto/go/src/github.com/ZetoOfficial/zetoqqq
npm install -D @playwright/test
npx playwright install chromium
```

Add to `package.json` scripts:

```json
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:e2e",
```

Add to `.gitignore`:

```
# playwright
/test-results/
/playwright-report/
```

- [ ] **Step 2: Write the Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	use: {
		baseURL: 'http://localhost:4321',
	},
	webServer: {
		command: 'npm run build && npm run preview -- --port 4321',
		url: 'http://localhost:4321',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
```

- [ ] **Step 3: Write the failing test**

Create `tests/e2e/theme.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('defaults to light when the OS prefers light', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	const bg = await page.evaluate(() =>
		getComputedStyle(document.body).backgroundColor,
	);
	expect(bg).toBe('rgb(251, 251, 249)');
});

test('follows the OS when it prefers dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	const bg = await page.evaluate(() =>
		getComputedStyle(document.body).backgroundColor,
	);
	expect(bg).toBe('rgb(17, 17, 19)');
});

test('the toggle flips the theme and persists it across a reload', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');

	await page.getByRole('button', { name: /theme/i }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the stored theme is applied before first paint', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	await page.evaluate(() => localStorage.setItem('theme', 'dark'));

	// If the inline head script is missing or deferred, the document paints
	// light first and this attribute is absent on the very first DOM snapshot.
	await page.goto('/', { waitUntil: 'commit' });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test:e2e`

Expected: FAIL. The first two tests may pass already (tokens are in place); the toggle tests fail with a timeout looking for a button named `theme`.

- [ ] **Step 5: Add the no-flash inline script to `BaseHead.astro`**

`is:inline` is required — Astro must not bundle or defer this. Add it as the **first** element in `BaseHead.astro`'s template, before the `<meta charset>` line:

```astro
<script is:inline>
	// Applied before first paint so a stored preference never flashes.
	try {
		const stored = localStorage.getItem('theme');
		if (stored === 'light' || stored === 'dark') {
			document.documentElement.dataset.theme = stored;
		}
	} catch {
		// localStorage can throw in private mode; the OS preference still applies.
	}
</script>
```

- [ ] **Step 6: Write the toggle component**

Create `src/components/ThemeToggle.astro`:

```astro
<button id="theme-toggle" type="button" aria-live="polite">
	<span class="sr-only">Toggle theme</span>
	<span aria-hidden="true" data-icon>&#9680;</span>
</button>

<script>
	const button = document.getElementById('theme-toggle');

	function current(): 'light' | 'dark' {
		const explicit = document.documentElement.dataset.theme;
		if (explicit === 'light' || explicit === 'dark') return explicit;
		return window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
	}

	button?.addEventListener('click', () => {
		const next = current() === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('theme', next);
		} catch {
			// Preference is not persisted in private mode; the flip still applies.
		}
	});
</script>

<style>
	button {
		margin-left: auto;
		padding: 0;
		background: none;
		border: 0;
		color: var(--ink-dim);
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		line-height: 1;
		cursor: pointer;
	}
	button:hover {
		color: var(--ink);
	}
</style>
```

- [ ] **Step 7: Render the toggle in the header**

In `src/layouts/Base.astro`, import the component and pass it into the header's named slot. Replace the `<Header nav={nav} />` line with:

```astro
		<Header nav={nav}>
			<ThemeToggle slot="toggle" />
		</Header>
```

And add to the frontmatter imports:

```astro
import ThemeToggle from '../components/ThemeToggle.astro';
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm run test:e2e`

Expected: PASS, all four tests.

If the "before first paint" test fails, the script in Step 5 is not `is:inline` or is not the first element in `<head>`.

- [ ] **Step 9: Run the full gate**

```bash
npm run test:unit && npx astro check && npm run build
```

Expected: all pass. The colour guard must still pass — `ThemeToggle.astro` uses only tokens.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add theme toggle with no flash of the wrong theme

An is:inline head script applies the stored preference before first
paint; the toggle writes to localStorage and flips data-theme. Playwright
covers OS-preference defaults, persistence, and the no-flash guarantee."
```

---

### Task 5: The `Section` and `Entry` primitives

The two components the dense index is made of. Both are deliberately generic — projects use them now, writing uses them later.

**Files:**
- Create: `src/components/Section.astro`, `src/components/Entry.astro`

**Interfaces:**
- Consumes: `.label`, `.dim` classes and the token set.
- Produces:
  - `Section.astro` props: `{ label: string; href?: string }` — when `href` is given, the label gets a trailing "all →" link. One default `<slot />`.
  - `Entry.astro` props: `{ title: string; href: string; meta?: string; blurb?: string; tags?: string[]; external?: boolean }`

- [ ] **Step 1: Write `Section.astro`**

```astro
---
interface Props {
	label: string;
	href?: string;
}

const { label, href } = Astro.props;
---

<section>
	<h2 class="label">
		{label}
		{href && <a href={href}>all &rarr;</a>}
	</h2>
	<slot />
</section>

<style>
	section {
		margin-top: var(--sp-6);
	}
	h2 {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		/* .label already supplies the rule, colour and tracking. */
		margin-top: 0;
		font-weight: 400;
	}
	h2 a {
		text-transform: none;
		letter-spacing: 0;
	}
</style>
```

- [ ] **Step 2: Write `Entry.astro`**

```astro
---
interface Props {
	title: string;
	href: string;
	meta?: string;
	blurb?: string;
	tags?: string[];
	external?: boolean;
}

const { title, href, meta, blurb, tags, external = false } = Astro.props;
---

<article>
	<h3>
		<a href={href} {...external ? { target: '_blank', rel: 'noopener' } : {}}>
			{title}
		</a>
	</h3>
	{meta && <p class="dim meta">{meta}</p>}
	{blurb && <p class="blurb">{blurb}</p>}
	{
		tags && tags.length > 0 && (
			<p class="dim tags">{tags.map((tag) => `#${tag}`).join(' ')}</p>
		)
	}
</article>

<style>
	article {
		margin-bottom: var(--sp-4);
	}
	h3 {
		margin: 0;
		font-size: var(--fs-base);
		font-weight: 600;
	}
	.meta,
	.tags {
		margin: 0;
	}
	.blurb {
		margin: var(--sp-1) 0 0;
	}
	.tags {
		margin-top: var(--sp-1);
		font-size: var(--fs-xs);
	}
</style>
```

- [ ] **Step 3: Verify the build and the colour guard**

```bash
npm run test:unit && npx astro check && npm run build
```

Expected: pass. Nothing renders these yet — Task 6 is their first consumer.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Section and Entry layout primitives

Section is a labelled block with a hairline rule; Entry is one list row
with optional meta, blurb and tags. Both are content-agnostic so the
writing list can reuse them unchanged."
```

---

### Task 6: The `projects` collection and its pages

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/content/projects/ai-interviewer.md`, `src/content/projects/partnersc-backend.md`, `src/lib/projects.ts`, `src/pages/projects/index.astro`, `src/pages/projects/[...slug].astro`, `tests/projects.test.js`
- Delete: `src/pages/about.astro` is untouched here; no deletions.

**Interfaces:**
- Consumes: `Section.astro`, `Entry.astro` (Task 5); `Base.astro` (Task 3).
- Produces:
  - `src/content.config.ts` exports `collections` containing `blog` and `projects`
  - `projects` entry `data`: `{ title: string; summary: string; date: Date; stack: string[]; url?: string; repo?: string; draft?: boolean }`
  - `src/lib/projects.ts` exports `sortProjects<T extends { data: { date: Date; draft?: boolean } }>(entries: T[]): T[]` — drops drafts, newest first

- [ ] **Step 1: Write the failing test for project sorting**

Create `tests/projects.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortProjects } from '../src/lib/projects.ts';

const entry = (id, date, draft) => ({ id, data: { date: new Date(date), draft } });

test('sorts newest first', () => {
	const sorted = sortProjects([
		entry('old', '2024-01-01'),
		entry('new', '2026-01-01'),
		entry('mid', '2025-01-01'),
	]);
	assert.deepEqual(
		sorted.map((e) => e.id),
		['new', 'mid', 'old'],
	);
});

test('drops drafts', () => {
	const sorted = sortProjects([
		entry('published', '2026-01-01'),
		entry('hidden', '2026-06-01', true),
	]);
	assert.deepEqual(
		sorted.map((e) => e.id),
		['published'],
	);
});

test('does not mutate its input', () => {
	const input = [entry('a', '2024-01-01'), entry('b', '2026-01-01')];
	sortProjects(input);
	assert.deepEqual(
		input.map((e) => e.id),
		['a', 'b'],
	);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`

Expected: FAIL with `Cannot find module '../src/lib/projects.ts'`.

- [ ] **Step 3: Write the sorting module**

Create `src/lib/projects.ts`:

```ts
type Sortable = { data: { date: Date; draft?: boolean } };

/**
 * Drops drafts and orders newest first. Returns a new array.
 */
export function sortProjects<T extends Sortable>(entries: T[]): T[] {
	return entries
		.filter((entry) => !entry.data.draft)
		.slice()
		.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`

Expected: PASS, seven tests total.

- [ ] **Step 5: Add the `projects` collection to the content config**

Replace `src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		date: z.coerce.date(),
		stack: z.array(z.string()).default([]),
		url: z.string().url().optional(),
		repo: z.string().url().optional(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { blog, projects };
```

- [ ] **Step 6: Write the seed project entries**

Create `src/content/projects/ai-interviewer.md`:

```markdown
---
title: 'AI Interviewer'
summary: 'A platform that runs technical interviews with an LLM, scores them against a competency model, and hands a draft of the feedback to a human.'
date: 2026-06-01
stack: ['Python', 'FastAPI', 'LangGraph', 'PostgreSQL', 'Redis', 'WebRTC', 'LiveKit']
url: 'https://ai-interviewer.zetoqqq.ru'
draft: false
---

Built with a team for AI Product Hack.

The interesting problem was not generating the report — it was that the
interview could not end until the report was ready, which made every session
hostage to the slowest model call. I moved report generation into background
jobs with retries and a reconciler that finds and restarts work orphaned by a
crash, so finishing the interview and producing the write-up stopped being the
same event.

Around that: a competency profile scored 0–10 with weighted blocks, a draft of
the candidate's feedback that a human confirms rather than writes, OpenAI
ASR/TTS adapters behind a config, and an LLM client that caches the structured
output call.

<!-- TODO: Pavel — say what you would do differently. That is the part people
     actually want to read. -->
```

Create `src/content/projects/partnersc-backend.md`:

```markdown
---
title: 'PartnerSC backend'
summary: 'The backend for Wildberries partner sorting centres and warehouses — more than fifty services, taken from nothing to production.'
date: 2023-09-01
stack: ['Go', 'PostgreSQL', 'Kafka', 'Kubernetes']
draft: false
---

Designed and launched the MVP, then led the architecture reviews as it grew.

The part I remember is the move to new servers: load estimates, monitoring,
SOPS, deploy — the unglamorous half of a migration, which is also the half that
decides whether it works.

Also built photo and video capture for the penalty system, running at roughly
700 GB of data a month.

<!-- TODO: Pavel — this one is thin. Either expand it or drop it; two strong
     entries read better than one strong and one dutiful. -->
```

- [ ] **Step 7: Write the projects index page**

Create `src/pages/projects/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Entry from '../../components/Entry.astro';
import Base from '../../layouts/Base.astro';
import { sortProjects } from '../../lib/projects';

const projects = sortProjects(await getCollection('projects'));
---

<Base
	title="Projects"
	description="Things Pavel Titov has built, with notes on what was actually hard about them."
>
	<h1>Projects</h1>
	<p>
		Things I&rsquo;ve built, with notes on what was actually hard about them
		rather than what they do.
	</p>

	{
		projects.map((project) => (
			<Entry
				title={project.data.title}
				href={`/projects/${project.id}/`}
				meta={project.data.stack.join(' · ')}
				blurb={project.data.summary}
			/>
		))
	}
</Base>
```

- [ ] **Step 8: Write the project detail page**

Create `src/pages/projects/[...slug].astro`:

```astro
---
import { type CollectionEntry, getCollection, render } from 'astro:content';
import Base from '../../layouts/Base.astro';
import FormattedDate from '../../components/FormattedDate.astro';

export async function getStaticPaths() {
	const projects = await getCollection('projects');
	return projects.map((project) => ({
		params: { slug: project.id },
		props: project,
	}));
}

type Props = CollectionEntry<'projects'>;

const project = Astro.props;
const { Content } = await render(project);
const { title, summary, date, stack, url, repo } = project.data;
---

<Base title={title} description={summary}>
	<article>
		<h1>{title}</h1>
		<p class="dim">
			<FormattedDate date={date} />
			{stack.length > 0 && <> &middot; {stack.join(' · ')}</>}
		</p>
		{
			(url || repo) && (
				<p class="links">
					{url && (
						<a href={url} target="_blank" rel="noopener">
							live
						</a>
					)}
					{repo && (
						<a href={repo} target="_blank" rel="noopener">
							source
						</a>
					)}
				</p>
			)
		}
		<hr />
		<Content />
	</article>
</Base>

<style>
	.links {
		display: flex;
		gap: var(--sp-4);
	}
</style>
```

- [ ] **Step 9: Verify the full gate**

```bash
npm run test:unit && npx astro check && npm run build
```

Expected: 7 unit tests pass, `0 errors`, and `dist/projects/index.html`, `dist/projects/ai-interviewer/index.html` and `dist/projects/partnersc-backend/index.html` all exist.

```bash
ls dist/projects dist/projects/ai-interviewer
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add projects collection, index and detail pages

Projects are Markdown entries with a typed schema rather than hardcoded
markup, so adding one is adding a file. Draft filtering and ordering live
in a tested module rather than in the template."
```

---

### Task 7: The homepage dense index

**Files:**
- Modify: `src/pages/index.astro`
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `Base.astro`, `Section.astro`, `Entry.astro`, `profile`, `sortProjects`, `FormattedDate.astro`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('renders the dense index sections in order', async ({ page }) => {
	await page.goto('/');
	const labels = await page.locator('main h2').allTextContents();
	const cleaned = labels.map((l) => l.replace(/all\s*→/, '').trim().toLowerCase());
	expect(cleaned).toEqual(['now', 'projects', 'elsewhere']);
});

test('omits the writing section while the blog is empty', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('main h2', { hasText: /^writing$/i })).toHaveCount(0);
	await expect(page.getByRole('navigation').getByText('writing')).toHaveCount(0);
});

test('is not a portfolio landing page', async ({ page }) => {
	await page.goto('/');
	// One column, no hero: the first heading is the name in the header,
	// and main starts with prose rather than a call to action.
	await expect(page.locator('main')).toBeVisible();
	await expect(page.locator('main button')).toHaveCount(0);
});

test('links to both project detail pages', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'AI Interviewer' }).click();
	await expect(page).toHaveURL(/\/projects\/ai-interviewer\/?$/);
	await expect(page.locator('h1')).toHaveText('AI Interviewer');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/home.spec.ts`

Expected: FAIL — the homepage is still the Task 3 placeholder, so no `h2` labels exist.

- [ ] **Step 3: Write the homepage**

Replace `src/pages/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Entry from '../components/Entry.astro';
import FormattedDate from '../components/FormattedDate.astro';
import Section from '../components/Section.astro';
import { SITE_DESCRIPTION } from '../consts';
import { profile } from '../data/profile';
import Base from '../layouts/Base.astro';
import { sortProjects } from '../lib/projects';

const projects = sortProjects(await getCollection('projects')).slice(0, 3);

const posts = (await getCollection('blog')).sort(
	(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);
const recentPosts = posts.slice(0, 4);
---

<Base title={profile.name} description={SITE_DESCRIPTION}>
	{/* TODO: Pavel — this intro is drafted from your CV. Rewrite it in your
	    own voice; it is the first thing anyone reads. */}
	<p>
		Hi, I&rsquo;m Pavel. I write Go for a living: distributed services and the
		unglamorous production automation that keeps them upright. Five years of it,
		mostly fintech and e-commerce.
	</p>
	<p>
		Lately I&rsquo;ve been pulling on a different thread &mdash; LLM agents that
		can investigate an incident instead of just paging me about it. That is what
		the <a href="/projects/ai-interviewer/">AI Interviewer</a> work was really about.
	</p>

	<Section label="Now">
		<p>{profile.now}</p>
	</Section>

	<Section label="Projects" href="/projects">
		{
			projects.map((project) => (
				<Entry
					title={project.data.title}
					href={`/projects/${project.id}/`}
					meta={project.data.stack.slice(0, 4).join(' · ')}
					blurb={project.data.summary}
				/>
			))
		}
	</Section>

	{
		recentPosts.length > 0 && (
			<Section label="Writing" href="/blog">
				{recentPosts.map((post) => (
					<Entry
						title={post.data.title}
						href={`/blog/${post.id}/`}
						blurb={post.data.description}
					/>
				))}
			</Section>
		)
	}

	<Section label="Elsewhere">
		<ul class="elsewhere">
			{
				profile.links.map((link) => (
					<li>
						<a href={link.href} rel="me noopener">
							{link.label}
						</a>
					</li>
				))
			}
		</ul>
	</Section>
</Base>

<style>
	.elsewhere {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.elsewhere li {
		margin-bottom: var(--sp-1);
	}
</style>
```

Note: `FormattedDate` is imported but only needed once the writing section has real posts — if `astro check` flags it as unused, remove the import and add it back with the first post.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/home.spec.ts`

Expected: PASS, all four tests.

- [ ] **Step 5: Run the full gate**

```bash
npm run test:unit && npx astro check && npm run build && npm run test:e2e
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: build the homepage as a dense index

Intro prose, Now, Projects, Elsewhere — one narrow column, everything as
a list, no hero. The Writing section renders only when the blog
collection is non-empty, so nothing appears as a dead heading today."
```

---

### Task 8: The about page

**Files:**
- Modify: `src/pages/about.astro`
- Create: `src/layouts/Page.astro`

**Interfaces:**
- Consumes: `Base.astro`.
- Produces: `Page.astro` props: `{ title: string; description?: string; heading?: string }`, one default `<slot />`. Used by `/about` now and available to any future prose page.

- [ ] **Step 1: Write the Page layout**

Create `src/layouts/Page.astro`:

```astro
---
import Base from './Base.astro';

interface Props {
	title: string;
	description?: string;
	heading?: string;
}

const { title, description, heading = title } = Astro.props;
---

<Base title={title} description={description}>
	<h1>{heading}</h1>
	<slot />
</Base>
```

- [ ] **Step 2: Write the about page**

Replace `src/pages/about.astro`:

```astro
---
import Page from '../layouts/Page.astro';
---

<Page
	title="About"
	description="Pavel Titov — Go backend engineer, five years across fintech and e-commerce, now working on LLM agents."
>
	{/* TODO: Pavel — everything below is drafted from your CV in a plainer
	    register. Keep the structure, replace the voice. */}
	<p>
		I&rsquo;m a backend engineer. I&rsquo;ve spent about five years writing Go
		for systems where being wrong is expensive &mdash; payments, checkout,
		warehouse logistics &mdash; which is a specific kind of education.
	</p>

	<h2>What I actually do</h2>
	<p>
		Distributed services and the operational work around them: finding out why
		something degraded, writing the postmortem, and then doing the unglamorous
		part where the fix reaches production. At Tabby I chased a chronic memory
		leak in checkout that was driving 5xx rates up, ran the incident and the
		root-cause analysis, and saw the correction through. I also split checkout
		from payments behind adapters so a legacy dual-write could finally be
		retired.
	</p>
	<p>
		Before that, at T-Bank, I built a gRPC streaming API for managing data
		collection agents, which replaced a set of manual SRE operations, and cut
		GitLab CI/CD times by 40&ndash;60%. At Wildberries I designed and launched
		the PartnerSC backend from nothing &mdash; more than fifty services &mdash;
		and led architecture reviews as it grew.
	</p>

	<h2>Where I&rsquo;m going</h2>
	<p>
		Toward LLM and agentic systems. Not the demo kind &mdash; the kind that has
		to run unattended, be evaluated honestly, and fail in ways you can debug. I
		want to build harnesses and agents that investigate incidents and test
		software, which is the same reliability problem I already know wearing
		different clothes.
	</p>
	<p>
		I&rsquo;m starting a master&rsquo;s in artificial intelligence at ITMO&rsquo;s
		AI Talent Hub (2026&ndash;2028). My bachelor&rsquo;s is in software
		engineering from TyumGU (2021&ndash;2025).
	</p>

	<h2>Tools</h2>
	<p>
		Go and Python day to day. PostgreSQL, Redis, ClickHouse, Kafka, NATS.
		Docker, Kubernetes, Helm. Prometheus, Grafana, Loki, OpenTelemetry &mdash;
		enough observability to have opinions about it. FastAPI and LangGraph for
		the LLM work.
	</p>

	<h2>Elsewhere</h2>
	<p>
		The fastest way to reach me is <a href="mailto:zetoqqq@gmail.com">email</a>.
		I&rsquo;m also on <a href="https://github.com/ZetoOfficial" rel="me noopener">GitHub</a>
		and <a href="https://linkedin.com/in/zetoqqq" rel="me noopener">LinkedIn</a>.
	</p>
</Page>
```

- [ ] **Step 3: Verify the page renders**

```bash
npm run build && ls dist/about
```

Expected: `dist/about/index.html` exists.

Then check it visually:

```bash
npm run preview -- --port 4321
```

Open `http://localhost:4321/about` and confirm: one narrow column, headings in the same mono at a smaller step than the page title, no colour except link underlines. Toggle the theme and confirm every element flips.

- [ ] **Step 4: Run the full gate**

```bash
npm run test:unit && npx astro check && npm run build && npm run test:e2e
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add the about page and a reusable prose Page layout

Page wraps Base with the title-and-prose pattern so any future long-form
page gets the system for free."
```

---

### Task 9: Restyle the blog routes and run the final verification pass

Brings the blog pipeline onto the design system so the first post Pavel writes lands in a styled site, and checks the whole thing against the spec's quality bar.

**Files:**
- Modify: `src/layouts/BlogPost.astro`, `src/pages/blog/index.astro`, `src/pages/rss.xml.js`
- Create: `tests/e2e/a11y.spec.ts`, `src/content/blog/.gitkeep` (if missing)

**Interfaces:**
- Consumes: `Base.astro`, `Entry.astro`, `Section.astro`, `FormattedDate.astro`.
- Produces: nothing.

- [ ] **Step 1: Rebuild `BlogPost.astro` on the Base layout**

Replace the whole file:

```astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import FormattedDate from '../components/FormattedDate.astro';
import Base from './Base.astro';

type Props = CollectionEntry<'blog'>['data'];

const { title, description, pubDate, updatedDate, heroImage } = Astro.props;
---

<Base title={title} description={description}>
	<article>
		{heroImage && <Image width={1020} height={510} src={heroImage} alt="" />}
		<h1>{title}</h1>
		<p class="dim">
			<FormattedDate date={pubDate} />
			{
				updatedDate && (
					<>
						{' '}&middot; updated <FormattedDate date={updatedDate} />
					</>
				)
			}
		</p>
		<hr />
		<slot />
	</article>
</Base>
```

- [ ] **Step 2: Rebuild the blog index with the shared primitives**

Replace `src/pages/blog/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Entry from '../../components/Entry.astro';
import Base from '../../layouts/Base.astro';

const posts = (await getCollection('blog')).sort(
	(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);

const formatter = new Intl.DateTimeFormat('en-us', {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
});
---

<Base title="Writing" description="Notes on Go, distributed systems and LLM agents.">
	<h1>Writing</h1>
	{
		posts.length === 0 ? (
			<p class="dim">Nothing published yet.</p>
		) : (
			posts.map((post) => (
				<Entry
					title={post.data.title}
					href={`/blog/${post.id}/`}
					meta={formatter.format(post.data.pubDate)}
					blurb={post.data.description}
				/>
			))
		)
	}
</Base>
```

- [ ] **Step 3: Point RSS at the right description**

`src/pages/rss.xml.js` maps `...post.data` into items, which is correct, but the feed title should be the site title. Verify the file reads:

```js
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = await getCollection('blog');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
	});
}
```

No change is expected — this step is a confirmation, since `SITE_TITLE` changed in Task 1.

- [ ] **Step 4: Write the accessibility and contrast test**

Create `tests/e2e/a11y.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/about', '/projects', '/blog'];

for (const path of PAGES) {
	test(`${path} has one h1, a main landmark and a skip link`, async ({ page }) => {
		await page.goto(path);
		await expect(page.locator('main#main')).toHaveCount(1);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('a.skip-link')).toHaveCount(1);
	});

	test(`${path} renders with no horizontal overflow at 375px`, async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		await page.goto(path);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
		);
		expect(overflow).toBe(false);
	});
}

test('body text meets WCAG AA contrast in both themes', async ({ page }) => {
	const luminance = (rgb: number[]) => {
		const [r, g, b] = rgb.map((v) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const parse = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number);

	for (const scheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: scheme });
		await page.goto('/about');
		const { fg, bg } = await page.evaluate(() => {
			const p = document.querySelector('main p')!;
			return {
				fg: getComputedStyle(p).color,
				bg: getComputedStyle(document.body).backgroundColor,
			};
		});
		const l1 = luminance(parse(fg));
		const l2 = luminance(parse(bg));
		const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
		expect(ratio, `${scheme} body contrast`).toBeGreaterThanOrEqual(4.5);
	}
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/a11y.spec.ts`

Expected: PASS. If the `/blog` h1 count fails, the empty-state branch in Step 2 is not rendering its `<h1>`.

- [ ] **Step 6: Run the complete gate**

```bash
npm run test:unit && npx astro check && npm run build && npm run test:e2e
```

Expected: all unit tests pass, `0 errors`, build completes, all Playwright specs pass.

- [ ] **Step 7: Confirm the colour invariant one last time**

```bash
grep -rnE '#[0-9a-fA-F]{3,8}\b|\b(rgb|hsl)a?\s*\(' src --include='*.astro' --include='*.css' | grep -v 'src/styles/tokens.css'
```

Expected: no output.

- [ ] **Step 8: Update the README**

The README is still the basics-starter boilerplate. Replace it:

```markdown
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
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: restyle blog routes and add the accessibility pass

BlogPost and the blog index now render through Base and the shared
primitives, so the first published post lands in a styled site. Adds
Playwright coverage for landmarks, mobile overflow and WCAG AA contrast
in both themes."
```

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: Foundation → Task 1; token layer → Task 2; global stylesheet → Task 2; `Section`/`Entry` → Task 5; `ThemeToggle` → Task 4; `Header`/`Footer` → Task 3; `Base`/`Page`/`BlogPost` layouts → Tasks 3, 8, 9; `profile.ts` → Task 3; `projects` collection → Task 6; `/` → Task 7; `/about` → Task 8; `/projects` → Task 6; blog routes → Tasks 1 and 9; conditional writing → Tasks 3 (logic and test) and 7 (rendering); content sourcing with `TODO` markers → Tasks 3, 6, 7, 8; accessibility and contrast → Tasks 2 and 9; verification → every task's gate plus Task 9.

**Deviation from the spec, recorded.** The spec's earlier draft named `@fontsource/ibm-plex-mono`. Astro 7 ships a native Fonts API that the starter already uses, which self-hosts the same way without an added dependency, so Task 1 uses `fontProviders.google()`. The spec has been amended to match.

**Type consistency.** `buildNav(hasPosts: boolean): NavItem[]` is defined in Task 3 and consumed by `Base.astro` in the same task and by `Header.astro`'s `nav` prop. `sortProjects` is defined in Task 6 and used in Tasks 6 and 7 with the same signature. `Entry` props (`title`, `href`, `meta`, `blurb`, `tags`, `external`) are defined in Task 5 and used consistently in Tasks 6, 7 and 9 — note `meta` is a pre-formatted string, which is why Task 9 formats the date with `Intl.DateTimeFormat` rather than passing the `FormattedDate` component. Blog and project slugs are `entry.id` throughout, matching Astro 7's glob loader.

**Known ordering constraint.** Task 2 Step 5 deletes `<style>` blocks that Tasks 3 and 9 then rewrite properly. This is deliberate — it keeps the colour guard green from the moment it is introduced rather than carrying a known-failing test across tasks.
