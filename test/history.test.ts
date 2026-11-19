import { describe, expect, it } from 'vitest';
import { type HistoryFs, HistoryCorruptError, HistoryStore, thinVersions, type Version } from '../plugins/aglc4/src/history/store';

/** An in-memory file system. `failAfter` makes the n-th write or rename from now on throw, like a crash. */
class MemFs implements HistoryFs {
	files = new Map<string, Uint8Array>();
	folders = new Set<string>();
	failAfter = Infinity;
	private step() { if (--this.failAfter < 0) throw new Error('crash'); }
	async exists(p: string) { return this.files.has(p) || this.folders.has(p); }
	async read(p: string) { const f = this.files.get(p); if (!f) throw new Error(`no ${p}`); return new TextDecoder().decode(f); }
	async write(p: string, d: string) { this.step(); this.files.set(p, new TextEncoder().encode(d)); }
	async readBinary(p: string) { const f = this.files.get(p); if (!f) throw new Error(`no ${p}`); return f.slice().buffer; }
	async writeBinary(p: string, d: ArrayBuffer) { this.step(); this.files.set(p, new Uint8Array(d.slice(0))); }
	async remove(p: string) { this.files.delete(p); }
	async rename(a: string, b: string) { this.step(); if (this.files.has(b)) throw new Error('exists'); this.files.set(b, this.files.get(a)!); this.files.delete(a); }
	async mkdir(p: string) { this.folders.add(p); }
	async list(p: string) {
		const kids = (set: Iterable<string>) => [...set].filter((f) => f.startsWith(`${p}/`) && !f.slice(p.length + 1).includes('/'));
		return { files: kids(this.files.keys()), folders: kids(this.folders) };
	}
	async stat(p: string) { const f = this.files.get(p); return f ? { size: f.byteLength, mtime: 0 } : null; }
}

function setup(start = 1_000_000) {
	const fs = new MemFs();
	let now = start;
	const store = new HistoryStore(fs, '.aglc-history', { now: () => now });
	return { fs, store, tick: (ms: number) => { now += ms; }, fresh: () => new HistoryStore(fs, '.aglc-history', { now: () => now }) };
}

