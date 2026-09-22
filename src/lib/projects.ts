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
