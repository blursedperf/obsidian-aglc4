/**
 * CodeMirror extension: underlines AGLC4 problems in footnotes, shows the next required element after
 * the cursor, explains problems on hover with one-click fixes, and keeps "(n X)" cross-references
 * pointing at the right footnotes.
 */
import { type Extension, StateEffect } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType, hoverTooltip } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { nextRequired } from '../aglc/citation';
import { type DocumentAnalysis, analyseDocument } from '../aglc/document';
import type { Issue } from '../aglc/types';
import { footnoteKeys, remapCrossReferences, scanFootnotes, type FootnoteScan } from '../footnotes';
import type { Aglc4Settings } from '../settings';
import { footnoteAt, minimalChange } from './context';

export interface AglcHost {
	settings: Aglc4Settings;
	/** Called after each analysis of the focused editor, for the status bar. */
	report(analysis: DocumentAnalysis, next: string | null, view: EditorView): void;
	disableRule(rule: string): void;
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
			else if (u.docChanged && host.settings.syncCrossRefs) this.scheduleSync();
		}

		destroy() {
			if (this.timer !== null) window.clearTimeout(this.timer);
		}

		private currentPath(): string | null {
			return this.view.state.field(editorInfoField, false)?.file?.path ?? null;
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
			if (reset || !before || !host.settings.syncCrossRefs) return;
			if (before.join('\n') === keys.join('\n')) return;
			const r = remapCrossReferences(text, before, keys);
			if (r.changed === 0) return;
			const change = minimalChange(text, r.text);
			if (change) this.view.dispatch({ changes: change, userEvent: 'input.aglc-crossref' });
		}

		private compute() {
			const s = host.settings;
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
			this.decorations = Decoration.set(ranges, true);
			host.report(analysis, next, this.view);
		}
	}, { decorations: (v) => v.decorations });

	const tooltip = hoverTooltip((view, pos) => {
		if (!host.settings.underline) return null;
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

	return [plugin, tooltip];
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
