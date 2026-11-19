import { type App, type Editor, MarkdownView, type Menu, Modal, Notice, Platform, Plugin, Setting, SuggestModal, type TAbstractFile, TFile, type WorkspaceLeaf, normalizePath } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import { type DocumentAnalysis, analyseDocument, applyFixes, suggestNext, withBibliography, type Issue, tidyFootnotes, type ExportOptions, exportDocx, exportHtml, importDocx } from '@legal-core/aglc';
import { footnoteKeys, remapCrossReferences, scanFootnotes } from '@legal-core/md-pipeline';
import { footnoteAt, minimalChange, referenceFor } from './editor/context';
import { buildExtension, refreshEffect } from './editor/extension';
import { NextElementModal, NextElementSuggest, footnoteTextBeforeCursor } from './editor/suggest';
import { PAGE_PREVIEW_VIEW, PagePreviewView } from './preview/view';
import { HistoryManager } from './history/manager';
import { ON_PROPERTY, noteEnabled, noteSettings } from './scope';
import { EXAMPLE_ESSAY, EXAMPLE_NAME } from './example';
import { HISTORY_VIEW, HistoryView, PromptModal, formatDay, formatTime } from './history/view';
import type { Entry } from './history/store';
import { type Aglc4Settings, Aglc4SettingTab, DEFAULT_SETTINGS } from './settings';

/** Obsidian's editor exposes its CodeMirror view as `cm`. */
function cmOf(editor: Editor): EditorView | null {
	const cm = (editor as unknown as { cm?: EditorView }).cm;
	return cm ?? null;
}

/** Replace the whole editor text with `next`, touching only the part that changed. */
function replaceText(editor: Editor, next: string): void {
	const current = editor.getValue();
	const change = minimalChange(current, next);
	if (!change) return;
	editor.replaceRange(change.insert, editor.offsetToPos(change.from), editor.offsetToPos(change.to));
}

/** Offers a choice of actions. */
class ChoiceModal extends Modal {
	constructor(app: App, title: string, private message: string, private choices: { label: string; cta?: boolean; action: () => void }[]) {
		super(app);
		this.setTitle(title);
	}