describe('history store', () => {
	it('saves versions and reads them back, newest first', async () => {
		const { store, tick } = setup();
		await store.snapshot('Essay.md', 'one');
		tick(1000);
		await store.snapshot('Essay.md', 'two', { label: 'Before tidying footnotes' });
		const vs = await store.versions('Essay.md');
		expect(vs.map((v) => v.label ?? '')).toEqual(['Before tidying footnotes', '']);
		expect(await store.read('Essay.md', vs[0]!)).toBe('two');
		expect(await store.read('Essay.md', vs[1]!)).toBe('one');
	});

	it('does not save a version identical to the newest, but names it', async () => {
		const { store } = setup();
		await store.snapshot('Essay.md', 'same');
		expect(await store.snapshot('Essay.md', 'same')).toBeNull();
		await store.snapshot('Essay.md', 'same', { name: 'Submitted draft' });
		const vs = await store.versions('Essay.md');
		expect(vs).toHaveLength(1);
		expect(vs[0]!.name).toBe('Submitted draft');
	});

	it('keeps binary versions (Word files) byte for byte', async () => {
		const { store } = setup();
		const bytes = new Uint8Array([80, 75, 3, 4, 0, 255, 7]).buffer;
		await store.snapshot('Essay.docx', bytes, { label: 'Before export' });
		const [v] = await store.versions('Essay.docx');
		expect(v!.binary).toBe(true);
		expect(new Uint8Array((await store.read('Essay.docx', v!)) as ArrayBuffer)).toEqual(new Uint8Array(bytes));
	});

	it('is read back by a new store (after a restart)', async () => {
		const { store, fresh } = setup();
		await store.snapshot('Essay.md', 'kept');
		const again = fresh();
		const [v] = await again.versions('Essay.md');
		expect(await again.read('Essay.md', v!)).toBe('kept');
	});

	it('follows a renamed file, and keeps the history of a deleted one', async () => {
		const { store, tick, fresh } = setup();
		await store.snapshot('Draft.md', 'text');
		await store.rename('Draft.md', 'Essays/Final.md');
		expect(await store.versions('Draft.md')).toEqual([]);
		expect(await store.versions('Essays/Final.md')).toHaveLength(1);
		tick(5000);
		await store.markDeleted('Essays/Final.md');
		expect(await store.versions('Essays/Final.md')).toEqual([]);
		const [gone] = await fresh().deleted();
		expect(gone!.path).toBe('Essays/Final.md');
		expect(await store.readDeleted(gone!, gone!.versions[0]!)).toBe('text');
		await store.undelete(gone!, 'Essays/Final.md');
		expect(await store.versions('Essays/Final.md')).toHaveLength(1);
		expect(await store.deleted()).toEqual([]);
	});

	it('starts a new history for a new file at a deleted file\'s path', async () => {
		const { store } = setup();
		await store.snapshot('A.md', 'old');
		await store.markDeleted('A.md');
		await store.snapshot('A.md', 'new');
		expect((await store.versions('A.md')).length).toBe(1);
		expect(await store.deleted()).toHaveLength(1);
	});

	it('rejects a damaged version instead of restoring it', async () => {
		const { fs, store } = setup();
		await store.snapshot('Essay.md', 'precious');
		const [v] = await store.versions('Essay.md');
		const file = [...fs.files.keys()].find((f) => f.endsWith('.gz'))!;
		const { gzipSync, strToU8 } = await import('fflate');
		fs.files.set(file, gzipSync(strToU8('tampered')));
		await expect(store.read('Essay.md', v!)).rejects.toBeInstanceOf(HistoryCorruptError);
	});

	it('loses nothing when a write is interrupted at any point', async () => {
		// Crash at every possible step of a second snapshot: the first version must always survive, and
		// the store must keep working afterwards.
		for (let crashAt = 0; crashAt < 12; crashAt++) {
			const { fs, store, tick, fresh } = setup();
			await store.snapshot('Essay.md', 'first');
			tick(1000);
			fs.failAfter = crashAt;
			await store.snapshot('Essay.md', 'second').catch(() => undefined);
			fs.failAfter = Infinity;
			const after = fresh();
			const vs = await after.versions('Essay.md');
			const texts = await Promise.all(vs.map((v) => after.read('Essay.md', v)));
			expect(texts).toContain('first');
			tick(1000);
			await after.snapshot('Essay.md', 'third');
			expect(await after.read('Essay.md', (await after.versions('Essay.md'))[0]!)).toBe('third');
		}
	});

	it('rebuilds a lost index from the entries', async () => {
		const { fs, store, fresh } = setup();
		await store.snapshot('Essay.md', 'text');
		fs.files.delete('.aglc-history/index.json');
		expect(await fresh().versions('Essay.md')).toHaveLength(1);
	});

	it('runs concurrent snapshots one at a time', async () => {
		const { store } = setup();
		await Promise.all(['a', 'b', 'c', 'd'].map((t) => store.snapshot('Essay.md', t)));
		expect((await store.versions('Essay.md')).length).toBe(4);
	});

	it('reports what it uses', async () => {
		const { store } = setup();
		await store.snapshot('A.md', 'x'.repeat(10_000));
		await store.snapshot('B.md', 'y');
		const u = await store.usage();
		expect(u.files).toBe(2);
		expect(u.versions).toBe(2);
		expect(u.bytes).toBeGreaterThan(0);
		expect(u.bytes).toBeLessThan(2_000);
	});
});

describe('thinning', () => {
	const H = 60 * 60 * 1000;
	const D = 24 * H;
	const v = (time: number, name?: string): Version => ({ id: String(time), time, hash: String(time), size: 1, ...(name ? { name } : {}) });

	it('keeps everything from the last day, hourly for a month, then daily', () => {
		const now = 100 * D;
		const times = [
			now - 10 * 60_000, now - 5 * 60_000, now - 60_000, // last day: all kept
			now - 2 * D, now - 2 * D + 60_000, now - 2 * D + 120_000, // same hour two days ago: newest kept
			now - 40 * D, now - 40 * D + 2 * H, now - 40 * D + 4 * H, // same day 40 days ago: newest kept
		].sort((a, b) => a - b);
		const kept = thinVersions(times.map((t) => v(t)), now).map((x) => x.time);
		expect(kept).toEqual([now - 40 * D + 4 * H, now - 2 * D + 120_000, now - 10 * 60_000, now - 5 * 60_000, now - 60_000]);
	});

	it('never drops a named version or the newest', () => {
		const now = 100 * D;
		const vs = [v(now - 50 * D, 'Submitted'), v(now - 50 * D + H), v(now - 40 * D)];
		expect(thinVersions(vs, now)).toEqual(vs);
	});

	it('is skipped when every snapshot is kept', async () => {
		const fs = new MemFs();
		let now = 0;
		const store = new HistoryStore(fs, 'h', { now: () => now, keepAll: () => true });
		for (let i = 0; i < 5; i++) { await store.snapshot('A.md', `v${i}`); now += 60_000; }
		now += 90 * D;
		await store.snapshot('A.md', 'last');
		expect(await store.versions('A.md')).toHaveLength(6);
	});
});

