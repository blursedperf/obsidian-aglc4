/**
 * Version history: compressed snapshots of notes (and exported Word files), kept on disk in a folder of
 * the vault, independent of Obsidian.
 *
 * Layout under the history folder:
 *   index.json                 { "paths": { "<file path>": "<entry id>" } }  (rebuilt from entries if lost)
 *   entries/<id>/entry.json    the file's path, versions and state
 *   entries/<id>/<v>.gz        a text version, gzip-compressed
 *   entries/<id>/<v>.bin       a binary version (eg a Word file)
 *
 * Robustness:
 * - every JSON file is written to "<name>.tmp" and then renamed over the old one, and read back from the
 *   ".tmp" when the main file is missing or unreadable, so a crash part-way through a write loses nothing;
 * - a version's file is written before the entry that lists it, so an entry never lists a missing file;
 * - each version records the SHA-256 of its content, checked when it is read;
 * - an entry is kept when its file is renamed (it follows the file) or deleted (it can be restored);
 * - all operations run one at a time.
 *
 * Thinning (unless every snapshot is kept): every version from the last day, then the newest of each hour
 * for 30 days, then the newest of each day, forever. Named versions are never thinned.
 */
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';

/** The file operations the store needs: a subset of Obsidian's DataAdapter. */
export interface HistoryFs {
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
	readBinary(path: string): Promise<ArrayBuffer>;
	writeBinary(path: string, data: ArrayBuffer): Promise<void>;
	remove(path: string): Promise<void>;
	rename(from: string, to: string): Promise<void>;
	mkdir(path: string): Promise<void>;
	list(path: string): Promise<{ files: string[]; folders: string[] }>;
	stat(path: string): Promise<{ size: number; mtime: number } | null>;
}

export interface Version {
	/** File name of the version within its entry, without extension. */
	id: string;
	/** When it was taken (ms since the epoch). */
	time: number;
	/** SHA-256 of the content, hex. */
	hash: string;
	/** Length of the text in characters, or bytes for a binary version. */
	size: number;
	binary?: boolean;
	/** Why it was taken, eg "Before tidying footnotes". */
	label?: string;
	/** A name given by the user ("Submitted draft"). Named versions are never thinned. */
	name?: string;
}

export interface Entry {
	id: string;
	/** The file's current path (or its last path, if deleted). */
	path: string;
	/** When the file was deleted, if it was. */
	deleted?: number;
	/** Newest last. */
	versions: Version[];
	/** For an exported file: its modification time and size just after the plugin last wrote it. */
	written?: { mtime: number; size: number };
}

