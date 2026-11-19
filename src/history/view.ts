/**
 * The version history of the active note: its versions by day, what changed against the current text,
 * and restoring a version (into the note, undoably, or as a copy). Also the earlier copies of the note's
 * exported Word and HTML files.
 */
import { ItemView, MarkdownView, Modal, Notice, Setting, TFile, type WorkspaceLeaf, debounce, setIcon } from 'obsidian';
import { type DiffLine, diffLines, diffStats } from './diff';
import type { HistoryManager } from './manager';
import type { Version } from './store';

export const HISTORY_VIEW = 'aglc4-version-history';

export interface HistoryHost {
	history: HistoryManager;
	/** Replace a note's text with a version's (snapshotting the current text first). */
	restore(file: TFile, text: string, label: string): Promise<void>;
	/** Restore an exported file's earlier copy. */
	restoreExport(path: string, data: string | ArrayBuffer, label: string): Promise<void>;
	/** Paths the note's exports are written to. */
	exportPaths(file: TFile): string[];
}

export function formatTime(t: number): string {
	return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(t: number, now = Date.now()): string {
	const day = (x: number) => new Date(x).toDateString();
	if (day(t) === day(now)) return 'Today';
	if (day(t) === day(now - 86_400_000)) return 'Yesterday';
	return new Date(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatStamp(t: number): string {
	const d = new Date(t);
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}`;
}

/** Asks for a short piece of text. */
export class PromptModal extends Modal {
	private value: string;

	constructor(app: ModalApp, title: string, private label: string, initial: string, private onSubmit: (value: string) => void) {
		super(app);
		this.setTitle(title);
		this.value = initial;
	}

	onOpen() {
		new Setting(this.contentEl).setName(this.label).addText((t) => {
			t.setValue(this.value).onChange((v) => { this.value = v; });
			t.inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.submit(); } });
			window.setTimeout(() => t.inputEl.focus(), 0);
		});
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) => b.setButtonText('Save').setCta().onClick(() => this.submit()));
	}

	private submit() {
		this.close();
		this.onSubmit(this.value);
	}

	onClose() {
		this.contentEl.empty();
	}
}
type ModalApp = ConstructorParameters<typeof Modal>[0];

export class HistoryView extends ItemView {
	private file: TFile | null = null;
	private selected: Version | null = null;
	private mode: 'changes' | 'text' = 'changes';
	private listEl!: HTMLElement;
	private detailEl!: HTMLElement;
	private titleEl!: HTMLElement;
	private footerEl!: HTMLElement;
	private generation = 0;
	private readonly refresh = debounce(() => { void this.render(); }, 1500, true);

	constructor(leaf: WorkspaceLeaf, private host: HistoryHost) {
		super(leaf);
	}

	getViewType(): string { return HISTORY_VIEW; }
	getDisplayText(): string { return this.file ? `History: ${this.file.basename}` : 'Version history'; }
	getIcon(): string { return 'history'; }

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass('aglc-hist-view');
		const bar = root.createDiv({ cls: 'aglc-hist-toolbar' });
		this.titleEl = bar.createDiv({ cls: 'aglc-hist-title' });
		const buttons = bar.createDiv({ cls: 'aglc-hist-buttons' });
		const button = (icon: string, label: string, onClick: () => void) => {
			const b = buttons.createEl('button', { cls: 'clickable-icon' });
			setIcon(b, icon);
			b.setAttribute('aria-label', label);
			b.addEventListener('click', onClick);
		};
		button('save', 'Save a version now', () => { void this.saveNow(); });
		button('tag', 'Name the current version', () => this.nameCurrent());
		button('refresh-cw', 'Refresh', () => { void this.render(); });
		this.listEl = root.createDiv({ cls: 'aglc-hist-list' });
		this.detailEl = root.createDiv({ cls: 'aglc-hist-detail' });
		this.footerEl = root.createDiv({ cls: 'aglc-hist-footer' });

		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.follow()));
		this.registerEvent(this.app.vault.on('modify', (f) => { if (f === this.file) this.refresh(); }));
		this.registerEvent(this.app.vault.on('rename', (f) => { if (f === this.file) void this.render(); }));
		this.follow();
	}

	/** Follow the active note (not this view). */
	private follow() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file ?? null;
		if (!file || file === this.file) {
			if (!this.file) void this.render();
			return;
		}
		this.file = file;
		this.selected = null;
		void this.render();
	}

	private currentText(file: TFile): Promise<string> {
		let text: string | null = null;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (text === null && leaf.view instanceof MarkdownView && leaf.view.file === file) text = leaf.view.editor.getValue();
		});
		return text !== null ? Promise.resolve(text) : this.app.vault.read(file);
	}

	private async saveNow() {
		if (!this.file) return;
		const ok = await this.host.history.snapshot(this.file.path, await this.currentText(this.file));
		new Notice(ok ? 'Version saved.' : 'Version history is turned off in settings.');
		await this.render();
	}

	private nameCurrent() {
		const file = this.file;
		if (!file) return;
		new PromptModal(this.app, 'Name this version', 'Name', '', (name) => {
			if (!name.trim()) return;
			void (async () => {
				const ok = await this.host.history.snapshot(file.path, await this.currentText(file), { name: name.trim() });
				new Notice(ok ? `Version named "${name.trim()}".` : 'Version history is turned off in settings.');
				await this.render();
			})();
		}).open();
	}

	async render(): Promise<void> {
		const gen = ++this.generation;
		const file = this.file;
		this.titleEl.setText(file ? file.basename : 'No note open');
		if (!file) {
			this.listEl.empty();
			this.detailEl.empty();
			this.listEl.createDiv({ cls: 'aglc-hist-empty', text: 'Open a note to see its version history.' });
			return;
		}
		if (!this.host.history.enabled) {
			this.listEl.empty();
			this.detailEl.empty();
			this.listEl.createDiv({ cls: 'aglc-hist-empty', text: 'Version history is turned off. Turn on "Keep version history" in the plugin\'s settings.' });
			return;
		}
		const versions = await this.host.history.versions(file.path);
		const exports: { path: string; versions: Version[] }[] = [];
		for (const path of this.host.exportPaths(file)) {
			const vs = await this.host.history.versions(path);
			if (vs.length) exports.push({ path, versions: vs });
		}
		if (gen !== this.generation) return;

		this.listEl.empty();
		if (versions.length === 0) {
			this.listEl.createDiv({ cls: 'aglc-hist-empty', text: 'No versions yet. A version is saved as you write, and when you open or leave the note.' });
		}
		let day = '';
		versions.forEach((v, i) => {
			const d = formatDay(v.time);
			if (d !== day) {
				day = d;
				this.listEl.createDiv({ cls: 'aglc-hist-day', text: d });
			}
			const row = this.listEl.createDiv({ cls: 'aglc-hist-row' });
			if (this.selected?.id === v.id) row.addClass('is-selected');
			row.createSpan({ cls: 'aglc-hist-time', text: formatTime(v.time) });
			if (v.name) row.createSpan({ cls: 'aglc-hist-name', text: v.name });
			if (v.label) row.createSpan({ cls: 'aglc-hist-label', text: v.label });
			const prev = versions[i + 1];
			const delta = prev ? v.size - prev.size : v.size;
			row.createSpan({ cls: 'aglc-hist-size', text: `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString()} characters` });
			row.addEventListener('click', () => { this.selected = v; void this.render(); });
		});

		for (const ex of exports) {
			this.listEl.createDiv({ cls: 'aglc-hist-day', text: `Earlier copies of ${ex.path}` });
			for (const v of ex.versions) {
				const row = this.listEl.createDiv({ cls: 'aglc-hist-row aglc-hist-export' });
				row.createSpan({ cls: 'aglc-hist-time', text: `${formatDay(v.time)}, ${formatTime(v.time)}` });
				if (v.label) row.createSpan({ cls: 'aglc-hist-label', text: v.label });
				const actions = row.createSpan({ cls: 'aglc-hist-row-actions' });
				const restore = actions.createEl('button', { text: 'Restore' });
				restore.addEventListener('click', (e) => {
					e.stopPropagation();
					void this.host.history.read(ex.path, v)
						.then((data) => this.host.restoreExport(ex.path, data, `Before restoring the copy of ${formatDay(v.time)}, ${formatTime(v.time)}`))
						.then(() => this.render())
						.catch((err) => new Notice(err instanceof Error ? err.message : String(err)));
				});
			}
		}

		await this.renderDetail(file, gen);
		void this.host.history.usage().then((u) => {
			if (gen !== this.generation) return;
			this.footerEl.setText(`History of ${u.files} ${u.files === 1 ? 'file' : 'files'}: ${u.versions} versions, ${(u.bytes / 1024 / 1024).toFixed(1)} MB, in ${this.host.history.root()}`);
		}).catch(() => undefined);
	}

	private async renderDetail(file: TFile, gen: number) {
		const v = this.selected;
		this.detailEl.empty();
		if (!v) {
			this.detailEl.createDiv({ cls: 'aglc-hist-empty', text: 'Select a version to see what changed since then and to restore it.' });
			return;
		}
		let text: string;
		try {
			const data = await this.host.history.read(file.path, v);
			text = typeof data === 'string' ? data : '';
		} catch (e) {
			if (gen !== this.generation) return;
			this.detailEl.createDiv({ cls: 'aglc-hist-error', text: e instanceof Error ? e.message : String(e) });
			return;
		}
		const current = await this.currentText(file);
		if (gen !== this.generation) return;

		const head = this.detailEl.createDiv({ cls: 'aglc-hist-detail-head' });
		head.createDiv({ cls: 'aglc-hist-detail-title', text: `${formatDay(v.time)}, ${formatTime(v.time)}${v.name ? ` — ${v.name}` : ''}` });
		const actions = head.createDiv({ cls: 'aglc-hist-actions' });
		const action = (label: string, onClick: () => void, cta = false) => {
			const b = actions.createEl('button', { text: label });
			if (cta) b.addClass('mod-cta');
			b.addEventListener('click', onClick);
		};
		action('Restore this version', () => {
			void this.host.restore(file, text, `Before restoring the version of ${formatDay(v.time)}, ${formatTime(v.time)}`).then(() => {
				new Notice('Version restored. Undo (Ctrl/Cmd+Z) in the note reverses it; the text before restoring is also in the history.');
				this.selected = null;
				void this.render();
			});
		}, true);
		action('Restore as a copy', () => { void this.restoreAsCopy(file, v, text); });
		action(v.name ? 'Rename' : 'Name', () => {
			new PromptModal(this.app, 'Name this version', 'Name (leave empty to remove)', v.name ?? '', (name) => {
				void this.host.history.name(file.path, v.id, name).then(() => this.render());
			}).open();
		});
		action(this.mode === 'changes' ? 'Show full text' : 'Show changes', () => {
			this.mode = this.mode === 'changes' ? 'text' : 'changes';
			void this.render();
		});

		const body = this.detailEl.createDiv({ cls: 'aglc-hist-diff' });
		if (this.mode === 'text') {
			for (const line of text.split('\n')) body.createDiv({ cls: 'aglc-hist-line', text: line || ' ' });
			return;
		}
		// What restoring would change: from the current text to this version.
		const diff = diffLines(current, text);
		const stats = diffStats(diff);
		head.createDiv({
			cls: 'aglc-hist-detail-stats',
			text: stats.added + stats.deleted === 0
				? 'Same as the current text.'
				: `Restoring brings back ${stats.added} ${stats.added === 1 ? 'line' : 'lines'} (green) and removes ${stats.deleted} (red) of the current text.`,
		});
		renderHunks(body, diff);
	}

	private async restoreAsCopy(file: TFile, v: Version, text: string) {
		const folder = file.parent?.path ?? '';
		const base = `${folder ? `${folder}/` : ''}${file.basename} (version ${formatStamp(v.time)})`;
		let path = `${base}.md`;
		for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) path = `${base} ${n}.md`;
		const copy = await this.app.vault.create(path, text);
		await this.app.workspace.getLeaf('tab').openFile(copy);
		new Notice(`Restored as ${copy.basename}.`);
	}
}

/** Changed lines with two lines of context; long unchanged stretches are collapsed. */
function renderHunks(parent: HTMLElement, diff: DiffLine[]) {
	const context = 2;
	const show = new Array<boolean>(diff.length).fill(false);
	diff.forEach((l, i) => {
		if (l.type === 'same') return;
		for (let k = Math.max(0, i - context); k <= Math.min(diff.length - 1, i + context); k++) show[k] = true;
	});
	let hidden = 0;
	const flush = () => {
		if (hidden > 0) parent.createDiv({ cls: 'aglc-hist-skip', text: `… ${hidden} unchanged ${hidden === 1 ? 'line' : 'lines'} …` });
		hidden = 0;
	};
	diff.forEach((l, i) => {
		if (!show[i]) { hidden++; return; }
		flush();
		const cls = l.type === 'add' ? 'aglc-hist-line aglc-hist-add' : l.type === 'del' ? 'aglc-hist-line aglc-hist-del' : 'aglc-hist-line';
		parent.createDiv({ cls, text: `${l.type === 'add' ? '+ ' : l.type === 'del' ? '− ' : '  '}${l.text}` });
	});
	flush();
	if (!diff.some((l) => l.type !== 'same')) parent.createDiv({ cls: 'aglc-hist-empty', text: 'No changes.' });
}
