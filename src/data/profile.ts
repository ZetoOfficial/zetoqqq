export type Link = { label: string; href: string };

export type Profile = {
	name: string;
	role: string;
	/**
	 * A line about where Pavel is, which is deliberately not a place: he has
	 * no fixed one. Named for what it does rather than for a location, so it
	 * does not start lying again if the joke changes.
	 */
	tagline: string;
	now: string;
	links: Link[];
};

/**
 * Single source of truth for identity. No page restates any of this.
 */
export const profile: Profile = {
	name: 'Pavel Titov',
	role: 'Go backend engineer',
	tagline: 'currently somewhere with wifi',
	// TODO: Pavel — rewrite in your own words. This is drafted from the CV.
	now: 'Backend at Tabby, working on checkout and payments. Starting a master’s in AI at ITMO. Spending my evenings on LLM agents and the unglamorous problem of evaluating them.',
	links: [
		{ label: 'github', href: 'https://github.com/ZetoOfficial' },
		{ label: 'linkedin', href: 'https://linkedin.com/in/zetoqqq' },
		{ label: 'email', href: 'mailto:zetoqqq@gmail.com' },
	],
};
