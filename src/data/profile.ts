export type Link = { label: string; href: string };

export type Profile = {
	name: string;
	role: string;
	location: string;
	now: string;
	links: Link[];
};

/**
 * Single source of truth for identity. No page restates any of this.
 */
export const profile: Profile = {
	name: 'Pavel Titov',
	role: 'Go backend engineer',
	location: 'Dubai / remote',
	// TODO: Pavel — rewrite in your own words. This is drafted from the CV.
	now: 'Backend at Tabby, working on checkout and payments. Starting a master’s in AI at ITMO. Spending my evenings on LLM agents and the unglamorous problem of evaluating them.',
	links: [
		{ label: 'github', href: 'https://github.com/ZetoOfficial' },
		{ label: 'linkedin', href: 'https://linkedin.com/in/zetoqqq' },
		{ label: 'email', href: 'mailto:zetoqqq@gmail.com' },
	],
};
