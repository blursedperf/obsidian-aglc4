import { describe, expect, it } from 'vitest';
import { EditorState, type TransactionSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { analyseFootnote, startSuggestions } from '../src/aglc/citation';
import { MATERIALS } from '../src/aglc/materials';
import { citationJoin } from '../src/editor/context';
import { expandPlaceholders, insertTemplate, movePlaceholder, placeholderExtension, placeholdersPending } from '../src/editor/snippet';

describe('kinds of source to cite', () => {
	it('has a unique id, a group, a template and a correct AGLC4 example for each', () => {
		expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
		for (const m of MATERIALS) {
			const issues = analyseFootnote(`${m.example}.`, { showInfo: false }).issues;
			expect([m.id, issues.map((i) => i.rule)]).toEqual([m.id, []]);
			expect(expandPlaceholders(m.template).text).not.toContain('${');
		}
	});

	it('includes government, law reform and inquiry reports, interim and final', () => {
		const ids = MATERIALS.map((m) => m.id);
		for (const id of ['government-report', 'pc-inquiry', 'pc-draft', 'interim-report', 'final-report', 'royal-commission', 'law-reform-report', 'law-reform-paper', 'committee-report', 'submission']) {
			expect(ids).toContain(id);
		}
		const pc = MATERIALS.find((m) => m.id === 'pc-inquiry')!;
		expect(pc.template).toBe('Productivity Commission, *${Title}* (Inquiry Report No ${1}, ${1 January 2000})');
	});

	it('recognises reports and submissions as citations, so they are checked', () => {
		const kind = (t: string) => analyseFootnote(t).segments[0]!.kind;
		for (const id of ['government-report', 'pc-inquiry', 'pc-draft', 'interim-report', 'final-report', 'royal-commission', 'law-reform-report', 'law-reform-paper', 'committee-report']) {
			expect([id, kind(`${MATERIALS.find((m) => m.id === id)!.example}.`)]).toEqual([id, 'book']);
		}
		expect(kind(`${MATERIALS.find((m) => m.id === 'submission')!.example}.`)).toBe('submission');
		// A mistake in a report is found.
		expect(analyseFootnote('Productivity Commission, *Title* (Inquiry Report No 95, 30 June 2020), 12.').issues.map((i) => i.rule)).toContain('book-pinpoint-comma');
	});

	it('offers every kind in an empty footnote, with ibid in lower case after a signal', () => {
		const labels = startSuggestions(false).map((s) => s.label);
		expect(labels).toEqual(MATERIALS.map((m) => m.label));
		expect(startSuggestions(true).find((s) => s.label === 'Ibid')!.insert).toBe('ibid');
	});
});

describe('joining a new citation to the footnote', () => {
	it('adds nothing, a space or a semicolon as the text before requires', () => {
		const join = (t: string) => citationJoin(t);
		expect(join('')).toEqual({ insert: '', replace: 0 });
		expect(join('See ')).toEqual({ insert: ' ', replace: 1 });
		expect(join('See, eg,')).toEqual({ insert: ' ', replace: 0 });
		expect(join('*Smith v Jones* (1992) 175 CLR 1; ')).toEqual({ insert: ' ', replace: 1 });
		expect(join('*Smith v Jones* (1992) 175 CLR 1.')).toEqual({ insert: ' ', replace: 0 });
		expect(join('*Smith v Jones* (1992) 175 CLR 1, 30')).toEqual({ insert: '; ', replace: 0 });
		expect(join('*Smith v Jones* (1992) 175 CLR 1, 30 ')).toEqual({ insert: '; ', replace: 1 });
	});
});

describe('placeholders of an inserted citation', () => {
	/** A stand-in for the editor view: the code under test only reads its state and dispatches. */
	const view = (doc: string) => {
		const v = {
			state: EditorState.create({ doc, selection: { anchor: doc.length }, extensions: placeholderExtension }),
			dispatch(spec: TransactionSpec) { v.state = v.state.update(spec).state; },
		};
		return v as unknown as EditorView & { state: EditorState };
	};
	const selected = (v: EditorView) => v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to);
	const type = (v: EditorView, text: string) => {
		const { from, to } = v.state.selection.main;
		v.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
	};

	it('selects the first, then each next with Tab, typing over each, and ends after the last', () => {
		const v = view('[^1]: ');
		insertTemplate(v, 6, 6, 'Productivity Commission, *${Title}* (Inquiry Report No ${1}, ${1 January 2000})');
		expect(selected(v)).toBe('Title');
		type(v, 'Mental Health');
		expect(movePlaceholder(v, 1)).toBe(true);
		expect(selected(v)).toBe('1');
		type(v, '95');
		movePlaceholder(v, 1);
		expect(selected(v)).toBe('1 January 2000');
		// Shift+Tab goes back to the number, now holding what was typed.
		movePlaceholder(v, -1);
		expect(selected(v)).toBe('95');
		movePlaceholder(v, 1);
		type(v, '30 June 2020');
		movePlaceholder(v, 1);
		expect(v.state.doc.toString()).toBe('[^1]: Productivity Commission, *Mental Health* (Inquiry Report No 95, 30 June 2020)');
		expect(v.state.selection.main.head).toBe(v.state.doc.length);
		expect(placeholdersPending(v.state)).toBe(false);
		// Tab is left alone once no placeholders are pending.
		expect(movePlaceholder(v, 1)).toBe(false);
	});

	it('stops when the cursor moves out of the citation', () => {
		const v = view('Text.\n\n[^1]: ');
		insertTemplate(v, 13, 13, '*${Title}* (${Cth})');
		expect(placeholdersPending(v.state)).toBe(true);
		v.dispatch({ selection: { anchor: 0 } });
		expect(placeholdersPending(v.state)).toBe(false);
	});

	it('puts the cursor at the end of a template without placeholders', () => {
		const v = view('[^1]: ');
		insertTemplate(v, 6, 6, 'Ibid');
		expect(v.state.selection.main.head).toBe(10);
		expect(placeholdersPending(v.state)).toBe(false);
	});
});
