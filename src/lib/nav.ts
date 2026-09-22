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
