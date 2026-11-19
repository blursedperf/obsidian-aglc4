/**
 * Keeps the version history of the vault's notes: snapshots while you write (at most one per interval,
 * with the latest text), when a note is opened or left, and before anything the plugin rewrites.
 */
import { type App, Notice, type Plugin, TFile, type TAbstractFile, normalizePath } from 'obsidian';
import { type Entry, HistoryStore, type SnapshotOptions, type Version } from './store';

export interface HistorySettings {
	historyEnabled: boolean;
	historyFolder: string;
	/** Minutes between snapshots while writing. */
	historyInterval: number;
	historyKeepAll: boolean;
}

export const DEFAULT_HISTORY_FOLDER = '.aglc-history';

export class HistoryManager {
	private store: HistoryStore | null = null;
	private storeRoot = '';
	private timers = new Map<string, number>();
	private last = new Map<string, number>();
	private warned = false;

	/** `include` limits the history to some notes (see the "Keep history of" setting). */
	constructor(private app: App, private settings: () => HistorySettings, private include: (file: TFile) => boolean = () => true) {}

	get enabled(): boolean {
		return this.settings().historyEnabled;
	}

	root(): string {
		return normalizePath(this.settings().historyFolder.trim() || DEFAULT_HISTORY_FOLDER);
	}

	/** The store, for the current history folder. */
	private get(): HistoryStore {
		const root = this.root();
		if (!this.store || this.storeRoot !== root) {
			this.store = new HistoryStore(this.app.vault.adapter, root, { keepAll: () => this.settings().historyKeepAll });
			this.storeRoot = root;
		}
		return this.store;
	}

	/** Notes are tracked; the history folder itself never is. */
	tracks(file: TAbstractFile | null): file is TFile {
		return file instanceof TFile && file.extension === 'md' && !file.path.startsWith(`${this.root()}/`) && this.include(file);
	}

	register(plugin: Plugin) {
		const { vault, workspace } = this.app;
		plugin.registerEvent(vault.on('modify', (f) => { if (this.enabled && this.tracks(f)) this.schedule(f); }));
		plugin.registerEvent(vault.on('rename', (f, old) => {
			if (!this.enabled) return;
			const t = this.timers.get(old);
			if (t !== undefined) { window.clearTimeout(t); this.timers.delete(old); }
			void this.get().rename(old, f.path).catch((e) => this.fail(e));
		}));
		plugin.registerEvent(vault.on('delete', (f) => {
			if (!this.enabled || !(f instanceof TFile)) return;
			const t = this.timers.get(f.path);
			if (t !== undefined) { window.clearTimeout(t); this.timers.delete(f.path); }
			void this.get().markDeleted(f.path).catch((e) => this.fail(e));
		}));
		// A first version when a note is opened, so every note you work on has one even before it changes.
		plugin.registerEvent(workspace.on('file-open', (f) => { if (this.enabled && this.tracks(f)) void this.snapshotFile(f); }));
	}

	/** Snapshot a note being edited once the interval since its last snapshot has passed. */
	private schedule(file: TFile) {
		if (this.timers.has(file.path)) return;
		const interval = Math.max(1, this.settings().historyInterval) * 60_000;
		const wait = Math.max(5_000, (this.last.get(file.path) ?? 0) + interval - Date.now());
		const path = file.path;
		this.timers.set(path, window.setTimeout(() => {
			this.timers.delete(path);
			const f = this.app.vault.getAbstractFileByPath(path);
			if (f instanceof TFile) void this.snapshotFile(f);
		}, wait));
	}

	/** Snapshot a note now, if it is waiting for one (eg when you leave it). */
	flush(file: TFile | null) {
		if (!file || !this.timers.has(file.path)) return;
		window.clearTimeout(this.timers.get(file.path));
		this.timers.delete(file.path);
		void this.snapshotFile(file);
	}

	/** Snapshot every note waiting for one (when the plugin is unloaded). */
	flushAll() {
		for (const path of [...this.timers.keys()]) {
			const f = this.app.vault.getAbstractFileByPath(path);
			if (f instanceof TFile) this.flush(f);
		}
	}

	private async snapshotFile(file: TFile, opts: SnapshotOptions = {}): Promise<boolean> {
		try {
			return await this.snapshot(file.path, await this.app.vault.read(file), opts);
		} catch (e) {
			this.fail(e);
			return false;
		}
	}

	/**
	 * Save a version. Resolves true when the content is safely in the history (saved now, or the same as
	 * the newest version), false when history is off or saving failed.
	 */
	async snapshot(path: string, data: string | ArrayBuffer, opts: SnapshotOptions = {}): Promise<boolean> {
		if (!this.enabled) return false;
		try {
			await this.get().snapshot(path, data, opts);
			this.last.set(path, Date.now());
			return true;
		} catch (e) {
			this.fail(e);
			return false;
		}
	}

	versions(path: string): Promise<Version[]> {
		return this.get().versions(path);
	}

	read(path: string, v: Version): Promise<string | ArrayBuffer> {
		return this.get().read(path, v);
	}

	name(path: string, id: string, name: string): Promise<void> {
		return this.get().name(path, id, name);
	}

	deleted(): Promise<Entry[]> {
		return this.get().deleted();
	}

	readDeleted(e: Entry, v: Version): Promise<string | ArrayBuffer> {
		return this.get().readDeleted(e, v);
	}

	undelete(e: Entry, path: string): Promise<void> {
		return this.get().undelete(e, path);
	}

	setWritten(path: string, w: { mtime: number; size: number }): Promise<void> {
		return this.get().setWritten(path, w);
	}

	getWritten(path: string): Promise<{ mtime: number; size: number } | null> {
		return this.get().getWritten(path);
	}

	usage(): Promise<{ files: number; versions: number; bytes: number }> {
		return this.get().usage();
	}

	private fail(e: unknown) {
		console.error('AGLC4 version history', e);
		if (this.warned) return;
		this.warned = true;
		new Notice(`Version history could not be saved: ${e instanceof Error ? e.message : String(e)}`, 10000);
	}
}
