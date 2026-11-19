/**
 * AGLC4 Citations with and without Legal Core: the optional connection, sharing citations, Legal Core
 * being disabled and enabled mid-session, and the export being identical in every case.
 */
import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { AuthorityStore, MemoryBackend } from '@legal-core/authority-store';
import { DEFAULT_EXPORT, type ExportOptions, noteAuthorities } from '@legal-core/aglc';
import { LegalCoreLink, compatibleApi } from '../plugins/aglc4/src/legal-core';
import { createLegalCoreApi } from '../plugins/legal-core/src/api';
import { outputs } from './golden.test';

function legalCore() {
	const store = new AuthorityStore(new MemoryBackend());
	const api = createLegalCoreApi(store, { readFile: async () => '', selectedTemplate: () => null, saveSelectedTemplate: () => {} });
	return { api, store };
}

function link(sharing = true) {
	const host = { sharing: vi.fn(() => sharing), onConnected: vi.fn(), warn: vi.fn() };
	return { link: new LegalCoreLink(host), host };
}

const essay = readFileSync(new URL('fixtures/example-essay.md', import.meta.url), 'utf8');

describe('finding Legal Core', () => {
	it('accepts a compatible API, and nothing else', () => {
		expect(compatibleApi(legalCore().api)).not.toBeNull();
		expect(compatibleApi(undefined)).toBeNull();
		expect(compatibleApi({})).toBeNull();
		expect(compatibleApi({ ...legalCore().api, satisfies: () => false })).toBeNull();
		expect(compatibleApi({ ...legalCore().api, satisfies: () => { throw new Error('broken'); } })).toBeNull();
	});

	it('registers as an extension when connected, once', () => {
		const { api } = legalCore();
		const { link: l, host } = link();
		expect(l.connect(api)).toBe(true);
		expect(l.connect(api)).toBe(true);
		expect(api.extensionIds()).toEqual(['aglc-citations']);
		expect(host.onConnected).toHaveBeenCalledTimes(1);
	});

	it('stays as it is when Legal Core is missing or incompatible', () => {
		const { link: l, host } = link();
		expect(l.connect(undefined)).toBe(false);
		expect(l.connect({ satisfies: () => false })).toBe(false);
		expect(l.api).toBeNull();
		expect(host.onConnected).not.toHaveBeenCalled();
	});
});

describe('sharing citations', () => {
	it('shares every correct, full citation of a note, with the note', async () => {
		const { api, store } = legalCore();
		const { link: l } = link();
		l.connect(api);
		const shared = await l.shareNote('Essay.md', essay);
		const records = await store.query();
		expect(shared).toBe(noteAuthorities(essay, 'Essay.md').length);
		expect(records.map((r) => r.title)).toEqual(expect.arrayContaining(['*Mabo v Queensland [No 2]*', '*Native Title Act 1993*', '*Love v Commonwealth*']));
		expect(records.every((r) => r.sources.includes('aglc-citations') && r.notes.includes('Essay.md'))).toBe(true);
		// The practice citations with AGLC4 errors are not shared until they are corrected.
		expect(records.some((r) => r.title.includes('Yorta Yorta'))).toBe(false);
		expect(records.some((r) => r.title.includes('Griffiths'))).toBe(false);
		// Pinpoints are left out.
		expect(records.find((r) => r.title === '*Native Title Act 1993*')!.citation).toBe('*Native Title Act 1993* (Cth)');
	});

	it('shares a corrected citation under the same record', async () => {
		const { api, store } = legalCore();
		const { link: l } = link();
		l.connect(api);
		await l.shareNote('A.md', 'Text.[^1]\n\n[^1]: *Love v Commonwealth* (2020) HCA 3.\n');
		expect(await store.query()).toEqual([]);
		await l.shareNote('A.md', 'Text.[^1]\n\n[^1]: *Love v Commonwealth* [2020] HCA 3.\n');
		await l.shareNote('B.md', 'Text.[^1]\n\n[^1]: *Love v Commonwealth* [2020] HCA 3, [81].\n');
		const [love] = await store.query();
		expect(love!.notes).toEqual(['A.md', 'B.md']);
	});

	it('never removes a record, and shares nothing when sharing is off', async () => {
		const { api, store } = legalCore();
		const on = link();
		on.link.connect(api);
		await on.link.shareNote('Essay.md', essay);
		const before = (await store.query()).length;
		await on.link.shareNote('Essay.md', 'All citations deleted.');
		expect((await store.query()).length).toBe(before);
		const off = link(false);
		const other = legalCore();
		off.link.connect(other.api);
		expect(await off.link.shareNote('Essay.md', essay)).toBe(0);
		expect(await other.store.query()).toEqual([]);
	});
});

describe('Legal Core disabled and enabled mid-session', () => {
	it('stops sharing when it unloads, and reconnects to a new instance', async () => {
		const first = legalCore();
		const { link: l, host } = link();
		l.connect(first.api);
		l.disconnect();
		expect(l.api).toBeNull();
		expect(await l.shareNote('Essay.md', essay)).toBe(0);
		expect(await first.store.query()).toEqual([]);
		// Enabled again: a new Legal Core, with its own registry.
		const second = legalCore();
		expect(l.connect(second.api)).toBe(true);
		expect(host.onConnected).toHaveBeenCalledTimes(2);
		expect(second.api.extensionIds()).toEqual(['aglc-citations']);
		expect(await l.shareNote('Essay.md', essay)).toBeGreaterThan(0);
	});

	it('stops part-way through a note if Legal Core goes', async () => {
		const { api, store } = legalCore();
		const { link: l } = link();
		l.connect(api);
		const upsert = api.authorities.upsert;
		let calls = 0;
		api.authorities.upsert = async (input) => { if (++calls === 2) l.disconnect(); return upsert(input); };
		await l.shareNote('Essay.md', essay);
		expect((await store.query()).length).toBe(2);
	});
});

describe('export is the same with and without Legal Core', () => {
	const fixtures = new URL('fixtures/', import.meta.url);
	const names = readdirSync(fixtures).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

	async function goldens(): Promise<Record<string, Record<string, string>>> {
		const out: Record<string, Record<string, string>> = {};
		for (const name of names) {
			const optionsFile = new URL(`${name}.options.json`, fixtures);
			const opts: ExportOptions = { ...DEFAULT_EXPORT, ...(existsSync(optionsFile) ? JSON.parse(readFileSync(optionsFile, 'utf8')) : {}) };
			out[name] = await outputs(readFileSync(new URL(`${name}.md`, fixtures), 'utf8'), opts);
		}
		return out;
	}
	const stored = (name: string, file: string) => readFileSync(new URL(`golden/${name}/${file}`, import.meta.url), 'utf8');

	it('matches the golden exports when Legal Core is absent, present, and disabled again', async () => {
		const { link: l } = link();
		const absent = await goldens();
		const { api } = legalCore();
		const exportDocx = vi.spyOn(api, 'exportDocx');
		l.connect(api);
		await l.shareNote('Essay.md', essay);
		const present = await goldens();
		l.disconnect();
		const disabled = await goldens();
		for (const name of names) {
			for (const file of Object.keys(absent[name]!)) {
				expect(absent[name]![file], `${name}/${file}`).toBe(stored(name, file));
				expect(present[name]![file], `${name}/${file} with Legal Core`).toBe(stored(name, file));
				expect(disabled[name]![file], `${name}/${file} after Legal Core is disabled`).toBe(stored(name, file));
			}
		}
		// AGLC4 Citations exports with its own engine, never Legal Core's.
		expect(exportDocx).not.toHaveBeenCalled();
	});
});
