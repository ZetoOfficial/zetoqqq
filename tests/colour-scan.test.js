import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findColourLiterals } from './lib/colour-scan.js';

// The guard test (tokens.test.js) is only as good as this detector. Every
// case here is something the detector must be shown to catch, or shown not
// to falsely catch — not just asserted in the abstract.

test('flags a named colour value', () => {
	assert.ok(findColourLiterals('background: white;').length > 0);
});

test('flags hex colours', () => {
	assert.ok(findColourLiterals('color: #fff;').length > 0);
	assert.ok(findColourLiterals('color: #2b5c8a;').length > 0);
});

test('flags rgb() and modern colour functions', () => {
	assert.ok(findColourLiterals('background: rgb(1,2,3);').length > 0);
	assert.ok(findColourLiterals('color: oklch(0.7 0.1 250);').length > 0);
});

test('does not flag a hyphenated property name that contains a colour word', () => {
	// The trap: a naive /\bwhite\b/ regex matches inside "white-space" too,
	// because `-` counts as a word boundary. Property names sit to the left
	// of `:` and are never scanned — only the value side is.
	assert.deepEqual(findColourLiterals('white-space: nowrap;'), []);
});

test('does not flag the transparent and currentColor keywords', () => {
	assert.deepEqual(findColourLiterals('border-color: transparent;'), []);
	assert.deepEqual(findColourLiterals('fill: currentColor;'), []);
});

test('does not flag a var() reference', () => {
	assert.deepEqual(findColourLiterals('color: var(--ink);'), []);
});

test('does not flag a colour mentioned only inside a comment', () => {
	assert.deepEqual(findColourLiterals('/* #fff was here */ color: var(--ink);'), []);
});

test('does not flag string values such as grid-template-areas', () => {
	assert.deepEqual(findColourLiterals('grid-template-areas: "a b";'), []);
});

test('scans real nested rules and at-rules, not just bare declarations', () => {
	const css = `
		@media (prefers-color-scheme: dark) {
			:root:not([data-theme='light']) {
				--bg: #111113;
			}
		}
	`;
	assert.deepEqual(findColourLiterals(css), ['#111113']);
});

test('does not flag pseudo-classes or attribute selectors', () => {
	const css = `
		a:focus-visible,
		button:focus-visible {
			outline: 2px solid var(--accent);
		}
		:root[data-theme='dark'] {
			--ink: var(--ink);
		}
	`;
	assert.deepEqual(findColourLiterals(css), []);
});

// A brace-only scan silently drops anything outside a `{ }` pair — including
// an inline `style=` attribute, which never sits inside braces at all. These
// cases cover that second, explicitly named source.

test('flags colours from both a <style> block and an inline style attribute in the same file', () => {
	const astroFile =
		'---\n' +
		'import { Icon } from "astro-icon";\n' +
		'---\n' +
		'<div style="color: red;">Hi</div>\n' +
		'<style>\n' +
		' .foo { color: blue; }\n' +
		'</style>';
	const offenders = findColourLiterals(astroFile).map((s) => s.toLowerCase());
	assert.ok(offenders.includes('red'), 'expected the inline style="color: red" to be flagged');
	assert.ok(offenders.includes('blue'), 'expected the <style> block\'s color: blue to be flagged');
});

test('flags an inline style attribute with no <style> block anywhere in the file', () => {
	const astroFile = '---\nconst { title } = Astro.props;\n---\n<div style="color: #2b5c8a;">Hi</div>';
	assert.ok(findColourLiterals(astroFile).length > 0);
});

test('flags a literal hex inside an Astro style={`...`} template expression', () => {
	// The `${x}` interpolation must not itself be mistaken for a colour, and
	// must not stop the real hex literal alongside it from being found.
	const snippet = 'style={`color: ${x}; border-color: #2b5c8a`}';
	assert.ok(findColourLiterals(snippet).length > 0);
});

test('does not flag a TypeScript type annotation in frontmatter', () => {
	const frontmatter = `
		type Props = {
			title: string;
			description?: string;
		};
		const { title, description } = Astro.props;
	`;
	assert.deepEqual(findColourLiterals(frontmatter), []);
});

test('does not flag frontmatter prose that happens to mention a colour word', () => {
	// This is the false-positive trap the two-source design exists to avoid:
	// scanning every `prop: value` pair in frontmatter (instead of only real
	// CSS declarations and inline style attributes) would catch this too.
	const frontmatter = `
		type Props = {
			title: string;
		};
		const { title } = Astro.props;
		const d = 'a post about the colour red';
	`;
	assert.deepEqual(findColourLiterals(frontmatter), []);
});
