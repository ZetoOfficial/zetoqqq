type Dated = { data: { pubDate: Date } };

/**
 * Orders blog posts newest first. Returns a new array — the caller's is
 * untouched. The counterpart to `sortProjects`, which sorts on `date`;
 * the blog collection's schema calls the same field `pubDate`.
 */
export function sortPosts<T extends Dated>(entries: T[]): T[] {
	return entries.slice().sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
