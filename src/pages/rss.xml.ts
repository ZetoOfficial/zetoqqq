import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context: APIContext) {
	const posts = await getCollection('blog');
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
