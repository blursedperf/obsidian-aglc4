import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { type GuideAction, guideAction, guideExtension, shownGuide } from '../src/editor/guide';
import type { AglcHost } from '../src/editor/extension';
import { DEFAULT_SETTINGS } from '../src/settings';
import { CRITICAL, IRAC, PROBLEM_ALTERNATIVES, type PromptSet } from '../src/prompts/sets';

/** The prompt set every test editor uses. */
let set: PromptSet = IRAC;
const host = {
	settings: DEFAULT_SETTINGS,
	forPath: () => ({ enabled: true, settings: DEFAULT_SETTINGS }),
	promptSet: () => set,
} as unknown as AglcHost;
const extension = guideExtension(host);

/** An editor on `doc` with the cursor at `|`. */
function editor(doc: string): EditorState {
	const at = doc.indexOf('|');
	return EditorState.create({ doc: doc.replace('|', ''), selection: { anchor: at }, extensions: extension });
}
const act = (s: EditorState, ...actions: GuideAction[]) => actions.reduce((st, a) => st.update({ effects: guideAction.of(a) }).state, s);
const type = (s: EditorState, text: string) => s.update({ changes: { from: s.selection.main.head, insert: text }, selection: { anchor: s.selection.main.head + text.length } }).state;

describe('paragraph guide: changing it for one paragraph', () => {
	it('shows the usual guide, with the sentence counted automatically', () => {
		const g = shownGuide(editor('## Application\n\nHere, X offered. |'))!;
		expect(g.prompt.aim).toBe('Application: one element applied to the facts');
		expect(g.current).toBe(1);
		expect(g).toMatchObject({ index: 0, options: 3, alternative: null });
	});

	it('moves the highlight, and keeps counting from there', () => {
		let s = act(editor('## Application\n\nThe first question is whether X accepted. |'), { type: 'sentence-at', index: 3 });
		expect(shownGuide(s)!.current).toBe(3);
		s = type(s, 'This is so because it was in writing. ');
		expect(shownGuide(s)!.current).toBe(4);
		s = act(s, { type: 'sentence', step: -1 }, { type: 'sentence', step: -1 });
		expect(shownGuide(s)!.current).toBe(2);
		// Not before the first; past the guide's last, on into the section's next guides, but not past theirs.
		expect(shownGuide(act(s, { type: 'sentence', step: -9 }))).toMatchObject({ index: 0, current: 0 });
		expect(shownGuide(act(s, { type: 'sentence', step: 3 }))).toMatchObject({ index: 1, current: 0 });
		expect(shownGuide(act(s, { type: 'sentence', step: 99 }))).toMatchObject({ index: 2, current: 3 });
	});

	it('cycles through the alternatives for the current sentence, then back to the guide', () => {
		let s = act(editor('## Application\n\nHere, X offered. |'), { type: 'alternative', step: 1 });
		expect(shownGuide(s)!.alternative).toEqual({ text: PROBLEM_ALTERNATIVES[0], index: 0, count: PROBLEM_ALTERNATIVES.length });
		s = act(s, { type: 'alternative', step: 1 });
		expect(shownGuide(s)!.alternative!.index).toBe(1);
		s = act(s, { type: 'alternative', step: -1 }, { type: 'alternative', step: -1 });
		expect(shownGuide(s)!.alternative).toBeNull();
		expect(shownGuide(act(s, { type: 'alternative', step: -1 }))!.alternative!.index).toBe(PROBLEM_ALTERNATIVES.length - 1);
	});

	it('drops the alternative once that sentence is finished, back to the structure', () => {
		let s = act(editor('## Application\n\nHere, X offered. |'), { type: 'alternative', step: 1 });
		s = type(s, 'This is consistent with Smith. ');
		const g = shownGuide(s)!;
		expect(g.alternative).toBeNull();
		expect(g.current).toBe(2);
	});

	it('offers alternatives after the guide\'s last sentence', () => {
		let s = editor(`## Conclusion\n\n${'Sentence. '.repeat(5)}|`);
		expect(shownGuide(s)!.current).toBe(5);
		s = act(s, { type: 'alternative', step: 1 });
		expect(shownGuide(s)!.alternative!.index).toBe(0);
	});

	it('carries a paragraph with more sentences than its guide on into the next guide', () => {
		// An introduction written as one paragraph: context, issue, thesis, then the roadmap.
		set = CRITICAL;
		let s = editor('## Introduction\n\nContext. The issue is X. This essay argues Y|');
		expect(shownGuide(s)).toMatchObject({ index: 0, current: 2 });
		// The full stop alone does not finish the sentence; the space after it does.
		s = type(s, '.');
		expect(shownGuide(s)).toMatchObject({ index: 0, current: 2 });
		s = type(s, ' ');
		expect(shownGuide(s)).toMatchObject({ index: 1, current: 0, prompt: { aim: 'Introduction: the roadmap' } });
		s = type(s, 'Part II examines. Scope. Definitions. ');
		const g = shownGuide(s)!;
		expect(g.index).toBe(1);
		expect(g.current).toBe(3); // past the last guide: "the structure is complete"
		set = IRAC;
	});

	it('gives the next paragraph the guide after the one the last paragraph ended in', () => {
		set = CRITICAL;
		// The roadmap was written in the first paragraph: the second opens the essay's first part, not the roadmap again.
		expect(shownGuide(editor('## Introduction\n\nContext. Issue. Thesis. Roadmap.\n\n|'))).toMatchObject({ index: 1 });
		expect(shownGuide(editor('# Essay\n\nContext. Issue. Thesis. Roadmap.\n\n|'))!.prompt.aim).toBe('Opening a part: what it argues');
		// A short paragraph still moves on to the next guide.
		expect(shownGuide(editor('# Essay\n\nThesis.\n\n|'))!.prompt.aim).toBe('Introduction: the roadmap');
		set = IRAC;
	});

	it('starts a guide chosen mid-paragraph at its first sentence', () => {
		const s = act(editor('## Application\n\nThe first question is whether X accepted. Here, X wrote back. |'), { type: 'guide', step: 2 });
		expect(shownGuide(s)).toMatchObject({ index: 2, current: 0 });
		expect(shownGuide(type(s, 'X may argue it lapsed. '))).toMatchObject({ index: 2, current: 1 });
	});

	it('switches to another of the section\'s paragraph guides, and round', () => {
		let s = act(editor('## Application\n\nOne.\n\nX may argue|'), { type: 'guide', step: 1 });
		expect(shownGuide(s)).toMatchObject({ index: 2, prompt: { aim: 'Application: the other side' } });
		s = act(s, { type: 'guide', step: 1 });
		expect(shownGuide(s)!.index).toBe(0);
		s = act(s, { type: 'guide', step: -1 });
		expect(shownGuide(s)!.index).toBe(2);
		// The choice lasts while the paragraph is written.
		s = type(s, ' that the offer had lapsed. ');
		expect(shownGuide(s)!.prompt.aim).toBe('Application: the other side');
	});

	it('forgets the choices in another paragraph', () => {
		let s = act(editor('## Application\n\nOne.|\n\nTwo.'), { type: 'guide', step: 1 }, { type: 'sentence-at', index: 3 });
		expect(shownGuide(s)!.index).toBe(1);
		s = s.update({ selection: EditorSelection.cursor(s.doc.length) }).state;
		expect(shownGuide(s)).toMatchObject({ index: 1, current: 0 });
		s = s.update({ selection: EditorSelection.cursor('## Application\n\nOne.'.length) }).state;
		expect(shownGuide(s)).toMatchObject({ index: 0, current: 0 });
	});

	it('shows no guide where there is none, and ignores actions there', () => {
		const s = act(editor('## Application\n\n- a list|'), { type: 'guide', step: 1 });
		expect(shownGuide(s)).toBeNull();
	});
});
