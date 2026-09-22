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
			for (const decl of body.split(';')) {
				const colon = decl.indexOf(':');
				if (colon === -1) continue;
				values.push(decl.slice(colon + 1).trim());
			}
		}
		i = close > open ? close + 1 : text.length;
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
 * Finds literal colour values in CSS text: hex codes, colour functions
 * (`rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`,
 * `color`), and CSS named colours such as `white` or `red` — but not the
 * `transparent` or `currentColor` keywords, which carry no theme
 * information.
 *
 * Only the value side of a declaration is scanned — the text between a
 * property's `:` and the declaration's terminating `;`/`}`/end — so
 * selectors, pseudo-classes, attribute selectors, comments and property
 * names are never treated as values. `cssText` may be a bare declaration
 * (e.g. `"color: white;"`) or a full stylesheet with selectors and nested
 * at-rules.
 *
 * Returns an array of the matched colour snippets (empty if none).
 */
export function findColourLiterals(cssText) {
	const withoutComments = stripComments(cssText);
	const values = collectDeclarationValues(`{${withoutComments}}`);
	const offenders = [];
	for (const value of values) {
		offenders.push(...findColoursInValue(value));
	}
	return offenders;
}
