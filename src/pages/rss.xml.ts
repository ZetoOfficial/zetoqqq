import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { sortPosts } from '../lib/posts';

export async function GET(context: APIContext) {
	// `getCollection` returns the glob loader's order, not date order, so the
	// feed has to sort like every other consumer of this collection. Readers
	// expect newest first, and `sortPosts` is the one place that ordering is
	// decided — see src/lib/posts.ts.
	const posts = sortPosts(await getCollection('blog'));
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		// `site` is configured in astro.config.mjs, so this is always set at
		// build time; @astrojs/rss types it as required while APIContext types
		// it as possibly undefined (it is undefined only for a site-less
		// config, which this project does not have).
		site: context.site!,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
	});
}
