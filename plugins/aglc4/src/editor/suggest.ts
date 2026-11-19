/**
 * Next-element suggestions: a popup while typing in a footnote, and a picker opened by command.
 */
import { type App, type Editor, type EditorPosition, EditorSuggest, type EditorSuggestContext, type EditorSuggestTriggerInfo, SuggestModal, type TFile } from 'obsidian';
import { type Suggestion, suggestNext } from '@legal-core/aglc';
import type { Aglc4Settings } from '../settings';
import { expandSnippet, footnoteAt } from './context';

/** The popup opens by itself at the end of an element: after closing punctuation or a number. */
const TRIGGER_AFTER = /(?:[,*_)\]'’>]\s?|\d\s)$/;

/** Text of the footnote at the cursor, up to the cursor, or null outside footnotes. */
export function footnoteTextBeforeCursor(editor: Editor): { before: string; cursor: EditorPosition } | null {
	const cursor = editor.getCursor();
	const text = editor.getValue();
	const offset = editor.posToOffset(cursor);
	const ctx = footnoteAt(text, offset);
	if (!ctx) return null;
	const after = text.slice(offset, ctx.contentTo);
	if (!/^\s*(?:;|$)/.test(after) && !/^[\])]/.test(after)) return null;
	return { before: text.slice(ctx.contentFrom, offset), cursor };
}

/** Insert a suggestion at the cursor, selecting its first placeholder. */
export function applySuggestion(editor: Editor, s: Suggestion, cursor: EditorPosition = editor.getCursor()): void {
	const end = editor.posToOffset(cursor);
	const start = end - s.replaceLength;
	const { text, selFrom, selTo } = expandSnippet(s.insert);
	editor.replaceRange(text, editor.offsetToPos(start), cursor);
	editor.setSelection(editor.offsetToPos(start + selFrom), editor.offsetToPos(start + selTo));
}

function renderSuggestion(s: Suggestion, el: HTMLElement): void {
	el.addClass('aglc-suggestion');
	const top = el.createDiv({ cls: 'aglc-suggestion-top' });
	top.createSpan({ cls: 'aglc-suggestion-label', text: s.label });
	if (s.required) top.createSpan({ cls: 'aglc-suggestion-required', text: 'required' });
	if (s.source && s.source !== s.label) top.createSpan({ cls: 'aglc-suggestion-source', text: s.source });
	el.createDiv({ cls: 'aglc-suggestion-hint', text: s.hint });
}

export class NextElementSuggest extends EditorSuggest<Suggestion> {
	constructor(app: App, private settings: () => Aglc4Settings, private enabledFor: (file: TFile | null) => boolean = () => true) {
		super(app);
		this.limit = 20;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		if (!this.settings().autoSuggest || !this.enabledFor(file)) return null;
		const line = editor.getLine(cursor.line).slice(0, cursor.ch);
		if (!TRIGGER_AFTER.test(line) && !/\]:\s?$/.test(line) && !/\^\[$/.test(line)) return null;
		const ctx = footnoteTextBeforeCursor(editor);
		if (!ctx) return null;
		if (this.atBoundary(ctx.before).length === 0) return null;
		return { start: cursor, end: cursor, query: ctx.before };
	}

	/** Only suggestions that start exactly at the cursor: the popup never replaces typed text. */
	private atBoundary(before: string): Suggestion[] {
		return suggestNext(before).filter((s) => s.replaceLength === 0);
	}

	getSuggestions(context: EditorSuggestContext): Suggestion[] {
		return this.atBoundary(context.query);
	}

	renderSuggestion(s: Suggestion, el: HTMLElement): void {
		renderSuggestion(s, el);
	}

	selectSuggestion(s: Suggestion): void {
		const ctx = this.context;
		if (!ctx) return;
		applySuggestion(ctx.editor, s, ctx.end);
		this.close();
	}
}

/** Picker listing the next elements, opened by command. */
export class NextElementModal extends SuggestModal<Suggestion> {
	constructor(app: App, private editor: Editor, private items: Suggestion[]) {
		super(app);
		this.setPlaceholder('Next citation element');
	}

	getSuggestions(query: string): Suggestion[] {
		const q = query.toLowerCase();
		return this.items.filter((s) => `${s.label} ${s.source} ${s.hint}`.toLowerCase().includes(q));
	}

	renderSuggestion(s: Suggestion, el: HTMLElement): void {
		renderSuggestion(s, el);
	}

	onChooseSuggestion(s: Suggestion): void {
		applySuggestion(this.editor, s);
	}
}
