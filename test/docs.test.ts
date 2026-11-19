import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { EXAMPLE, GROUPS } from '../plugins/aglc4/src/settings';
import { NOTE_PROPERTIES } from '../plugins/aglc4/src/scope';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const docs = readdirSync(new URL('docs/', root)).filter((f) => f.endsWith('.md'));

/** Every rule identifier the checker can raise, read from its source. */
function ruleIds(): string[] {
	const ids = new Set<string>();
	const grammar = read('packages/aglc/src/grammar.ts');
	for (const m of grammar.matchAll(/issue\(\w+, '([a-z0-9-]+)'/g)) ids.add(m[1]!);
	for (const m of grammar.matchAll(/, '(case-[a-z-]+)', '/g)) ids.add(m[1]!);
	for (const f of ['citation', 'document', 'lint']) {
		const src = read(`packages/aglc/src/${f}.ts`);
		for (const m of src.matchAll(/rule: '([a-z0-9-]+)'/g)) ids.add(m[1]!);
		for (const m of src.matchAll(/issue\(\w+, '([a-z0-9-]+)'/g)) ids.add(m[1]!);
	}
	return [...ids].sort();
}

/** GitHub's anchor for a heading. */
function slug(heading: string): string {
	return heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
}

describe('docs', () => {
	it('document every rule', () => {
		const ids = ruleIds();
		expect(ids.length).toBeGreaterThan(100);
		const documented = new Set([...read('docs/rules.md').matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]));
		expect(ids.filter((id) => !documented.has(id))).toEqual([]);
		// And nothing that is not a rule.
		expect([...documented].filter((id) => !ids.includes(id!))).toEqual([]);
	});

	it('document every command', () => {
		const names = [...read('plugins/aglc4/src/main.ts').matchAll(/addCommand\(\{\s*id: '[a-z-]+',\s*name: '([^']+)'/g)].map((m) => m[1]!);
		expect(names.length).toBeGreaterThan(15);
		const page = read('docs/commands.md');
		expect(names.filter((n) => !page.includes(`**${n}**`))).toEqual([]);
	});

	it('document every setting', () => {
		const page = read('docs/settings.md');
		const names = [EXAMPLE.name, ...GROUPS.flatMap((g) => g.items.map((i) => i.name))];
		expect(names.filter((n) => !page.includes(`**${n}**`))).toEqual([]);
		expect(GROUPS.map((g) => g.heading).filter((h) => !page.includes(`## ${h}`))).toEqual([]);
	});

	it('document every note property', () => {
		const page = read('docs/notes.md');
		expect(Object.keys(NOTE_PROPERTIES).filter((p) => !page.includes(`\`${p}\``))).toEqual([]);
	});

	it('list every page in the index', () => {
		const index = read('docs/README.md');
		expect(docs.filter((f) => f !== 'README.md' && !index.includes(`](${f})`))).toEqual([]);
	});

	it('have no broken links between pages', () => {
		const broken: string[] = [];
		for (const file of [...docs.map((f) => `docs/${f}`), 'README.md']) {
			const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
			for (const m of read(file).matchAll(/\]\(([^)\s]+)\)/g)) {
				const target = m[1]!;
				if (/^[a-z]+:/.test(target)) continue;
				const [path, anchor] = target.split('#');
				const resolved = path ? new URL(`${dir}${path}`, root) : new URL(file, root);
				if (!existsSync(resolved)) { broken.push(`${file}: ${target}`); continue; }
				if (anchor && resolved.pathname.endsWith('.md')) {
					const headings = [...readFileSync(resolved, 'utf8').matchAll(/^#{1,6} (.+)$/gm)].map((h) => slug(h[1]!));
					if (!headings.includes(anchor)) broken.push(`${file}: ${target}`);
				}
			}
		}
		expect(broken).toEqual([]);
	});
});
