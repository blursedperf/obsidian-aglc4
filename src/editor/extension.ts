/**
 * CodeMirror extension: underlines AGLC4 problems in footnotes, shows the next required element after
 * the cursor, explains problems on hover with one-click fixes, and keeps "(n X)" cross-references
 * pointing at the right footnotes.
 */
import { type Extension, Prec, StateEffect } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType, hoverTooltip, keymap } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { nextRequired } from '../aglc/citation';
import { type DocumentAnalysis, analyseDocument } from '../aglc/document';
import type { Issue } from '../aglc/types';
import { excludedRanges, footnoteKeys, remapCrossReferences, scanFootnotes, type FootnoteScan } from '../footnotes';
import { type TopLevel, backMatterIndex, hasTypedNumber, numberHeadings } from '../layout/headings';
import type { Aglc4Settings } from '../settings';
import { atFinishedFootnote, footnoteAt, minimalChange, referenceFor } from './context';

export interface AglcHost {
	settings: Aglc4Settings;
	/** Whether the plugin works in the note at `path`, and the note's settings (with its own properties). */
	forPath(path: string | null): { enabled: boolean; settings: Aglc4Settings };
	/** Called after each analysis of the focused editor, for the status bar; null in a note that is off. */
	report(analysis: DocumentAnalysis | null, next: string | null, view: EditorView): void;
	disableRule(rule: string): void;
	/**
	 * Go back from the footnote at the cursor to its reference. `finished` is true when the footnote was
	 * finished with Enter (the footnote pane may then close). Returns false if there is no reference.
	 */
	returnFromFootnote(view: EditorView, finished: boolean): boolean;
	/** True when Vim key bindings are on, so Escape is left to Vim. */
	vimMode(): boolean;
}

/** Dispatch to make every editor re-run the analysis (eg after settings change). */
export const refreshEffect = StateEffect.define<null>();

class HintWidget extends WidgetType {
	constructor(readonly label: string, readonly hint: string) { super(); }
	eq(other: HintWidget): boolean { return other.label === this.label; }
	toDOM(): HTMLElement {
		const el = createSpan({ cls: 'aglc-hint', text: `‹${this.label}›` });
		el.setAttribute('aria-label', this.hint);
		return el;
	}
	ignoreEvent(): boolean { return true; }
}

/** A heading's AGLC4 number, shown faintly before the heading text. */
class HeadingNumberWidget extends WidgetType {
	constructor(readonly number: string) { super(); }
	eq(other: HeadingNumberWidget): boolean { return other.number === this.number; }
	toDOM(): HTMLElement {
		const el = createSpan({ cls: 'aglc-heading-num', text: this.number });
		el.setAttribute('aria-label', 'AGLC4 heading number, added on export');
		return el;
	}
	ignoreEvent(): boolean { return true; }
}

/** Positions and AGLC4 numbers of the headings in a note. */
function headingNumbers(text: string, top: TopLevel): { at: number; number: string }[] {
	const excluded = excludedRanges(text);
	const found: { level: number; at: number; text: string }[] = [];
	const re = /^(#{1,6})[ \t]+(.*)$/gm;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const at = m.index;
		if (excluded.some(([a, b]) => at >= a && at < b)) continue;
		found.push({ level: m[1]!.length, at: at + m[0].length - m[2]!.length, text: m[2]! });
	}
	const numbers = numberHeadings(found.map((f) => f.level), top, backMatterIndex(found.map((f) => f.text)));
	return found.flatMap((f, i) => {
		const n = numbers[i]!.number;
		return n && !hasTypedNumber(f.text) ? [{ at: f.at, number: n }] : [];
	});
}

function pathOf(view: EditorView): string | null {
	return view.state.field(editorInfoField, false)?.file?.path ?? null;
}

function isConsistent(scan: FootnoteScan): boolean {
	return scan.notes.every((n) => n.label === null || n.def !== null) && scan.defs.every((d) => scan.notes.some((n) => n.def === d));
}

