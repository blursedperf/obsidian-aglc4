/**
 * The release contract of AGLC4 Citations. Obsidian's community directory lists the plugin from this
 * repository (blursedperf/obsidian-aglc4): it reads manifest.json and versions.json at the repository
 * root to find updates, and installs main.js, manifest.json and styles.css from the GitHub release of that
 * version. Users get updates only while all of that holds, so these tests fail if any of it changes.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const json = (path: string) => JSON.parse(read(path)) as Record<string, unknown>;

describe('AGLC4 Citations release contract', () => {
	const manifest = json('manifest.json');

	it('keeps its id and identity in the root manifest', () => {
		expect(manifest.id).toBe('aglc-citations');
		expect(manifest.name).toBe('AGLC4 Citations');
		expect(manifest.isDesktopOnly).toBe(false);
		expect(String(manifest.version)).toMatch(/^\d+\.\d+\.\d+$/);
		expect(String(manifest.minAppVersion)).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it('lists every version, with its minimum Obsidian version, in the root versions.json', () => {
		const versions = json('versions.json');
		expect(versions[String(manifest.version)]).toBe(manifest.minAppVersion);
		// Versions are only ever added, never removed (older Obsidian versions read them).
		for (const v of ['1.0.0', '1.5.0', '1.9.3']) expect(versions[v]).toBeDefined();
	});

	it('has the same version in package.json, so npm version bumps both', () => {
		expect(json('package.json').version).toBe(manifest.version);
		const bump = read('version-bump.mjs');
		expect(bump).toContain("readFileSync('manifest.json'");
		expect(bump).toContain("readFileSync('versions.json'");
	});

	it('keeps its styles at the root', () => {
		expect(existsSync(new URL('styles.css', root))).toBe(true);
	});

	it('builds main.js at the root with `npm run build`, without Legal Core', () => {
		const pkg = json('package.json') as { scripts: Record<string, string> };
		expect(pkg.scripts.build).toContain('esbuild.config.mjs production aglc4');
		expect(pkg.scripts.build).not.toMatch(/legal-core|\ball\b/);
		const config = read('esbuild.config.mjs');
		expect(config).toMatch(/id: 'aglc4',[^\n]*entry: 'plugins\/aglc4\/src\/main\.ts', outfile: 'main\.js'/);
	});

	it('releases main.js, manifest.json and styles.css from the root', () => {
		const workflow = read('.github/workflows/release.yml');
		expect(workflow).toContain('npm run build');
		expect(workflow).toMatch(/gh release create[\s\S]*main\.js manifest\.json/);
		expect(workflow).toMatch(/subject-path: \|\s*\n\s*main\.js/);
	});

	it('does not let Legal Core take over the repository root', () => {
		const core = JSON.parse(read('plugins/legal-core/manifest.json')) as Record<string, unknown>;
		expect(core.id).not.toBe(manifest.id);
		expect(read('README.md').split('\n')[0]).toBe('# AGLC4 Citations for Obsidian');
	});
});
