// Detects literal colour values inside CSS: hex codes, colour functions
// (classic and modern), and CSS named colours — while ignoring selectors,
// property names, comments, and the `transparent` / `currentColor`
// keywords, which carry no theme information.
//
// Not collected as a test file: this filename does not match
// `tests/**/*.test.js`.

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const COLOUR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\(/gi;
const WORD = /[a-zA-Z][a-zA-Z-]*/g;

// Keywords that are colours grammatically but carry no theme information,
// so they are not literal colour *values* in the sense this guard cares
// about.
const ALLOWED_KEYWORDS = new Set(['transparent', 'currentcolor']);

// The CSS Color Module named colours (case-insensitive).
const NAMED_COLOURS = new Set([
	'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
	'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
	'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
	'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
	'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
	'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
	'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
	'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
	'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
	'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
	'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
	'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
	'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
	'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
	'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
	'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
	'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
	'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
	'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
	'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
	'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
	'whitesmoke', 'yellow', 'yellowgreen',
]);

function stripComments(cssText) {
	return cssText.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Splits a declaration list (`prop: value; prop2: value2`) on `;` and
// keeps only the text after each declaration's first `:` — the value side.
function declarationsToValues(body) {
	const values = [];
	for (const decl of body.split(';')) {
		const colon = decl.indexOf(':');
		if (colon === -1) continue;
		values.push(decl.slice(colon + 1).trim());
	}
	return values;
}

// Recursively walks brace-delimited blocks. A "leaf" block (one with no
// further nested `{`) is treated as a declaration list and split on `;`;
// everything to the left of a `{` — selectors, pseudo-classes, attribute
// selectors, at-rule preludes — is never visited, so it is excluded from
// scanning by construction rather than by pattern-matching around it.
function collectDeclarationValues(text) {
	const values = [];
	let i = 0;
	while (i < text.length) {
		const open = text.indexOf('{', i);
		if (open === -1) break;
		let depth = 1;
		let j = open + 1;
		while (j < text.length && depth > 0) {
			if (text[j] === '{') depth++;
			else if (text[j] === '}') depth--;
			j++;
		}
		const close = j - 1;
		const body = text.slice(open + 1, Math.max(close, open + 1));
		if (body.includes('{')) {
			values.push(...collectDeclarationValues(body));
		} else {
			values.push(...declarationsToValues(body));
		}
		i = close > open ? close + 1 : text.length;
	}
	return values;
}

// Inline `style` attributes/expressions — `style="..."`, `style='...'`,
// `style={"..."}`, `style={'...'}`, `` style={`...`} `` — sit in HTML/JSX
// attribute position, never inside a CSS rule's `{ }`, so the brace-walk
// above cannot see them. They are a second, explicitly named source rather
// than a reason to drop the brace requirement and scan every `prop: value`
// pair in a file: `.astro` frontmatter is TypeScript, where that would also
// catch type annotations (`title: string`) and ordinary prose containing a
// colon, producing false positives instead of removing them.
const STYLE_ATTR =
	/\bstyle\s*=\s*(?:\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\}|\{\s*`([^`]*)`\s*\}|"([^"]*)"|'([^']*)')/g;

function collectInlineStyleValues(text) {
	const values = [];
	for (const match of text.matchAll(STYLE_ATTR)) {
		const content = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? '';
		values.push(...declarationsToValues(content));
	}
	return values;
}

function findColoursInValue(value) {
	const found = [];
	for (const match of value.match(HEX) ?? []) found.push(match);
	for (const match of value.match(COLOUR_FUNCTION) ?? []) found.push(match);
	for (const raw of value.match(WORD) ?? []) {
		const word = raw.toLowerCase();
		if (ALLOWED_KEYWORDS.has(word)) continue;
		if (NAMED_COLOURS.has(word)) found.push(raw);
	}
	return found;
}

/**
 * Finds literal colour values in text: hex codes, colour functions (`rgb`,
 * `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color`),
 * and CSS named colours such as `white` or `red` — but not the
 * `transparent` or `currentColor` keywords, which carry no theme
 * information.
 *
 * Scans two explicitly named sources, unioned:
 *  1. CSS declaration values inside brace-delimited blocks (a `<style>`
 *     block, or a whole `.css` file) — the text between a property's `:`
 *     and the declaration's terminating `;`/`}`/end. Selectors,
 *     pseudo-classes, attribute selectors, comments and property names are
 *     excluded by construction, since they never sit inside a leaf block's
 *     declaration list.
 *  2. Inline `style` attributes/expressions anywhere in the text —
 *     `style="..."`, `style='...'`, `style={"..."}`, `style={'...'}`,
 *     `` style={`...`} `` — which sit in markup, not inside any `{ }`, so
 *     source 1 alone would silently miss them.
 *
 * `cssText` must be CSS: a bare declaration list (e.g. `"color: white;"`) or
 * a full stylesheet. For the text of a source file — anything that is not
 * CSS at its top level — use `findColourLiteralsInFile` instead.
 *
 * Returns an array of the matched colour snippets (empty if none).
 */
export function findColourLiterals(cssText) {
	const withoutComments = stripComments(cssText);
	// The `{ }` wrapper is what lets a bare declaration list be scanned: it
	// makes the whole text one leaf block. That is correct ONLY when the
	// caller genuinely has CSS. For a source file it is a lie — see
	// `findColourLiteralsInFile`.
	const braceValues = collectDeclarationValues(`{${withoutComments}}`);
	const inlineStyleValues = collectInlineStyleValues(withoutComments);
	return collectOffenders(braceValues, inlineStyleValues);
}

/**
 * Finds literal colour values in the text of a **source file** of any type —
 * `.css`, `.astro`, `.ts`, `.js`, `.md`, `.mdx`.
 *
 * Same detector as `findColourLiterals`, same two sources, with one
 * difference that matters: the text is NOT wrapped in `{ }` first. Only
 * genuine brace-delimited blocks are treated as declaration lists.
 *
 * That distinction is the whole point of this function existing separately.
 * `findColourLiterals` wraps its input so that a bare `color: red;` snippet
 * scans as a declaration list. Applied to a file with no inner braces —
 * every ordinary `.md`/`.mdx`, and any brace-free `.ts` — the wrapper turns
 * the entire file into one "declaration": frontmatter supplies the first
 * colon, and everything after it becomes a "value", so any CSS named colour
 * occurring in ordinary prose is reported. A post titled
 * `title: 'Blue-green deploys in Go'` whose body says "there is no silver
 * bullet" yields `["silver"]`. `silver`, `white`, `gold`, `olive`, `navy`,
 * `teal`, `tan`, `plum`, `coral`, `snow`, `ivory`, `khaki`, `brown`, `gray`
 * and `grey` are all ordinary developer prose.
 *
 * Dropping the wrapper costs nothing real. No file on disk has CSS
 * declarations at its top level: a `.css` file's declarations all live
 * inside rule blocks, an `.astro` file's inside its `<style>` block, and a
 * `.md` file has none at all. What a `.md` file *can* carry is an inline
 * `style="color:#fff"` — the case the widened walk exists for — and that is
 * found by the inline-style source, which is unaffected.
 */
export function findColourLiteralsInFile(text) {
	const withoutComments = stripComments(text);
	const braceValues = collectDeclarationValues(withoutComments);
	const inlineStyleValues = collectInlineStyleValues(withoutComments);
	return collectOffenders(braceValues, inlineStyleValues);
}

function collectOffenders(braceValues, inlineStyleValues) {
	const offenders = [];
	for (const value of [...braceValues, ...inlineStyleValues]) {
		offenders.push(...findColoursInValue(value));
	}
	return offenders;
}
