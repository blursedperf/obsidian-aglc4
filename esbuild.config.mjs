/**
 * Builds the plugins (see scripts/build-plugin.mjs). "production" builds once; otherwise it watches.
 *
 * AGLC4 Citations writes main.js at the repository root, beside the manifest.json, versions.json and
 * styles.css that Obsidian and the release workflow read there. Legal Core writes plugins/legal-core/main.js.
 */
import process from 'process';
import { buildAll, watchAll } from './scripts/build-plugin.mjs';

const PLUGINS = [
	{ id: 'aglc4', name: 'AGLC4 Citations', entry: 'plugins/aglc4/src/main.ts', outfile: 'main.js' },
	{ id: 'legal-core', name: 'Legal Core', entry: 'plugins/legal-core/src/main.ts', outfile: 'plugins/legal-core/main.js' },
];

// The second argument picks the plugins: "aglc4" (the default, used by the release workflow through
// `npm run build`), "legal-core", or "all". Releasing AGLC4 Citations never depends on Legal Core building.
const which = process.argv[3] ?? 'aglc4';
const selected = which === 'all' ? PLUGINS : PLUGINS.filter((p) => p.id === which);
if (selected.length === 0) throw new Error(`Unknown plugin "${which}": use aglc4, legal-core or all.`);

if (process.argv[2] === 'production') {
	await buildAll(selected);
	process.exit(0);
} else {
	await watchAll(selected);
}
