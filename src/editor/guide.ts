/**
 * Paragraph guides: the prompt for the paragraph being written, shown above it while you write it, with
 * its sentence-by-sentence structure and the sentence you are on highlighted. Drawn by the editor, never
 * part of the note.
 *
 * When the paragraph needs something else, the guide can be changed for that paragraph: another sentence
 * highlighted (click it, or the commands), another sentence in its place (⟳, from the set's alternatives),
 * or another paragraph guide (‹ ›). These choices last while the cursor stays in the paragraph, and are
 * never saved.
 *
 * Block widgets (between lines) must come from a state field, not a view plugin.
 */
import { type EditorState, type Extension, StateEffect, StateField, type Transaction } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { type Guide, guideAt } from '../prompts/engine';
import type { Prompt } from '../prompts/sets';
import type { AglcHost } from './extension';
import { refreshEffect } from './extension';

/** A change to the guide of the paragraph being written. */
export type GuideAction =
	| { type: 'sentence'; step: number }
	| { type: 'sentence-at'; index: number }
	| { type: 'alternative'; step: number }
	| { type: 'guide'; step: number };

export const guideAction = StateEffect.define<GuideAction>();

/** The writer's choices for one paragraph. */
interface Choice {
	/** The paragraph's start, kept in step with edits. */
	from: number;
	/** The guide chosen from the paragraph's options, if not the usual one. */
	guide: number | null;
	/** How far the highlighted sentence is from the one counted automatically. */
	shift: number;
	/** An alternative shown in place of sentence `at`. */
	alternative: { at: number; index: number } | null;
}

/** What the guide shows. */
interface Shown {
	prompt: Prompt;
	options: number;
	index: number;
	/** The highlighted sentence; may be past the last when the paragraph has more sentences. */
	current: number;
	alternative: { text: string; index: number; count: number } | null;
}

interface GuideState {
	decorations: DecorationSet;
	choice: Choice | null;
	shown: Shown | null;
}

const NONE: GuideState = { decorations: Decoration.none, choice: null, shown: null };

function apply(choice: Choice | null, guide: Guide, alternatives: string[], action: GuideAction): Choice {
	const c: Choice = choice ?? { from: guide.from, guide: null, shift: 0, alternative: null };
	const prompt = guide.options[c.guide ?? guide.index] ?? guide.prompt;
	const last = Math.max(0, prompt.sentences.length - 1);
	const current = Math.max(0, guide.sentence + c.shift);
	switch (action.type) {
		case 'sentence': {
			const next = Math.min(last, Math.max(0, Math.min(current, last + 1) + action.step));
			return { ...c, shift: next - guide.sentence, alternative: null };
		}
		case 'sentence-at':
			return { ...c, shift: Math.min(last, Math.max(0, action.index)) - guide.sentence, alternative: null };
		case 'alternative': {
			const n = alternatives.length;
			if (n === 0) return c;
			// Cycle through the alternatives, then back to the guide's own sentence (position 0).
			const was = c.alternative?.at === current ? c.alternative.index + 1 : 0;
			const pos = (((was + action.step) % (n + 1)) + n + 1) % (n + 1);
			return { ...c, alternative: pos === 0 ? null : { at: current, index: pos - 1 } };
		}
		case 'guide': {
			const n = guide.options.length;
			const index = (((c.guide ?? guide.index) + action.step) % n + n) % n;
			return { from: c.from, guide: index === guide.index ? null : index, shift: 0, alternative: null };
		}
	}
}

class GuideWidget extends WidgetType {
	constructor(readonly shown: Shown, readonly full: boolean) { super(); }

	private key(): string {
		const s = this.shown;
		return `${s.prompt.aim}|${s.prompt.sentences.join('|')}|${s.index}/${s.options}|${s.current}|${s.alternative?.text ?? ''}|${this.full}`;
	}

	eq(other: GuideWidget): boolean {
		return other.key() === this.key();
	}