export function buildExtension(host: AglcHost): Extension {
	const plugin = ViewPlugin.fromClass(class {
		decorations: DecorationSet = Decoration.none;
		analysis: DocumentAnalysis | null = null;
		private snapshot: string[] | null = null;
		private path: string | null = null;
		private timer: number | null = null;

		constructor(readonly view: EditorView) {
			this.compute();
			this.syncSnapshot(true);
		}

		update(u: ViewUpdate) {
			const refresh = u.transactions.some((t) => t.effects.some((e) => e.is(refreshEffect)));
			if (u.docChanged || u.selectionSet || u.focusChanged || refresh) this.compute();
			const path = this.currentPath();
			if (path !== this.path) this.syncSnapshot(true);
			else if (u.docChanged && this.syncing()) this.scheduleSync();
		}

		destroy() {
			if (this.timer !== null) window.clearTimeout(this.timer);
		}

		private currentPath(): string | null {
			return pathOf(this.view);
		}

		private syncing(): boolean {
			const n = host.forPath(this.currentPath());
			return n.enabled && n.settings.syncCrossRefs;
		}

		private scheduleSync() {
			if (this.timer !== null) window.clearTimeout(this.timer);
			this.timer = window.setTimeout(() => { this.timer = null; this.syncSnapshot(false); }, 1200);
		}

		/** Record footnote order; if it changed since the last consistent state, fix "(n X)". */
		private syncSnapshot(reset: boolean) {
			const text = this.view.state.doc.toString();
			const scan = scanFootnotes(text);
			if (!isConsistent(scan) && !reset) return;
			const keys = footnoteKeys(scan);
			const before = this.snapshot;
			this.snapshot = keys;
			this.path = this.currentPath();
			if (reset || !before || !this.syncing()) return;
			if (before.join('\n') === keys.join('\n')) return;
			const r = remapCrossReferences(text, before, keys);
			if (r.changed === 0) return;
			const change = minimalChange(text, r.text);
			if (change) this.view.dispatch({ changes: change, userEvent: 'input.aglc-crossref' });
		}

		private compute() {
			const note = host.forPath(this.currentPath());
			if (!note.enabled) {
				// A note the plugin does not work in: nothing is shown.
				this.analysis = null;
				this.decorations = Decoration.none;
				host.report(null, null, this.view);
				return;
			}
			const s = note.settings;
			const state = this.view.state;
			const text = state.doc.toString();
			const cursor = state.selection.main.head;
			const analysis = analyseDocument(text, { disabled: new Set(s.disabledRules), showInfo: s.showInfo, cursor });
			this.analysis = analysis;

			const ranges = [];
			if (s.underline) {
				for (const i of analysis.issues) {
					const from = Math.max(0, Math.min(i.from, text.length));
					const to = Math.max(from, Math.min(i.to, text.length));
					if (to <= from) continue;
					ranges.push(Decoration.mark({ class: `aglc-issue aglc-${i.severity}` }).range(from, to));
				}
			}

			let next: string | null = null;
			const ctx = footnoteAt(text, cursor, analysis.scan);
			if (ctx) {
				const after = text.slice(cursor, ctx.contentTo);
				if (/^\s*(?:;|$)/.test(after)) {
					const hint = nextRequired(text.slice(ctx.contentFrom, cursor));
					if (hint) {
						next = hint.label;
						if (s.ghostHint && state.selection.main.empty) {
							ranges.push(Decoration.widget({ widget: new HintWidget(hint.label, hint.hint), side: 1 }).range(cursor));
						}
					}
				}
			}
			if (s.headingScheme === 'aglc') {
				for (const h of headingNumbers(text, s.aglcTopLevel)) {
					ranges.push(Decoration.widget({ widget: new HeadingNumberWidget(h.number), side: -1 }).range(h.at));
				}
			}
			this.decorations = Decoration.set(ranges, true);
			host.report(analysis, next, this.view);
		}
	}, { decorations: (v) => v.decorations });

	const tooltip = hoverTooltip((view, pos) => {
		const note = host.forPath(pathOf(view));
		if (!note.enabled || !note.settings.underline) return null;
		const inst = view.plugin(plugin);
		const issues = inst?.analysis?.issues.filter((i) => pos >= i.from && pos <= i.to) ?? [];
		if (issues.length === 0) return null;
		return {
			pos: Math.min(...issues.map((i) => i.from)),
			end: Math.max(...issues.map((i) => i.to)),
			above: true,
			create: () => ({ dom: renderTooltip(view, issues, host) }),
		};
	}, { hoverTime: 350 });

	// Option: finish a footnote and go back to the text. Enter only after the closing full stop, where no
	// suggestion list can be open; Escape anywhere in a footnote, unless a suggestion list is open.
	const finishKeys = Prec.high(keymap.of([
		{
			key: 'Enter',
			run: (view) => {
				const note = host.forPath(pathOf(view));
				if (!note.enabled || !note.settings.returnOnFinish || !view.state.selection.main.empty) return false;
				const text = view.state.doc.toString();
				if (!atFinishedFootnote(text, view.state.selection.main.head)) return false;
				return host.returnFromFootnote(view, true);
			},
		},
		{
			key: 'Escape',
			run: (view) => {
				const note = host.forPath(pathOf(view));
				if (!note.enabled || !note.settings.returnOnFinish || host.vimMode()) return false;
				if (view.dom.ownerDocument.querySelector('.suggestion-container')) return false;
				if (referenceFor(view.state.doc.toString(), view.state.selection.main.head) === null) return false;
				return host.returnFromFootnote(view, false);
			},
		},
	]));

	return [plugin, tooltip, finishKeys];
}

const SEVERITY_LABEL: Record<Issue['severity'], string> = { error: 'Error', warning: 'Warning', info: 'Suggestion' };

function renderTooltip(view: EditorView, issues: Issue[], host: AglcHost): HTMLElement {
	const dom = createDiv({ cls: 'aglc-tooltip' });
	for (const i of issues) {
		const item = dom.createDiv({ cls: `aglc-tooltip-item aglc-tooltip-${i.severity}` });
		const head = item.createDiv({ cls: 'aglc-tooltip-head' });
		head.createSpan({ cls: 'aglc-tooltip-severity', text: SEVERITY_LABEL[i.severity] });
		if (i.ref) head.createSpan({ cls: 'aglc-tooltip-ref', text: `AGLC4 ${i.ref}` });
		item.createDiv({ cls: 'aglc-tooltip-message', text: i.message });
		const actions = item.createDiv({ cls: 'aglc-tooltip-actions' });
		if (i.fix) {
			const fix = i.fix;
			const preview = fix.insert === '' ? 'remove' : `“${fix.insert.length > 40 ? `${fix.insert.slice(0, 40)}…` : fix.insert}”`;
			const btn = actions.createEl('button', { cls: 'mod-cta', text: fix.label ?? `Fix: ${preview}` });
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				view.dispatch({ changes: { from: fix.from, to: fix.to, insert: fix.insert }, userEvent: 'input.aglc-fix' });
				view.focus();
			});
		}
		const ignore = actions.createEl('button', { text: 'Ignore this rule' });
		ignore.setAttribute('aria-label', `Disable rule "${i.rule}" in settings`);
		ignore.addEventListener('click', (e) => {
			e.preventDefault();
			host.disableRule(i.rule);
		});
	}
	return dom;
}