	onOpen() {
		this.contentEl.createEl('p', { text: this.message });
		const row = new Setting(this.contentEl);
		row.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()));
		for (const c of this.choices) {
			row.addButton((b) => {
				b.setButtonText(c.label).onClick(() => { this.close(); c.action(); });
				if (c.cta) b.setCta();
			});
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

/** Picks a deleted note to restore from the history. */
class DeletedModal extends SuggestModal<Entry> {
	constructor(app: App, private entries: Entry[], private onChoose: (e: Entry) => void) {
		super(app);
		this.setPlaceholder('Restore a deleted note from version history');
	}

	getSuggestions(query: string): Entry[] {
		const q = query.toLowerCase();
		return this.entries.filter((e) => e.path.toLowerCase().includes(q));
	}

	renderSuggestion(e: Entry, el: HTMLElement): void {
		el.createDiv({ text: e.path });
		const last = e.versions[e.versions.length - 1]!;
		el.createDiv({ cls: 'aglc-suggestion-hint', text: `Deleted ${formatDay(e.deleted ?? 0)}, ${formatTime(e.deleted ?? 0)} · ${e.versions.length} ${e.versions.length === 1 ? 'version' : 'versions'} · last saved ${formatDay(last.time)}, ${formatTime(last.time)}` });
	}

	onChooseSuggestion(e: Entry): void {
		this.onChoose(e);
	}
}

/** Asks before an action that replaces text. */
class ConfirmModal extends Modal {
	constructor(app: App, title: string, private message: string, private action: string, private onConfirm: () => void) {
		super(app);
		this.setTitle(title);
	}

	onOpen() {
		this.contentEl.createEl('p', { text: this.message });
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) => b.setButtonText(this.action).setCta().onClick(() => {
				this.close();
				this.onConfirm();
			}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class IssueModal extends SuggestModal<Issue> {
	constructor(app: App, private editor: Editor, private issues: Issue[]) {
		super(app);
		this.setPlaceholder(`${issues.length} AGLC4 ${issues.length === 1 ? 'problem' : 'problems'} in this note`);
	}

	getSuggestions(query: string): Issue[] {
		const q = query.toLowerCase();
		return this.issues.filter((i) => `${i.message} ${i.rule} ${i.ref ?? ''}`.toLowerCase().includes(q));
	}

	renderSuggestion(i: Issue, el: HTMLElement): void {
		el.addClass('aglc-issue-row', `aglc-issue-row-${i.severity}`);
		const top = el.createDiv({ cls: 'aglc-suggestion-top' });
		const pos = this.editor.offsetToPos(i.from);
		top.createSpan({ cls: 'aglc-suggestion-label', text: i.message });
		el.createDiv({
			cls: 'aglc-suggestion-hint',
			text: `Line ${pos.line + 1} · ${this.editor.getValue().slice(i.from, Math.min(i.to, i.from + 60))}${i.ref ? ` · AGLC4 ${i.ref}` : ''}${i.fix ? ' · fixable' : ''}`,
		});
	}

	onChooseSuggestion(i: Issue): void {
		this.editor.setSelection(this.editor.offsetToPos(i.from), this.editor.offsetToPos(i.to));
		this.editor.scrollIntoView({ from: this.editor.offsetToPos(i.from), to: this.editor.offsetToPos(i.to) }, true);
		this.editor.focus();
	}
}

export default class Aglc4Plugin extends Plugin {
	settings: Aglc4Settings = DEFAULT_SETTINGS;
	private statusEl: HTMLElement | null = null;
	private lastFile: TFile | null = null;
	private lastAnalysis: DocumentAnalysis | null = null;
	readonly history = new HistoryManager(this.app, () => this.settings, (file) => this.settings.historyScope === 'all' || this.enabledFor(file));
	/** True while the status bar shows that the active note is off. */
	private statusOff = false;

	async onload() {
		await this.loadSettings();
		this.history.register(this);
		this.registerView(HISTORY_VIEW, (leaf) => new HistoryView(leaf, {
			history: this.history,
			restore: (file, text, label) => this.restoreNote(file, text, label),
			restoreExport: (path, data, label) => this.restoreExport(path, data, label),
			exportPaths: (file) => (['docx', 'html'] as const).map((f) => this.exportPath(file, f)),
		}));
		this.addRibbonIcon('history', 'Show version history', () => { void this.openHistory(); });
		this.addSettingTab(new Aglc4SettingTab(this.app, this));

		const getSettings = () => this.settings;
		this.registerEditorExtension(buildExtension({
			get settings() { return getSettings(); },
			forPath: (path) => this.forPath(path),
			report: (analysis, next, view) => this.report(analysis, next, view),
			disableRule: (rule) => { void this.disableRule(rule); },
			returnFromFootnote: (view, finished) => this.returnFromFootnote(view, finished),
			vimMode: () => this.vimMode(),
		}));
		this.registerEditorSuggest(new NextElementSuggest(this.app, () => this.settings, (file) => this.enabledFor(file)));
		// A note's properties decide whether the plugin works in it, and its style.
		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			if (file !== this.app.workspace.getActiveFile()) return;
			this.refreshEditors();
			for (const leaf of this.app.workspace.getLeavesOfType(PAGE_PREVIEW_VIEW)) {
				if (leaf.view instanceof PagePreviewView) leaf.view.rerender();
			}
		}));

		this.statusEl = this.addStatusBarItem();
		this.statusEl.addClass('aglc-status', 'mod-clickable');
		this.statusEl.setAttribute('aria-label', 'Show AGLC4 problems in this note');
		this.registerDomEvent(this.statusEl, 'click', () => {
			const file = this.app.workspace.getActiveFile();
			if (this.statusOff && this.isMarkdown(file)) {
				void this.setNoteEnabled(file, true);
				return;
			}
			const editor = this.activeEditor();
			if (editor) this.showIssues(editor);
		});
		this.updateStatusVisibility();

		this.registerView(PAGE_PREVIEW_VIEW, (leaf) => new PagePreviewView(leaf, { exportOptions: (file) => this.exportOptions(file) }));
		this.addRibbonIcon('book-open', 'Open AGLC4 page preview', () => { void this.openPreview(); });

		this.addCommands();

		this.registerEvent(this.app.workspace.on('active-leaf-change', () => { void this.onLeafChange(); }));
		this.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
			if (file instanceof TFile && file.extension === 'docx') {
				menu.addItem((item) => item.setTitle('Import as note with AGLC4 footnotes').setIcon('file-input').onClick(() => {
					void this.app.vault.readBinary(file).then((data) => this.importWord(new Uint8Array(data), file.basename, file.parent?.path ?? ''));
				}));
				return;
			}
			if (!this.isMarkdown(file)) return;
			menu.addItem((item) => item.setTitle('Version history').setIcon('history').onClick(() => { void this.openHistory(file); }));
			menu.addItem((item) => item.setTitle('Export to Word with AGLC4 footnotes').setIcon('file-output').onClick(() => { void this.exportFile(file, 'docx'); }));
			menu.addItem((item) => item.setTitle('Export to HTML with AGLC4 footnotes').setIcon('file-code').onClick(() => { void this.exportFile(file, 'html'); }));
		}));
		this.app.workspace.onLayoutReady(() => { this.lastFile = this.app.workspace.getActiveFile(); });
	}

	private isMarkdown(file: TAbstractFile | null): file is TFile {
		return file instanceof TFile && file.extension === 'md';
	}

	private activeEditor(): Editor | null {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
	}

	private addCommands() {
		this.addCommand({
			id: 'insert-footnote',
			name: 'Insert footnote',
			editorCallback: (editor) => this.insertFootnote(editor),
		});
		this.addCommand({
			id: 'suggest-next-element',
			name: 'Suggest next citation element',
			editorCallback: (editor) => {
				const ctx = footnoteTextBeforeCursor(editor);
				if (!ctx) {
					new Notice('Put the cursor at the end of the citation you are writing in a footnote.');
					return;
				}
				const items = suggestNext(ctx.before);
				if (items.length === 0) {
					new Notice('This does not look like a citation in progress.');
					return;
				}
				new NextElementModal(this.app, editor, items).open();
			},
		});
		this.addCommand({
			id: 'tidy-footnotes',
			name: 'Move footnotes to the bottom and renumber',
			editorCallback: (editor, ctx) => {
				const r = tidyFootnotes(editor.getValue(), { renumber: this.settings.renumber, convertInline: this.settings.convertInline });
				if (r.unsafe) {
					new Notice('The footnotes were not moved: the result failed a safety check, so the note was left as it is.');
					return;
				}
				if (!r.changed) {
					new Notice('Footnotes are already tidy.');
					return;
				}
				this.backup(ctx.file, editor.getValue(), 'Before tidying footnotes');
				replaceText(editor, r.text);
				new Notice('Footnotes moved to the bottom of the note.');
			},
		});
		this.addCommand({
			id: 'show-issues',
			name: 'List AGLC4 problems in this note',
			editorCallback: (editor) => this.showIssues(editor),
		});
		this.addCommand({
			id: 'fix-all',
			name: 'Fix all automatically fixable problems',
			editorCallback: (editor, ctx) => {
				const text = editor.getValue();
				let current = text;
				let total = 0;
				// Fixes can reveal or resolve others, so repeat a few times.
				for (let pass = 0; pass < 4; pass++) {
					const a = analyseDocument(current, { disabled: new Set(this.settings.disabledRules), showInfo: false });
					const r = applyFixes(current, a.issues);
					if (r.applied === 0) break;
					current = r.text;
					total += r.applied;
				}
				if (total === 0) {
					new Notice('Nothing to fix automatically.');
					return;
				}
				this.backup(ctx.file, text, 'Before fixing all problems');
				replaceText(editor, current);
				const left = analyseDocument(current, { disabled: new Set(this.settings.disabledRules), showInfo: false }).issues.length;
				new Notice(`Applied ${total} ${total === 1 ? 'fix' : 'fixes'}.${left > 0 ? ` ${left} ${left === 1 ? 'problem needs' : 'problems need'} your attention.` : ''}`);
			},
		});
		this.addCommand({
			id: 'create-example-essay',
			name: 'Create example essay',
			callback: () => { void this.createExampleEssay(); },
		});
		this.addCommand({
			id: 'turn-on-for-note',
			name: 'Turn AGLC4 on for this note',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!this.isMarkdown(file) || this.enabledFor(file)) return false;
				if (!checking) void this.setNoteEnabled(file, true);
				return true;
			},
		});
		this.addCommand({
			id: 'turn-off-for-note',
			name: 'Turn AGLC4 off for this note',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!this.isMarkdown(file) || !this.enabledFor(file)) return false;
				if (!checking) void this.setNoteEnabled(file, false);
				return true;
			},
		});
		this.addCommand({
			id: 'show-version-history',
			name: 'Show version history',
			callback: () => { void this.openHistory(); },
		});
		this.addCommand({
			id: 'save-named-version',
			name: 'Save a named version of this note',
			editorCallback: (editor, ctx) => {
				const file = ctx.file;
				if (!file) return;
				const text = editor.getValue();
				new PromptModal(this.app, 'Name this version', 'Name', '', (name) => {
					if (!name.trim()) return;
					void this.history.snapshot(file.path, text, { name: name.trim() }).then((ok) => {
						new Notice(ok ? `Version "${name.trim()}" saved.` : 'Version history is turned off in settings.');
					});
				}).open();
			},
		});
		this.addCommand({
			id: 'restore-deleted-note',
			name: 'Restore a deleted note from version history',
			callback: () => { void this.restoreDeleted(); },
		});
		this.addCommand({
			id: 'insert-bibliography',
			name: 'Insert bibliography of cited sources',
			editorCallback: (editor, ctx) => {
				const r = withBibliography(editor.getValue(), this.settings.aglcTopLevel);
				if (!r) {
					new Notice('No source is cited in full in the footnotes, so there is nothing to list in a bibliography.');
					return;
				}
				const apply = () => {
					this.backup(ctx.file, editor.getValue(), r.replaced ? 'Before replacing the bibliography' : 'Before inserting a bibliography');
					replaceText(editor, r.text);
					new Notice(`Bibliography ${r.replaced ? 'replaced' : 'added'}: ${r.sources} ${r.sources === 1 ? 'source' : 'sources'}. Add any sources you relied on but did not cite.`);
				};
				if (!r.replaced) {
					apply();
					return;
				}
				new ConfirmModal(
					this.app,
					'Replace the bibliography?',
					'This note already has a bibliography. Replace it with one listing the sources cited in the footnotes? Entries you added or edited by hand will be lost (Undo restores them).',
					'Replace',
					apply,
				).open();
			},
		});
		this.addCommand({
			id: 'return-from-footnote',
			name: 'Return from footnote to its reference',
			editorCheckCallback: (checking, editor) => {
				const cm = cmOf(editor);
				if (!cm || referenceFor(editor.getValue(), editor.posToOffset(editor.getCursor())) === null) return false;
				if (!checking) this.returnFromFootnote(cm, false);
				return true;
			},
		});
		this.addCommand({
			id: 'jump-footnote',
			name: 'Jump between footnote and its reference',
			editorCallback: (editor) => this.jumpFootnote(editor),
		});
		this.addCommand({
			id: 'import-docx',
			name: 'Import Word document',
			callback: () => this.pickWordFile(),
		});
		this.addCommand({
			id: 'page-preview',
			name: 'Open page preview',
			callback: () => { void this.openPreview(); },
		});
		this.addCommand({
			id: 'export-docx',
			name: 'Export to Word with AGLC4 footnotes',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!this.isMarkdown(file)) return false;
				if (!checking) void this.exportFile(file, 'docx');
				return true;
			},
		});
		this.addCommand({
			id: 'export-html',
			name: 'Export to HTML with AGLC4 footnotes',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!this.isMarkdown(file)) return false;
				if (!checking) void this.exportFile(file, 'html');
				return true;
			},
		});
	}

	// -----------------------------------------------------------------------------------------------------

	private report(analysis: DocumentAnalysis | null, next: string | null, view: EditorView) {
		const editor = this.activeEditor();
		if (!editor || cmOf(editor) !== view) return;
		this.lastAnalysis = analysis;
		this.statusOff = analysis === null;
		if (!this.statusEl || !this.settings.statusBar) return;
		this.statusEl.toggleClass('aglc-status-off', analysis === null);
		if (analysis === null) {
			this.statusEl.setText('AGLC4 off');
			this.statusEl.setAttribute('aria-label', 'AGLC4 is off for this note. Click to turn it on.');
			this.statusEl.toggleClass('aglc-status-errors', false);
			return;
		}
		this.statusEl.setAttribute('aria-label', 'Show AGLC4 problems in this note');
		const count = (s: Issue['severity']) => analysis.issues.filter((i) => i.severity === s).length;
		const errors = count('error');
		const warnings = count('warning');
		const parts: string[] = [];
		if (analysis.notes.length > 0 || analysis.issues.length > 0) {
			parts.push(errors + warnings === 0 ? 'AGLC4 ✓' : `AGLC4 ${errors > 0 ? `${errors}✕` : ''}${errors > 0 && warnings > 0 ? ' ' : ''}${warnings > 0 ? `${warnings}⚠` : ''}`);
		}
		if (next) parts.push(`next: ${next}`);
		this.statusEl.setText(parts.join(' · '));
		this.statusEl.toggleClass('aglc-status-errors', errors > 0);
	}

	private updateStatusVisibility() {
		this.statusEl?.toggle(this.settings.statusBar);
	}

	private showIssues(editor: Editor) {
		const a = analyseDocument(editor.getValue(), { disabled: new Set(this.settings.disabledRules), showInfo: this.settings.showInfo });
		if (a.issues.length === 0) {
			new Notice(a.notes.length === 0 ? 'This note has no footnotes.' : 'No AGLC4 problems found.');
			return;
		}
		new IssueModal(this.app, editor, a.issues).open();
	}

	private insertFootnote(editor: Editor) {
		const text = editor.getValue();
		let at = editor.posToOffset(editor.getCursor());
		// AGLC4 r 1.1.2: the footnote number follows punctuation.
		while (at > 0 && /[ \t]/.test(text[at - 1]!)) at--;
		while (at < text.length && /[.,;:!?’”'"]/.test(text[at]!)) at++;

		const scan = scanFootnotes(text);
		const used = new Set([...scan.defs.map((d) => d.label), ...scan.refs.map((r) => r.label)]);
		let temp: string;
		if (this.settings.renumber) {
			temp = 'aglc-new';
			while (used.has(temp)) temp += '-';
		} else {
			let n = 1;
			while (used.has(String(n))) n++;
			temp = String(n);
		}
		let next = `${text.slice(0, at)}[^${temp}]${text.slice(at)}`;
		next = `${next.replace(/\s+$/, '')}\n\n[^${temp}]: \n`;
		if (this.settings.syncCrossRefs) {
			next = remapCrossReferences(next, footnoteKeys(scan), footnoteKeys(scanFootnotes(next))).text;
		}
		const tidy = tidyFootnotes(next, { renumber: this.settings.renumber, convertInline: this.settings.convertInline });
		next = tidy.text;
		const label = tidy.relabelled.get(temp) ?? temp;

		replaceText(editor, next);
		const def = scanFootnotes(next).defs.find((d) => d.label === label);
		if (!def) return;

		const main = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (this.settings.footnoteEditing === 'pane' && !Platform.isPhone && main?.file && main.editor === editor && main.leaf !== this.footnotePane) {
			// Stay put in the text, just after the new footnote number, and write the footnote in the pane.
			const ref = scanFootnotes(next).notes.find((n) => n.label === label)?.refs[0];
			if (ref) editor.setCursor(editor.offsetToPos(ref.to));
			void this.showInFootnotePane(main, def.contentFrom);
			return;
		}
		const pos = editor.offsetToPos(def.contentFrom);
		editor.setCursor(pos);
		editor.scrollIntoView({ from: pos, to: pos }, true);
	}

	// -----------------------------------------------------------------------------------------------------
	// Footnote pane

	/** The pane below a note where footnotes are written, and the pane of the note it serves. */
	private footnotePane: WorkspaceLeaf | null = null;
	private footnoteMain: WorkspaceLeaf | null = null;

	private isOpen(leaf: WorkspaceLeaf | null): leaf is WorkspaceLeaf {
		return !!leaf && this.app.workspace.getLeavesOfType('markdown').includes(leaf);
	}

	/** Show the note in the footnote pane at `offset` and put the cursor there. */
	private async showInFootnotePane(main: MarkdownView, offset: number) {
		const file = main.file;
		if (!file) return;
		// The pane loads the note from disk: save the reference just inserted first.
		await main.save();
		let pane = this.footnotePane;
		if (!this.isOpen(pane) || pane === main.leaf) {
			pane = this.app.workspace.createLeafBySplit(main.leaf, 'horizontal');
			this.footnotePane = pane;
		}
		if (!(pane.view instanceof MarkdownView) || pane.view.file !== file) {
			await pane.openFile(file, { active: false });
		}
		this.footnoteMain = main.leaf;
		const view = pane.view;
		if (!(view instanceof MarkdownView)) return;
		this.app.workspace.setActiveLeaf(pane, { focus: true });
		const pos = view.editor.offsetToPos(offset);
		view.editor.setCursor(pos);
		view.editor.scrollIntoView({ from: pos, to: pos }, true);
		view.editor.focus();
	}

	/**
	 * Go back from the footnote at the cursor to just after its reference: in the note's main pane when
	 * writing in the footnote pane, otherwise in the same editor. When the footnote was finished with Enter
	 * in the footnote pane, the pane closes if the setting says so.
	 */
	private returnFromFootnote(cm: EditorView, finished: boolean): boolean {
		let source: MarkdownView | null = null;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!source && leaf.view instanceof MarkdownView && cmOf(leaf.view.editor) === cm) source = leaf.view;
		});
		const view = source as MarkdownView | null;
		if (!view) return false;
		const text = view.editor.getValue();
		const ref = referenceFor(text, view.editor.posToOffset(view.editor.getCursor()));
		if (ref === null) return false;

		let target: MarkdownView = view;
		const main = this.footnoteMain;
		let fromPane = false;
		if (view.leaf === this.footnotePane && this.isOpen(main) && main.view instanceof MarkdownView && main.view.file === view.file) {
			target = main.view;
			fromPane = true;
		}
		const pos = target.editor.offsetToPos(ref);
		this.app.workspace.setActiveLeaf(target.leaf, { focus: true });
		target.editor.setCursor(pos);
		target.editor.scrollIntoView({ from: pos, to: pos }, true);
		target.editor.focus();
		if (fromPane && finished && this.settings.closeFootnotePane) {
			const pane = this.footnotePane;
			this.footnotePane = null;
			// Close after Enter's key handling has finished, so the keystroke does not reach the closed pane.
			window.setTimeout(() => pane?.detach(), 0);
		}
		return true;
	}

	private vimMode(): boolean {
		const vault = this.app.vault as unknown as { getConfig?: (key: string) => unknown };
		return vault.getConfig?.('vimMode') === true;
	}

	private jumpFootnote(editor: Editor) {
		const text = editor.getValue();
		const offset = editor.posToOffset(editor.getCursor());
		const scan = scanFootnotes(text);
		const ctx = footnoteAt(text, offset, scan);
		let target: number | null = null;
		if (ctx && !ctx.inline) {
			const note = scan.notes.find((n) => n.def && n.def.contentFrom === ctx.contentFrom);
			if (note?.refs[0]) target = note.refs[0].to;
		} else {
			const ref = scan.refs.find((r) => offset >= r.from && offset <= r.to)
				?? [...scan.refs].reverse().find((r) => r.to <= offset);
			const note = ref ? scan.notes.find((n) => n.label === ref.label) : null;
			if (note?.def) target = note.def.to;
		}
		if (target === null) {
			new Notice('No footnote here.');
			return;
		}
		const pos = editor.offsetToPos(target);
		editor.setCursor(pos);
		editor.scrollIntoView({ from: pos, to: pos }, true);
	}

	/** Tidy the note we are leaving so its footnotes sit at the bottom. */
	private async onLeafChange() {
		const current = this.app.workspace.getActiveFile();
		const previous = this.lastFile;
		this.lastFile = current;
		if (previous && previous !== current) this.history.flush(previous);
		if (!this.settings.tidyOnLeave || !previous || previous === current || previous.extension !== 'md') return;
		// Notes the plugin does not work in are never changed automatically.
		if (!this.enabledFor(previous)) return;
		if (!this.app.vault.getAbstractFileByPath(previous.path)) return;
		const opts = { renumber: this.settings.renumber, convertInline: this.settings.convertInline };
		const tidy = (text: string): string => {
			// Leave notes with a footnote in mid-edit alone.
			if (scanFootnotes(text).notes.some((n) => n.label !== null && !n.def)) return text;
			return tidyFootnotes(text, opts).text;
		};
		// If the note is still open in another pane, edit it there so unsaved typing is not lost.
		let openEditor: Editor | null = null;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!openEditor && leaf.view instanceof MarkdownView && leaf.view.file === previous) openEditor = leaf.view.editor;
		});
		if (openEditor) {
			const ed: Editor = openEditor;
			const before = ed.getValue();
			const after = tidy(before);
			if (after === before) return;
			this.backup(previous, before, 'Before tidying footnotes');
			replaceText(ed, after);
		} else {
			// Not open anywhere: the change cannot be undone in an editor, so it is only made once the
			// text before it is safely in the version history (or history is off).
			const before = await this.app.vault.read(previous);
			if (tidy(before) === before) return;
			if (this.history.enabled && !(await this.history.snapshot(previous.path, before, { label: 'Before tidying footnotes' }))) return;
			await this.app.vault.process(previous, tidy);
		}
	}

	// -----------------------------------------------------------------------------------------------------
	// Import

	private pickWordFile() {
		const input = createEl('input', { attr: { type: 'file', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
		input.addEventListener('change', () => {
			const f = input.files?.[0];
			if (!f) return;
			const folder = this.app.workspace.getActiveFile()?.parent?.path ?? '';
			void f.arrayBuffer().then((data) => this.importWord(new Uint8Array(data), f.name.replace(/\.docx$/i, ''), folder));
		});
		input.click();
	}

	private async importWord(data: Uint8Array, name: string, folder: string) {
		let result;
		try {
			result = importDocx(data);
		} catch (e) {
			new Notice(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
			return;
		}
		const base = normalizePath(`${folder}/${name.replace(/[\\/:*?"<>|#^[\]]/g, ' ').trim() || 'Imported document'}`);
		let path = `${base}.md`;
		for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) path = `${base} ${n}.md`;
		// An imported document is an assignment: mark it, so the plugin works in it whatever "Use AGLC4 in" is.
		const markdown = result.markdown.startsWith('---\n') ? result.markdown.replace(/^---\n/, `---\n${ON_PROPERTY}: true\n`) : `---\n${ON_PROPERTY}: true\n---\n\n${result.markdown}`;
		const file = await this.app.vault.create(path, markdown);
		await this.app.workspace.getLeaf('tab').openFile(file);

		const problems = analyseDocument(result.markdown, { disabled: new Set(this.settings.disabledRules), showInfo: false }).issues.length;
		const lines = [`Imported ${file.basename} with ${result.footnotes} ${result.footnotes === 1 ? 'footnote' : 'footnotes'}.`];
		if (problems > 0) lines.push(`${problems} AGLC4 ${problems === 1 ? 'problem' : 'problems'} found: run "List AGLC4 problems in this note".`);
		if (result.numberedHeadings > 0) {
			lines.push(this.settings.headingScheme === 'aglc'
				? 'Heading numbers were removed: AGLC4 headings number them automatically.'
				: 'Heading numbers were removed. To number headings I, A, 1, (a), (i), choose AGLC4 headings in settings.');
		}
		lines.push(...result.warnings);
		new Notice(lines.join('\n'), 10000);
	}

	// -----------------------------------------------------------------------------------------------------
	// Page preview

	private async openPreview() {
		const existing = this.app.workspace.getLeavesOfType(PAGE_PREVIEW_VIEW)[0];
		if (existing) {
			await this.app.workspace.revealLeaf(existing);
			return;
		}
		const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('split');
		await leaf.setViewState({ type: PAGE_PREVIEW_VIEW, active: false });
		await this.app.workspace.revealLeaf(leaf);
	}

	// -----------------------------------------------------------------------------------------------------
	// Export

	// -----------------------------------------------------------------------------------------------------
	// Which notes

	private frontmatterOf(path: string | null): Record<string, unknown> | null {
		if (!path) return null;
		const f = this.app.vault.getAbstractFileByPath(path);
		return f instanceof TFile ? (this.app.metadataCache.getFileCache(f)?.frontmatter ?? null) : null;
	}

	/** Whether the plugin works in the note at `path`, and its settings with the note's own properties. */
	forPath(path: string | null): { enabled: boolean; settings: Aglc4Settings } {
		const fm = this.frontmatterOf(path);
		return { enabled: noteEnabled(this.settings, path, fm), settings: noteSettings(this.settings, fm) };
	}

	enabledFor(file: TFile | null): boolean {
		return this.forPath(file?.path ?? null).enabled;
	}

	/** Turn the plugin on or off for a note, with its "aglc" property. */
	async setNoteEnabled(file: TFile, on: boolean) {
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => { fm[ON_PROPERTY] = on; });
		new Notice(on ? `AGLC4 is on for ${file.basename}.` : `AGLC4 is off for ${file.basename}: it is not checked or changed automatically.`);
	}

	/**
	 * When the plugin is limited to assignment notes, offer to mark the notes that have footnotes, so that
	 * the notes it already worked in stay on.
	 */
	offerToMarkNotes() {
		const notes = this.app.vault.getMarkdownFiles().filter((f) => {
			const cache = this.app.metadataCache.getFileCache(f);
			return (cache?.footnotes?.length ?? 0) > 0 && cache?.frontmatter?.[ON_PROPERTY] === undefined && !this.enabledFor(f);
		});
		if (notes.length === 0) return;
		new ConfirmModal(
			this.app,
			'Mark your existing assignments?',
			`${notes.length} ${notes.length === 1 ? 'note has' : 'notes have'} footnotes and would now be off. Mark ${notes.length === 1 ? 'it' : 'them'} as assignment notes (property "aglc" ticked) so AGLC4 stays on? You can turn any note off later with "Turn AGLC4 off for this note".`,
			'Mark them',
			() => {
				void (async () => {
					for (const f of notes) await this.app.fileManager.processFrontMatter(f, (fm: Record<string, unknown>) => { fm[ON_PROPERTY] = true; });
					new Notice(`Marked ${notes.length} ${notes.length === 1 ? 'note' : 'notes'} as assignment notes.`);
				})();
			},
		).open();
	}

	/** Create the example essay (never replacing a note) and open it. */
	async createExampleEssay() {
		let path = `${EXAMPLE_NAME}.md`;
		for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) path = `${EXAMPLE_NAME} ${n}.md`;
		const file = await this.app.vault.create(path, EXAMPLE_ESSAY);
		await this.app.workspace.getLeaf('tab').openFile(file);
		new Notice(`Created ${file.basename}. The comment at the top is a short tour of what to try.`, 8000);
	}

	exportOptions(file: TFile): ExportOptions {
		const s = this.forPath(file.path).settings;
		return {
			font: s.font,
			fontSize: s.fontSize,
			footnoteSize: s.footnoteSize,
			lineSpacing: s.lineSpacing,
			smartQuotes: s.smartQuotes,
			pageNumbers: s.pageNumbers,
			title: s.useTitle ? file.basename : undefined,
			headingScheme: s.headingScheme,
			aglcTopLevel: s.aglcTopLevel,
			keepFootnotesTogether: s.keepFootnotesTogether,
			bibliography: s.bibliography,
		};
	}

	/** Where a note's export is written. */
	exportPath(file: TFile, format: 'docx' | 'html'): string {
		const folder = this.settings.exportFolder || file.parent?.path || '';
		return normalizePath(`${folder}/${file.basename}.${format}`);
	}

	/** The first free path like `path` ("Essay 2.docx", "Essay 3.docx" …). */
	private freePath(path: string): string {
		const dot = path.lastIndexOf('.');
		const base = path.slice(0, dot);
		const ext = path.slice(dot);
		let n = 2;
		while (this.app.vault.getAbstractFileByPath(`${base} ${n}${ext}`)) n++;
		return `${base} ${n}${ext}`;
	}

	/** True when an exported file was changed (eg edited in Word) since the plugin last wrote it. */
	private async changedSinceExport(path: string): Promise<boolean> {
		const stat = await this.app.vault.adapter.stat(path);
		if (!stat) return false;
		const written = this.history.enabled ? await this.history.getWritten(path).catch(() => null) : null;
		return !written || written.mtime !== stat.mtime || written.size !== stat.size;
	}

	private async exportFile(file: TFile, format: 'docx' | 'html') {
		const folder = this.settings.exportFolder || file.parent?.path || '';
		if (this.settings.exportFolder && !this.app.vault.getAbstractFileByPath(folder)) {
			await this.app.vault.createFolder(folder);
		}
		const path = this.exportPath(file, format);
		if (this.app.vault.getAbstractFileByPath(path) instanceof TFile && (await this.changedSinceExport(path))) {
			const kept = this.history.enabled ? ' If you replace it, the current file is kept in the note\'s version history and can be restored.' : '';
			new ChoiceModal(
				this.app,
				`${file.basename}.${format} already exists`,
				`${path} has changed since it was last exported from this note (it may have been edited in Word), or it was not exported by this plugin.${kept}`,
				[
					{ label: 'Save as a new file', action: () => { void this.writeExport(file, format, this.freePath(path)); } },
					{ label: 'Replace it', cta: true, action: () => { void this.writeExport(file, format, path); } },
				],
			).open();
			return;
		}
		await this.writeExport(file, format, path);
	}

	private async writeExport(file: TFile, format: 'docx' | 'html', path: string) {
		const markdown = await this.app.vault.cachedRead(file);
		const analysis = analyseDocument(markdown, { disabled: new Set(this.settings.disabledRules), showInfo: false });
		const errors = analysis.issues.filter((i) => i.severity === 'error').length;
		try {
			let footnotes: number;
			let warnings: string[] = [];
			let data: string | ArrayBuffer;
			if (format === 'docx') {
				const r = await exportDocx(markdown, this.exportOptions(file));
				footnotes = r.footnotes;
				warnings = r.warnings;
				data = r.data;
			} else {
				const opts = this.exportOptions(file);
				const r = exportHtml(markdown, { ...opts, title: opts.title ?? file.basename });
				footnotes = r.footnotes;
				data = r.html;
			}
			const existing = this.app.vault.getAbstractFileByPath(path);
			let kept = false;
			if (existing instanceof TFile) {
				// Keep the file being replaced. If that fails, do not replace it.
				if (this.history.enabled) {
					const old = format === 'docx' ? await this.app.vault.readBinary(existing) : await this.app.vault.read(existing);
					if (!(await this.history.snapshot(path, old, { label: 'Before exporting again' }))) {
						new Notice(`Export cancelled: a copy of the existing ${path} could not be kept, so it was not replaced.`);
						return;
					}
					kept = true;
				}
				if (typeof data === 'string') await this.app.vault.modify(existing, data);
				else await this.app.vault.modifyBinary(existing, data);
			} else if (typeof data === 'string') {
				await this.app.vault.create(path, data);
			} else {
				await this.app.vault.createBinary(path, data);
			}
			await this.recordWritten(path);
			const notes = [`Exported ${path} with ${footnotes} ${footnotes === 1 ? 'footnote' : 'footnotes'}.`];
			if (kept) notes.push('The file it replaced is kept in the note\'s version history.');
			if (errors > 0) notes.push(`${errors} AGLC4 ${errors === 1 ? 'error was' : 'errors were'} exported as written.`);
			notes.push(...warnings);
			new Notice(notes.join('\n'), 8000);
		} catch (e) {
			console.error('AGLC4 export failed', e);
			new Notice(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	/** Remember an exported file's state, to notice if it is later changed elsewhere. */
	private async recordWritten(path: string) {
		if (!this.history.enabled) return;
		const stat = await this.app.vault.adapter.stat(path);
		if (stat) await this.history.setWritten(path, { mtime: stat.mtime, size: stat.size }).catch(() => undefined);
	}

	// -----------------------------------------------------------------------------------------------------
	// Version history

	/** Keep the text before a change the plugin makes in an editor (which Undo can also reverse). */
	private backup(file: TFile | null, text: string, label: string) {
		if (file && this.history.enabled) void this.history.snapshot(file.path, text, { label });
	}

	private editorFor(file: TFile): Editor | null {
		let found: Editor | null = null;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!found && leaf.view instanceof MarkdownView && leaf.view.file === file) found = leaf.view.editor;
		});
		return found;
	}

	/** Restore a note's text, keeping the current text in the history first. */
	private async restoreNote(file: TFile, text: string, label: string) {
		const editor = this.editorFor(file);
		const current = editor ? editor.getValue() : await this.app.vault.read(file);
		if (current === text) return;
		if (this.history.enabled && !(await this.history.snapshot(file.path, current, { label }))) {
			new Notice('Not restored: the current text could not be kept in the version history first.');
			return;
		}
		if (editor) replaceText(editor, text);
		else await this.app.vault.modify(file, text);
	}

	/** Restore an earlier copy of an exported file, keeping the current one in the history first. */
	private async restoreExport(path: string, data: string | ArrayBuffer, label: string) {
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			const old = typeof data === 'string' ? await this.app.vault.read(existing) : await this.app.vault.readBinary(existing);
			if (!(await this.history.snapshot(path, old, { label }))) {
				new Notice('Not restored: the current file could not be kept in the version history first.');
				return;
			}
			if (typeof data === 'string') await this.app.vault.modify(existing, data);
			else await this.app.vault.modifyBinary(existing, data);
		} else if (typeof data === 'string') {
			await this.app.vault.create(path, data);
		} else {
			await this.app.vault.createBinary(path, data);
		}
		await this.recordWritten(path);
		new Notice(`Restored ${path}.`);
	}

	private async openHistory(file?: TFile) {
		if (file && this.app.workspace.getActiveFile() !== file) await this.app.workspace.getLeaf(false).openFile(file);
		const existing = this.app.workspace.getLeavesOfType(HISTORY_VIEW)[0];
		if (existing) {
			await this.app.workspace.revealLeaf(existing);
			return;
		}
		const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('split');
		await leaf.setViewState({ type: HISTORY_VIEW, active: false });
		await this.app.workspace.revealLeaf(leaf);
	}

	private async restoreDeleted() {
		if (!this.history.enabled) {
			new Notice('Version history is turned off in settings.');
			return;
		}
		const entries = (await this.history.deleted()).filter((e) => e.path.endsWith('.md'));
		if (entries.length === 0) {
			new Notice('No deleted notes in the version history.');
			return;
		}
		new DeletedModal(this.app, entries, (e) => {
			void (async () => {
				const newest = e.versions[e.versions.length - 1]!;
				let text: string | ArrayBuffer;
				try {
					text = await this.history.readDeleted(e, newest);
				} catch (err) {
					new Notice(err instanceof Error ? err.message : String(err));
					return;
				}
				if (typeof text !== 'string') return;
				const path = this.app.vault.getAbstractFileByPath(e.path) ? this.freePath(e.path) : e.path;
				const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
				if (folder && !this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
				await this.history.undelete(e, path);
				const file = await this.app.vault.create(path, text);
				await this.app.workspace.getLeaf('tab').openFile(file);
				new Notice(`Restored ${path} as last saved ${formatDay(newest.time)}, ${formatTime(newest.time)}. Its earlier versions are in its version history.`);
			})();
		}).open();
	}

	// -----------------------------------------------------------------------------------------------------
	// Settings

	onunload() {
		this.history.flushAll();
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<Aglc4Settings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStatusVisibility();
		this.refreshEditors();
		for (const leaf of this.app.workspace.getLeavesOfType(PAGE_PREVIEW_VIEW)) {
			if (leaf.view instanceof PagePreviewView) leaf.view.rerender();
		}
	}

	private async disableRule(rule: string) {
		if (!this.settings.disabledRules.includes(rule)) this.settings.disabledRules.push(rule);
		await this.saveSettings();
		new Notice(`AGLC4 rule "${rule}" disabled. Re-enable it in the plugin settings.`);
	}

	private refreshEditors() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const cm = cmOf(leaf.view.editor);
				cm?.dispatch({ effects: refreshEffect.of(null) });
			}
		});
	}
}
