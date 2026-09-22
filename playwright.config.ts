import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	use: {
		baseURL: 'http://localhost:4322',
	},
	webServer: {
		// Astro 7's CLI auto-backgrounds `astro preview` when it detects an
		// agentic coding environment (e.g. Claude Code): the command process
		// prints a status line and exits immediately, leaving a detached
		// daemon behind. Playwright's webServer runner sees that exit and
		// treats it as a startup failure, even though the port is live.
		// `--ignore-lock` is a real, documented Astro CLI flag (confirmed via
		// `astro preview --help`) that forces the foreground/blocking code
		// path instead, so this behaves the same in CI and normal terminals,
		// where the agent-detection branch never triggers anyway.
		//
		// The port is 4322, not Astro's default 4321, so this never silently
		// reuses a `astro dev` server left running on 4321 (this project's own
		// CLAUDE.md tells you to run `astro dev --background`) instead of the
		// `build && preview` this config actually asks for.
		command: 'npm run build && npm run preview -- --port 4322 --ignore-lock',
		url: 'http://localhost:4322',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