import { preservesContent } from '@legal-core/md-pipeline';
import { tidyFootnotes } from '@legal-core/aglc';
import { VALID } from './corpus';

describe('tidy safety check', () => {
	const note = 'Intro.[^b] Then.[^a]\n\n[^a]: Second source.\n[^b]: First source.\n';

	it('accepts relabelling and reordering', () => {
		expect(preservesContent(note, 'Intro.[^1] Then.[^2]\n\n[^1]: First source.\n[^2]: Second source.\n')).toBe(true);
	});
	it('rejects lost or changed body text', () => {
		expect(preservesContent(note, 'Intro.[^1]\n\n[^1]: First source.\n[^2]: Second source.\n')).toBe(false);
		expect(preservesContent(note, 'Intro.[^1] Than.[^2]\n\n[^1]: First source.\n[^2]: Second source.\n')).toBe(false);
	});
	it('rejects a lost or changed footnote', () => {
		expect(preservesContent(note, 'Intro.[^1] Then.[^2]\n\n[^1]: First source.\n')).toBe(false);
		expect(preservesContent(note, 'Intro.[^1] Then.[^2]\n\n[^1]: First source.\n[^2]: Second sauce.\n')).toBe(false);
	});
	it('holds for tidying random notes', () => {
		// Pseudo-random notes: footnotes out of order, repeated, unused, inline, multi-paragraph, with a bibliography.
		let seed = 7;
		const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
		for (let k = 0; k < 300; k++) {
			const labels = Array.from({ length: 1 + rnd(8) }, (_, i) => ['1', 'x', `n${i}`, String(9 - i)][rnd(4)]! + i);
			const body = labels.map((l, i) => (rnd(5) === 0 ? `Para ${i} ^[Inline ${i}.]` : `Para ${i}.[^${l}]${rnd(4) === 0 ? ` Again.[^${l}]` : ''}`)).join(rnd(2) ? ' ' : '\n\n');
			const defs = [...labels].sort(() => rnd(3) - 1).map((l) => `[^${l}]: ${VALID[rnd(VALID.length)]}${rnd(6) === 0 ? '\n\n    Second paragraph.' : ''}`);
			if (rnd(4) === 0) defs.push('[^orphan]: Not referenced.');
			const bib = rnd(3) === 0 ? '\n\n# Bibliography\n\n*Mabo v Queensland [No 2]* (1992) 175 CLR 1\n' : '';
			const text = `# Essay\n\n${body}\n\n${defs.join('\n')}\n${bib}`;
			for (const opts of [{ renumber: true, convertInline: true }, { renumber: false, convertInline: false }]) {
				const r = tidyFootnotes(text, opts);
				expect(r.unsafe).toBeUndefined();
				expect(preservesContent(text, r.text)).toBe(true);
			}
		}
	});
});

import { diffLines } from '../plugins/aglc4/src/history/diff';

describe('line diff', () => {
	const apply = (d: ReturnType<typeof diffLines>) => ({
		a: d.filter((l) => l.type !== 'add').map((l) => l.text).join('\n'),
		b: d.filter((l) => l.type !== 'del').map((l) => l.text).join('\n'),
	});
	it('marks added and deleted lines', () => {
		expect(diffLines('a\nb\nc', 'a\nB\nc\nd')).toEqual([
			{ type: 'same', text: 'a' }, { type: 'del', text: 'b' }, { type: 'add', text: 'B' }, { type: 'same', text: 'c' }, { type: 'add', text: 'd' },
		]);
	});
	it('reproduces both texts for random edits', () => {
		let seed = 3;
		const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
		for (let k = 0; k < 300; k++) {
			const a = Array.from({ length: rnd(30) }, () => 'abcde'[rnd(5)]!);
			const b = [...a];
			for (let e = rnd(8); e > 0; e--) {
				const at = rnd(b.length + 1);
				if (rnd(2) && b.length) b.splice(at, 1); else b.splice(at, 0, 'xyz'[rnd(3)]!);
			}
			const r = apply(diffLines(a.join('\n'), b.join('\n')));
			expect(r).toEqual({ a: a.join('\n'), b: b.join('\n') });
		}
	});
	it('is fast for a long note with a small change', () => {
		const a = Array.from({ length: 20_000 }, (_, i) => `Line ${i}`).join('\n');
		const b = a.replace('Line 10000', 'Changed');
		const t = performance.now();
		expect(diffLines(a, b).filter((l) => l.type !== 'same')).toHaveLength(2);
		expect(performance.now() - t).toBeLessThan(200);
	});
});
