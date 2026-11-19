/**
 * Builds the plugins (see scripts/build-plugin.mjs). "production" builds once; otherwise it watches.
 *
 * AGLC4 Citations writes main.js at the repository root, beside the manifest.json, versions.json and
 * styles.css that Obsidian and the release workflow read there. Legal Core writes plugins/legal-core/main.js.
 */
import process from 'process';
import { buildAll, watchAll } from './scripts/build-plugin.mjs';

const PLUGINS = [
	{ name: 'AGLC4 Citations', entry: 'plugins/aglc4/src/main.ts', outfile: 'main.js' },
	{ name: 'Legal Core', entry: 'plugins/legal-core/src/main.ts', outfile: 'plugins/legal-core/main.js' },
];

if (process.argv[2] === 'production') {
	await buildAll(PLUGINS);
	process.exit(0);
} else {
	await watchAll(PLUGINS);
}
