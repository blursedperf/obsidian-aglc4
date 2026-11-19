import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { fixChange } from '../plugins/aglc4/src/editor/extension';

describe('Fix button', () => {
	it('applies its fix to the text it was shown for', () => {
		const fix = { from: 15, to: 19, insert: ', ' };
		const doc = EditorState.create({ doc: 'Cite: 175 CLR 1 at 45.' }).doc;
		expect(fixChange(doc, doc, fix)).toEqual(fix);
	});
	it('does nothing once the text has changed, so a second press cannot delete more', () => {
		let state = EditorState.create({ doc: 'Cite: 175 CLR 1 at 45.' });
		const shown = state.doc;
		const first = fixChange(state.doc, shown, { from: 15, to: 19, insert: ', ' })!;
		state = state.update({ changes: first }).state;
		expect(state.doc.toString()).toBe('Cite: 175 CLR 1, 45.');
		// Pressing again: the box still holds the old positions.
		expect(fixChange(state.doc, shown, { from: 15, to: 19, insert: ', ' })).toBeNull();
		expect(state.doc.toString()).toBe('Cite: 175 CLR 1, 45.');
	});
});
