/**
 * Paragraph guides: the prompt for the paragraph being written, shown above it while you write it, with
 * its sentence-by-sentence structure and the sentence you are on highlighted. Drawn by the editor, never
 * part of the note.
 *
 * Block widgets (between lines) must come from a state field, not a view plugin.
 */
import { type EditorState, type Extension, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { guideAt } from '../prompts/engine';
import type { Prompt } from '../prompts/sets';
import type { AglcHost } from './extension';
import { refreshEffect } from './extension';

class GuideWidget extends WidgetType {
	constructor(readonly prompt: Prompt, readonly sentence: number, readonly full: boolean) { super(); }

	eq(other: GuideWidget): boolean {
		return other.prompt === this.prompt && other.sentence === this.sentence && other.full === this.full;
	}

	toDOM(): HTMLElement {
		const el = createDiv({ cls: 'aglc-guide' });
		el.setAttribute('contenteditable', 'false');
		el.createDiv({ cls: 'aglc-guide-aim', text: this.prompt.aim });
		const sentences = this.prompt.sentences;
		if (sentences.length === 0) return el;
		const current = Math.min(this.sentence, sentences.length - 1);
		const shown = this.full ? sentences.map((s, i) => ({ s, i })) : [{ s: sentences[current]!, i: current }];
		const list = el.createEl('ol', { cls: 'aglc-guide-sentences' });
		for (const { s, i } of shown) {
			const item = list.createEl('li', { cls: i === current && this.sentence < sentences.length ? 'is-current' : '' });
			item.setAttribute('value', String(i + 1));
			const colon = s.indexOf(': ');
			if (colon > 0 && colon < 40) {
				item.createSpan({ cls: 'aglc-guide-role', text: s.slice(0, colon) });
				item.appendText(`: ${s.slice(colon + 2)}`);
			} else {
				item.setText(s);
			}
		}
		return el;
	}

	ignoreEvent(): boolean { return true; }
}

export function guideExtension(host: AglcHost): Extension {
	const build = (state: EditorState): DecorationSet => {
		const path = state.field(editorInfoField, false)?.file?.path ?? null;
		if (!host.forPath(path).enabled) return Decoration.none;
		const set = host.promptSet(path);
		if (!set) return Decoration.none;
		const guide = guideAt(state.doc.toString(), state.selection.main.head, set);
		if (!guide) return Decoration.none;
		const widget = new GuideWidget(guide.prompt, guide.sentence, host.settings.promptDetail !== 'current');
		return Decoration.set([Decoration.widget({ widget, block: true, side: -1 }).range(guide.from)]);
	};
	const field = StateField.define<DecorationSet>({
		create: build,
		update(value, tr) {
			if (tr.docChanged || tr.selection || tr.effects.some((e) => e.is(refreshEffect))) return build(tr.state);
			return value;
		},
		provide: (f) => EditorView.decorations.from(f),
	});
	return field;
}