	toDOM(view: EditorView): HTMLElement {
		const s = this.shown;
		const act = (el: HTMLElement, action: GuideAction, label: string) => {
			el.setAttribute('aria-label', label);
			el.addEventListener('mousedown', (e) => {
				// Act without moving the cursor or the focus out of the text.
				e.preventDefault();
				e.stopPropagation();
				view.dispatch({ effects: guideAction.of(action) });
			});
		};
		const el = createDiv({ cls: 'aglc-guide' });
		el.setAttribute('contenteditable', 'false');

		const head = el.createDiv({ cls: 'aglc-guide-head' });
		head.createSpan({ cls: 'aglc-guide-aim', text: s.prompt.aim });
		if (s.options > 1) {
			const nav = head.createSpan({ cls: 'aglc-guide-nav' });
			act(nav.createSpan({ cls: 'aglc-guide-btn', text: '‹' }), { type: 'guide', step: -1 }, 'Previous paragraph guide');
			nav.createSpan({ cls: 'aglc-guide-count', text: `${s.index + 1} of ${s.options}` });
			act(nav.createSpan({ cls: 'aglc-guide-btn', text: '›' }), { type: 'guide', step: 1 }, 'Next paragraph guide');
		}

		const sentences = s.prompt.sentences;
		const other = (parent: HTMLElement, alt: Shown['alternative']) => {
			act(parent.createSpan({ cls: 'aglc-guide-btn aglc-guide-other', text: '⟳' }), { type: 'alternative', step: 1 },
				alt ? `Other sentence (${alt.index + 1} of ${alt.count}); after the last, back to the guide` : 'Something else: another kind of sentence');
			if (alt) parent.createSpan({ cls: 'aglc-guide-count', text: `${alt.index + 1} of ${alt.count}` });
		};
		const role = (parent: HTMLElement, t: string) => {
			const colon = t.indexOf(': ');
			if (colon > 0 && colon < 40) {
				parent.createSpan({ cls: 'aglc-guide-role', text: t.slice(0, colon) });
				parent.appendText(`: ${t.slice(colon + 2)}`);
			} else {
				parent.setText(t);
			}
		};
		const current = Math.min(s.current, Math.max(0, sentences.length - 1));
		const past = s.current >= sentences.length;
		const addMore = () => {
			// The paragraph has more sentences than the guide: offer the alternatives for the next one.
			const more = el.createDiv({ cls: ['aglc-guide-more', s.alternative ? 'is-alternative' : ''].filter(Boolean).join(' ') });
			role(more.createSpan({ cls: 'aglc-guide-sentence' }), s.alternative ? s.alternative.text : sentences.length > 0 ? 'Next: the structure is complete; end the paragraph, or ⟳ for another kind of sentence.' : 'Next: ⟳ for a kind of sentence.');
			other(more, s.alternative);
		};
		if (sentences.length === 0) {
			if (past) addMore();
			return el;
		}
		const shown = this.full ? sentences.map((text, i) => ({ text, i })) : [{ text: sentences[current]!, i: current }];
		const list = el.createEl('ol', { cls: 'aglc-guide-sentences' });
		for (const { text, i } of shown) {
			const isCurrent = i === current && !past;
			const alt = isCurrent ? s.alternative : null;
			const item = list.createEl('li', { cls: [isCurrent ? 'is-current' : '', alt ? 'is-alternative' : ''].filter(Boolean).join(' ') });
			item.setAttribute('value', String(i + 1));
			const line = item.createSpan({ cls: 'aglc-guide-sentence' });
			role(line, alt ? alt.text : text);
			if (isCurrent) other(item, alt);
			else act(line, { type: 'sentence-at', index: i }, 'Write this sentence next');
		}
		if (past) addMore();
		return el;
	}

	ignoreEvent(): boolean { return true; }
}

export function guideExtension(host: AglcHost): Extension {
	const compute = (state: EditorState, previous: Choice | null, tr: Transaction | null): GuideState => {
		const path = state.field(editorInfoField, false)?.file?.path ?? null;
		if (!host.forPath(path).enabled) return NONE;
		const set = host.promptSet(path);
		if (!set) return NONE;
		const guide = guideAt(state.doc.toString(), state.selection.main.head, set);
		if (!guide) return NONE;
		// Choices made for this paragraph last while the cursor stays in it.
		let choice = previous && previous.from === guide.from ? previous : null;
		for (const e of tr?.effects ?? []) if (e.is(guideAction)) choice = apply(choice, guide, set.alternatives, e.value);
		const index = choice?.guide ?? guide.index;
		const prompt = guide.options[index] ?? guide.prompt;
		const current = Math.max(0, guide.sentence + (choice?.shift ?? 0));
		const alt = choice?.alternative && choice.alternative.at === current ? choice.alternative : null;
		const shown: Shown = {
			prompt,
			options: guide.options.length,
			index,
			current,
			alternative: alt ? { text: set.alternatives[alt.index]!, index: alt.index, count: set.alternatives.length } : null,
		};
		const widget = new GuideWidget(shown, host.settings.promptDetail !== 'current');
		return { decorations: Decoration.set([Decoration.widget({ widget, block: true, side: -1 }).range(guide.from)]), choice, shown };
	};
	return guideField(compute);
}

let field: StateField<GuideState> | null = null;

function guideField(compute: (state: EditorState, previous: Choice | null, tr: Transaction | null) => GuideState): StateField<GuideState> {
	field = StateField.define<GuideState>({
		create: (state) => compute(state, null, null),
		update(value, tr) {
			const acted = tr.effects.some((e) => e.is(guideAction));
			if (!tr.docChanged && !tr.selection && !acted && !tr.effects.some((e) => e.is(refreshEffect))) return value;
			const previous = value.choice && { ...value.choice, from: tr.changes.mapPos(value.choice.from, -1) };
			return compute(tr.state, previous, tr);
		},
		provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
	});
	return field;
}

/** What the guide in `state` shows, or null. */
export function shownGuide(state: EditorState): Shown | null {
	return field === null ? null : (state.field(field, false)?.shown ?? null);
}

/** True when the editor shows a paragraph guide (for the guide commands). */
export function guideShown(view: EditorView): boolean {
	return shownGuide(view.state) !== null;
}

/** Change the guide in `view`; false when it shows none. */
export function changeGuide(view: EditorView, action: GuideAction): boolean {
	if (!guideShown(view)) return false;
	view.dispatch({ effects: guideAction.of(action) });
	return true;
}
