type Publishable = { data: { draft?: boolean } };
type Sortable = { data: { date: Date; draft?: boolean } };

/**
 * True unless the entry is explicitly marked `draft: true`. An entry with no
 * `draft` field (as the Zod schema defaults it, or a hand-built test fixture
 * that omits it) counts as published.
 */
export function isPublished<T extends Publishable>(entry: T): boolean {
	return !entry.data.draft;
}

/**
 * Drops drafts and orders newest first. Returns a new array.
 */
export function sortProjects<T extends Sortable>(entries: T[]): T[] {
	return entries
		.filter(isPublished)
		.slice()
		.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
