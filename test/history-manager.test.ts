import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as obsidian from './obsidian-stub';

// The manager uses window timers, as in Obsidian.
(globalThis as { window?: unknown }).window ??= globalThis;
import { HistoryManager, type HistorySettings } from '../plugins/aglc4/src/history/manager';

type Handler = (...args: unknown[]) => void;

/** A vault in memory: its files, an adapter over the same storage, and its events. */
function fakeApp() {
	const files = new Map<string, Uint8Array>();
	const folders = new Set<string>();
	const handlers = new Map<string, Handler[]>();
	const enc = (s: string) => new TextEncoder().encode(s);
	const adapter = {
		exists: async (p: string) => files.has(p) || folders.has(p),
		read: async (p: string) => new TextDecoder().decode(files.get(p)),
		write: async (p: string, d: string) => { files.set(p, enc(d)); },
		readBinary: async (p: string) => files.get(p)!.slice().buffer,
		writeBinary: async (p: string, d: ArrayBuffer) => { files.set(p, new Uint8Array(d.slice(0))); },
		remove: async (p: string) => { files.delete(p); },
		rename: async (a: string, b: string) => { files.set(b, files.get(a)!); files.delete(a); },
		mkdir: async (p: string) => { folders.add(p); },
		list: async (p: string) => {
			const kids = (set: Iterable<string>) => [...set].filter((f) => f.startsWith(`${p}/`) && !f.slice(p.length + 1).includes('/'));
			return { files: kids(files.keys()), folders: kids(folders) };
		},
		stat: async (p: string) => (files.has(p) ? { size: files.get(p)!.byteLength, mtime: 1 } : null),
	};
	const tfiles = new Map<string, obsidian.TFile>();
	const on = (name: string) => (fn: Handler) => { handlers.set(name, [...(handlers.get(name) ?? []), fn]); return {}; };
	const emit = (name: string, ...args: unknown[]) => { for (const h of handlers.get(name) ?? []) h(...args); };
	const vault = {
		adapter,
		on: (name: string, fn: Handler) => on(name)(fn),
		read: async (f: obsidian.TFile) => new TextDecoder().decode(files.get(f.path)),
		getAbstractFileByPath: (p: string) => tfiles.get(p) ?? null,
	};
	const workspace = { on: (name: string, fn: Handler) => on(`ws:${name}`)(fn) };
	const app = { vault, workspace } as never;
	const write = (path: string, text: string) => {
		files.set(path, enc(text));
		let f = tfiles.get(path);
		if (!f) { f = new obsidian.TFile(path); tfiles.set(path, f); }
		emit('modify', f);
		return f;
	};
	return { app, files, emit, write, tfiles };
}

describe('history manager in a vault', () => {
	let settings: HistorySettings;
	beforeEach(() => {
		vi.useFakeTimers();
		settings = { historyEnabled: true, historyFolder: '.aglc-history', historyInterval: 2, historyKeepAll: false };
	});
	afterEach(() => { vi.useRealTimers(); });

	function setup() {
		const v = fakeApp();
		const m = new HistoryManager(v.app, () => settings);
		m.register({ registerEvent: () => undefined } as never);
		return { ...v, m };
	}
	const settle = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); await vi.runOnlyPendingTimersAsync(); };

	it('saves at most one version per interval while writing, with the latest text', async () => {
		const { m, write } = setup();
		write('Essay.md', 'one');
		await vi.advanceTimersByTimeAsync(5_000);
		expect((await m.versions('Essay.md')).length).toBe(1);
		// Typing for a minute: no new version until the interval has passed.
		for (let i = 0; i < 6; i++) { write('Essay.md', `typing ${i}`); await vi.advanceTimersByTimeAsync(10_000); }
		expect((await m.versions('Essay.md')).length).toBe(1);
		await vi.advanceTimersByTimeAsync(2 * 60_000);
		const vs = await m.versions('Essay.md');
		expect(vs.length).toBe(2);
		expect(await m.read('Essay.md', vs[0]!)).toBe('typing 5');
	});

	it('saves the waiting version when you leave the note', async () => {
		const { m, write } = setup();
		write('Essay.md', 'first');
		await vi.advanceTimersByTimeAsync(5_000);
		const f = write('Essay.md', 'changed');
		m.flush(f);
		await settle();
		expect(await m.read('Essay.md', (await m.versions('Essay.md'))[0]!)).toBe('changed');
	});

	it('follows renames and keeps deleted notes', async () => {
		const { m, write, emit, tfiles } = setup();
		const f = write('Draft.md', 'text');
		await vi.advanceTimersByTimeAsync(5_000);
		emit('rename', new obsidian.TFile('Final.md'), 'Draft.md');
		await settle();
		expect((await m.versions('Final.md')).length).toBe(1);
		emit('delete', new obsidian.TFile('Final.md'));
		await settle();
		const [gone] = await m.deleted();
		expect(gone!.path).toBe('Final.md');
		expect(await m.readDeleted(gone!, gone!.versions[0]!)).toBe('text');
		expect(tfiles.get('Draft.md')).toBe(f);
	});

	it('does nothing when turned off, and never tracks its own folder', async () => {
		const { m, write, files } = setup();
		settings.historyEnabled = false;
		write('Essay.md', 'x');
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect([...files.keys()].some((k) => k.startsWith('.aglc-history'))).toBe(false);
		expect(await m.snapshot('Essay.md', 'x')).toBe(false);
		settings.historyEnabled = true;
		expect(m.tracks(new obsidian.TFile('.aglc-history/entries/a/entry.json'))).toBe(false);
		expect(m.tracks(new obsidian.TFile('.aglc-history/x.md'))).toBe(false);
		expect(m.tracks(new obsidian.TFile('Notes/Essay.md'))).toBe(true);
	});

	it('reports a failure once, and says the content is not safe', async () => {
		const { m, app } = setup();
		(app.vault.adapter as unknown as { writeBinary: () => Promise<void> }).writeBinary = () => Promise.reject(new Error('disk full'));
		expect(await m.snapshot('Essay.md', 'x')).toBe(false);
		expect(await m.snapshot('Essay.md', 'y')).toBe(false);
		const notices = obsidian.notices.filter((n) => n.includes('disk full'));
		expect(notices).toHaveLength(1);
	});
});
