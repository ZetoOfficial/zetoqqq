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