export interface SnapshotOptions {
	label?: string;
	name?: string;
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** The versions to keep, by thinning. Newest last, as stored. */
export function thinVersions(versions: Version[], now: number): Version[] {
	const newest = versions[versions.length - 1];
	const buckets = new Set<string>();
	const keep: Version[] = [];
	// Newest first, so the newest version of each bucket is the one kept.
	for (const v of [...versions].reverse()) {
		const age = now - v.time;
		let bucket: string | null = null;
		if (age >= 30 * DAY) bucket = `d${Math.floor(v.time / DAY)}`;
		else if (age >= DAY) bucket = `h${Math.floor(v.time / HOUR)}`;
		if (v.name || v === newest || bucket === null || !buckets.has(bucket)) keep.push(v);
		if (bucket !== null) buckets.add(bucket);
	}
	return keep.reverse();
}

export async function sha256(data: string | ArrayBuffer): Promise<string> {
	const bytes = typeof data === 'string' ? strToU8(data) : new Uint8Array(data);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A copy of bytes as an ArrayBuffer of exactly their length. */
function bufferOf(u8: Uint8Array): ArrayBuffer {
	return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export class HistoryCorruptError extends Error {}

export class HistoryStore {
	private queue: Promise<unknown> = Promise.resolve();
	private index: Record<string, string> | null = null;
	private entries = new Map<string, Entry>();

	constructor(
		private fs: HistoryFs,
		readonly root: string,
		private opts: { keepAll?: () => boolean; now?: () => number } = {},
	) {}

	private now(): number {
		return this.opts.now?.() ?? Date.now();
	}

	/** Run operations one at a time, so concurrent snapshots cannot interleave their writes. */
	private run<T>(fn: () => Promise<T>): Promise<T> {
		const next = this.queue.then(fn, fn);
		this.queue = next.catch(() => undefined);
		return next;
	}

	// --- files -------------------------------------------------------------------------------------------

	private async ensureFolder(path: string) {
		const parts = path.split('/');
		for (let i = 1; i <= parts.length; i++) {
			const p = parts.slice(0, i).join('/');
			if (p && !(await this.fs.exists(p))) await this.fs.mkdir(p);
		}
	}

	/** Write a file so that a crash at any point leaves either the old or the new content readable. */
	private async atomicWrite(path: string, data: string) {
		const tmp = `${path}.tmp`;
		await this.fs.write(tmp, data);
		if (await this.fs.exists(path)) await this.fs.remove(path);
		await this.fs.rename(tmp, path);
	}

	private async readJson<T>(path: string): Promise<T | null> {
		for (const p of [path, `${path}.tmp`]) {
			try {
				if (await this.fs.exists(p)) return JSON.parse(await this.fs.read(p)) as T;
			} catch {
				// unreadable: try the other copy
			}
		}
		return null;
	}

	private entryFolder(id: string) {
		return `${this.root}/entries/${id}`;
	}

	// --- index and entries ---------------------------------------------------------------------------------

	private async loadIndex(): Promise<Record<string, string>> {
		if (this.index) return this.index;
		const saved = await this.readJson<{ paths: Record<string, string> }>(`${this.root}/index.json`);
		this.index = saved?.paths ?? (await this.rebuildIndex());
		return this.index;
	}

	/** Rebuild the index from the entries, if it was lost. */
	private async rebuildIndex(): Promise<Record<string, string>> {
		const paths: Record<string, string> = {};
		for (const e of await this.allEntries()) if (!e.deleted) paths[e.path] = e.id;
		return paths;
	}

	private async saveIndex() {
		await this.ensureFolder(this.root);
		await this.atomicWrite(`${this.root}/index.json`, JSON.stringify({ paths: this.index ?? {} }));
	}

	private async loadEntry(id: string): Promise<Entry | null> {
		const cached = this.entries.get(id);
		if (cached) return cached;
		const e = await this.readJson<Entry>(`${this.entryFolder(id)}/entry.json`);
		if (e) this.entries.set(id, e);
		return e;
	}

	private async saveEntry(e: Entry) {
		this.entries.set(e.id, e);
		await this.ensureFolder(this.entryFolder(e.id));
		await this.atomicWrite(`${this.entryFolder(e.id)}/entry.json`, JSON.stringify(e));
	}

	private async allEntries(): Promise<Entry[]> {
		const folder = `${this.root}/entries`;
		if (!(await this.fs.exists(folder))) return [];
		const out: Entry[] = [];
		for (const f of (await this.fs.list(folder)).folders) {
			const e = await this.loadEntry(f.split('/').pop()!);
			if (e) out.push(e);
		}
		return out;
	}

	private async entryFor(path: string, create: boolean): Promise<Entry | null> {
		const index = await this.loadIndex();
		const id = index[path];
		if (id) {
			const e = await this.loadEntry(id);
			if (e) return e;
		}
		if (!create) return null;
		const e: Entry = { id: `${this.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`, path, versions: [] };
		index[path] = e.id;
		await this.saveEntry(e);
		await this.saveIndex();
		return e;
	}

	// --- public operations ---------------------------------------------------------------------------------

	/**
	 * Save a version of a file. Returns the new version, or null when the content is the same as the
	 * newest version (which is then given the name, if one was asked for).
	 */
	snapshot(path: string, data: string | ArrayBuffer, opts: SnapshotOptions = {}): Promise<Version | null> {
		return this.run(async () => {
			const e = (await this.entryFor(path, true))!;
			const hash = await sha256(data);
			const last = e.versions[e.versions.length - 1];
			if (last && last.hash === hash) {
				if (opts.name) {
					last.name = opts.name;
					await this.saveEntry(e);
				}
				return null;
			}
			const time = Math.max(this.now(), (last?.time ?? 0) + 1);
			const binary = typeof data !== 'string';
			const v: Version = {
				id: `${time}-${hash.slice(0, 8)}`,
				time,
				hash,
				size: typeof data === 'string' ? data.length : data.byteLength,
				...(binary ? { binary: true } : {}),
				...(opts.label ? { label: opts.label } : {}),
				...(opts.name ? { name: opts.name } : {}),
			};
			await this.ensureFolder(this.entryFolder(e.id));
			const file = `${this.entryFolder(e.id)}/${v.id}.${binary ? 'bin' : 'gz'}`;
			// The version's file first: the entry must never list a version that is not on disk.
			await this.fs.writeBinary(file, typeof data === 'string' ? bufferOf(gzipSync(strToU8(data), { level: 6 })) : data);
			e.versions.push(v);
			if (e.deleted) delete e.deleted;
			await this.thin(e);
			await this.saveEntry(e);
			return v;
		});
	}

	private async thin(e: Entry) {
		if (this.opts.keepAll?.()) return;
		const keep = new Set(thinVersions(e.versions, this.now()));
		const drop = e.versions.filter((v) => !keep.has(v));
		if (drop.length === 0) return;
		e.versions = e.versions.filter((v) => keep.has(v));
		// The entry is saved by the caller before the files go, so it never lists a removed version.
		await this.saveEntry(e);
		for (const v of drop) {
			const file = `${this.entryFolder(e.id)}/${v.id}.${v.binary ? 'bin' : 'gz'}`;
			if (await this.fs.exists(file)) await this.fs.remove(file);
		}
	}

	/** The versions of a file, newest first. */
	versions(path: string): Promise<Version[]> {
		return this.run(async () => [...((await this.entryFor(path, false))?.versions ?? [])].reverse());
	}

	/** The content of a version, checked against its hash. */
	read(path: string, version: Version): Promise<string | ArrayBuffer> {
		return this.run(async () => this.readVersion((await this.entryFor(path, false))?.id, version));
	}

	private async readVersion(id: string | undefined, v: Version): Promise<string | ArrayBuffer> {
		if (!id) throw new HistoryCorruptError('This file has no history.');
		const file = `${this.entryFolder(id)}/${v.id}.${v.binary ? 'bin' : 'gz'}`;
		const raw = await this.fs.readBinary(file);
		const data = v.binary ? raw : strFromU8(gunzipSync(new Uint8Array(raw)));
		if ((await sha256(data)) !== v.hash) throw new HistoryCorruptError(`The version saved ${new Date(v.time).toLocaleString()} is damaged and cannot be restored.`);
		return data;
	}

	/** Give a version a name (or remove it, with an empty name). */
	name(path: string, versionId: string, name: string): Promise<void> {
		return this.run(async () => {
			const e = await this.entryFor(path, false);
			const v = e?.versions.find((x) => x.id === versionId);
			if (!e || !v) return;
			if (name.trim()) v.name = name.trim();
			else delete v.name;
			await this.saveEntry(e);
		});
	}

	/** The history follows a file that is renamed or moved. */
	rename(from: string, to: string): Promise<void> {
		return this.run(async () => {
			const index = await this.loadIndex();
			const id = index[from];
			if (!id) return;
			const e = await this.loadEntry(id);
			// A history already kept for the new path (of a file deleted earlier) is kept as deleted.
			const existing = index[to];
			if (existing && existing !== id) {
				const old = await this.loadEntry(existing);
				if (old) { old.deleted = old.deleted ?? this.now(); await this.saveEntry(old); }
			}
			delete index[from];
			index[to] = id;
			if (e) { e.path = to; await this.saveEntry(e); }
			await this.saveIndex();
		});
	}

	/** A deleted file keeps its history, and can be restored from it. */
	markDeleted(path: string): Promise<void> {
		return this.run(async () => {
			const index = await this.loadIndex();
			const id = index[path];
			if (!id) return;
			const e = await this.loadEntry(id);
			if (e) { e.deleted = this.now(); await this.saveEntry(e); }
			delete index[path];
			await this.saveIndex();
		});
	}

	/** Deleted files with at least one version, most recently deleted first. */
	deleted(): Promise<Entry[]> {
		return this.run(async () => (await this.allEntries())
			.filter((e) => e.deleted && e.versions.length > 0)
			.sort((a, b) => (b.deleted ?? 0) - (a.deleted ?? 0)));
	}

	/** Read a version of a deleted file. */
	readDeleted(entry: Entry, version: Version): Promise<string | ArrayBuffer> {
		return this.run(async () => this.readVersion(entry.id, version));
	}

	/** Make a deleted file's history the history of `path` again (after restoring it there). */
	undelete(entry: Entry, path: string): Promise<void> {
		return this.run(async () => {
			const index = await this.loadIndex();
			const e = await this.loadEntry(entry.id);
			if (!e) return;
			delete e.deleted;
			e.path = path;
			index[path] = e.id;
			await this.saveEntry(e);
			await this.saveIndex();
		});
	}

	/** Record a file's state just after the plugin wrote it (to notice later changes made elsewhere). */
	setWritten(path: string, written: { mtime: number; size: number }): Promise<void> {
		return this.run(async () => {
			const e = (await this.entryFor(path, true))!;
			e.written = written;
			await this.saveEntry(e);
		});
	}

	getWritten(path: string): Promise<{ mtime: number; size: number } | null> {
		return this.run(async () => (await this.entryFor(path, false))?.written ?? null);
	}

	/** Number of files with history, versions, and bytes on disk. */
	usage(): Promise<{ files: number; versions: number; bytes: number }> {
		return this.run(async () => {
			const entries = await this.allEntries();
			let bytes = 0;
			for (const e of entries) {
				const listing = await this.fs.list(this.entryFolder(e.id));
				for (const f of listing.files) bytes += (await this.fs.stat(f))?.size ?? 0;
			}
			return { files: entries.length, versions: entries.reduce((n, e) => n + e.versions.length, 0), bytes };
		});
	}
}
