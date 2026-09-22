export type NavItem = {
	href: string;
	label: string;
	/** Present in the nav but not yet a destination: rendered as text, not a link. */
	pending?: boolean;
};

/**
 * `blog` is always listed. While the collection is empty it is pending — the
 * header renders it as dimmed text with a "soon..." hint instead of a link —
 * and the first published post turns it into a real destination with no
 * further change here.
 */
export function buildNav(hasPosts: boolean): NavItem[] {
	return [
		{ href: '/', label: 'home' },
		{ href: '/projects', label: 'projects' },
		{ href: '/blog', label: 'blog', pending: !hasPosts },
	];
}
