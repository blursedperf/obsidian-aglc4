/**
 * Placeholders of an inserted citation template, such as "*Title*" or "Year": marked faintly until filled
 * in, with Tab (and Shift+Tab) moving between them, as in a code editor. Typing replaces the selected
 * placeholder. Tab on the last one moves to the end of the citation; Escape, or moving the cursor away,
 * stops. Tab behaves normally whenever no placeholders are pending.
 */
import { EditorSelection, type Extension, Prec, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap } from '@codemirror/view';

interface Placeholder { from: number; to: number }

interface Snippet {
	/** The placeholders, in order; each keeps track of what is typed over it. */
	fields: Placeholder[];
	/** The one being filled in. */
	active: number;
	/** The end of the inserted text. */
	end: number;
}

const start = StateEffect.define<Snippet>();
const stop = StateEffect.define<null>();
const move = StateEffect.define<number>();

/** The inserted text, with its placeholders marked `${…}`: the text, and each placeholder's place in it. */
export function expandPlaceholders(template: string): { text: string; fields: Placeholder[] } {
	let text = '';
	const fields: Placeholder[] = [];
	const re = /\$\{([^}]*)\}/g;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(template))) {
		text += template.slice(last, m.index);
		fields.push({ from: text.length, to: text.length + m[1]!.length });
		text += m[1];
		last = m.index + m[0].length;
	}
	return { text: text + template.slice(last), fields };
}

const field = StateField.define<Snippet | null>({
	create: () => null,
	update(value, tr) {
		for (const e of tr.effects) {
			if (e.is(start)) return e.value;
			if (e.is(stop)) return null;
		}
		if (!value) return null;
		// Typing over a placeholder grows it to cover what was typed.
		const mapped: Snippet = {
			fields: value.fields.map((f) => ({ from: tr.changes.mapPos(f.from, -1), to: tr.changes.mapPos(f.to, 1) })),
			active: value.active,
			end: tr.changes.mapPos(value.end, 1),
		};
		for (const e of tr.effects) if (e.is(move)) mapped.active = e.value;
		// Moving the cursor out of the citation ends it.
		const head = tr.state.selection.main.head;
		const first = mapped.fields[0]?.from ?? mapped.end;
		if (tr.selection && (head < first || head > mapped.end)) return null;
		return mapped;
	},
	provide: (f) => EditorView.decorations.from(f, (s): DecorationSet => {
		if (!s) return Decoration.none;
		const mark = Decoration.mark({ class: 'aglc-placeholder' });
		return Decoration.set(s.fields.filter((p, i) => i >= s.active && p.to > p.from).map((p) => mark.range(p.from, p.to)), true);
	}),
});

/** Select the next (or previous) placeholder; past the last, go to the end. False when none is pending. */
export function movePlaceholder(view: EditorView, step: number): boolean {
	const s = view.state.field(field, false);
	if (!s) return false;
	const next = s.active + step;
	if (next < 0) return true;
	if (next >= s.fields.length) {
		view.dispatch({ selection: EditorSelection.cursor(s.end), effects: stop.of(null) });
		return true;
	}
	const p = s.fields[next]!;
	view.dispatch({ selection: EditorSelection.range(p.from, p.to), effects: move.of(next), scrollIntoView: true });
	return true;
}

/** The editor extension: the placeholders' state and marks, and Tab, Shift+Tab and Escape. */
export const placeholderExtension: Extension = [
	field,
	Prec.highest(keymap.of([
		{ key: 'Tab', run: (v) => movePlaceholder(v, 1) },
		{ key: 'Shift-Tab', run: (v) => movePlaceholder(v, -1) },
		{
			key: 'Escape',
			run: (v) => {
				if (!v.state.field(field, false)) return false;
				v.dispatch({ effects: stop.of(null) });
				return true;
			},
		},
	])),
];

/**
 * Insert `template` over [from, to) in `view`, with its first placeholder selected and the rest ready for
 * Tab. Without placeholders, the cursor goes to the end.
 */
export function insertTemplate(view: EditorView, from: number, to: number, template: string): void {
	const { text, fields } = expandPlaceholders(template);
	const at = (n: number) => from + n;
	const placed = fields.map((f) => ({ from: at(f.from), to: at(f.to) }));
	const end = at(text.length);
	if (placed.length === 0) {
		view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(end), scrollIntoView: true });
		return;
	}
	view.dispatch({
		changes: { from, to, insert: text },
		selection: EditorSelection.range(placed[0]!.from, placed[0]!.to),
		effects: start.of({ fields: placed, active: 0, end }),
		scrollIntoView: true,
	});
}

/** True while an inserted citation has placeholders to fill in (for tests). */
export function placeholdersPending(state: EditorView['state']): boolean {
	return state.field(field, false) !== null && state.field(field, false) !== undefined;
}
