import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { type GuideAction, guideAction, guideExtension, shownGuide } from '../src/editor/guide';
import type { AglcHost } from '../src/editor/extension';
import { DEFAULT_SETTINGS } from '../src/settings';
import { IRAC, PROBLEM_ALTERNATIVES } from '../src/prompts/sets';

const host = {
	settings: DEFAULT_SETTINGS,
	forPath: () => ({ enabled: true, settings: DEFAULT_SETTINGS }),
	promptSet: () => IRAC,
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
		// Not past either end.
		expect(shownGuide(act(s, { type: 'sentence', step: -9 }))!.current).toBe(0);
		expect(shownGuide(act(s, { type: 'sentence', step: 9 }))!.current).toBe(4);
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
