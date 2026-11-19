import { type FootnoteScan, scanFootnotes } from '../footnotes';

export interface FootnoteContext {
	/** Absolute offset where the footnote text starts. */
	contentFrom: number;
	/** Absolute offset where it ends (exclusive). */
	contentTo: number;
	/** Footnote number in reading order, or null for a definition that is not referenced yet. */
	number: number | null;
	inline: boolean;
}

/** The footnote whose text contains `offset`, including an inline footnote still being typed. */
export function footnoteAt(text: string, offset: number, scan: FootnoteScan = scanFootnotes(text)): FootnoteContext | null {
	for (const d of scan.defs) {
		if (offset >= d.contentFrom && offset <= d.to) {
			const note = scan.notes.find((n) => n.def === d);
			return { contentFrom: d.contentFrom, contentTo: d.to, number: note?.number ?? null, inline: false };
		}
	}
	for (const i of scan.inlines) {
		if (offset >= i.contentFrom && offset < i.to) {
			const note = scan.notes.find((n) => n.inline === i);
			return { contentFrom: i.contentFrom, contentTo: i.to - 1, number: note?.number ?? null, inline: true };
		}
	}
	// An inline footnote whose closing bracket has not been typed yet.
	const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
	const line = text.slice(lineStart, offset);
	const open = line.lastIndexOf('^[');
	if (open >= 0) {
		let depth = 0;
		for (const ch of line.slice(open + 1)) {
			if (ch === '[') depth++;
			else if (ch === ']') depth--;
		}
		if (depth > 0) return { contentFrom: lineStart + open + 2, contentTo: offset, number: null, inline: true };
	}
	return null;
}

/** Split an insert template into text and the range of its first `${placeholder}`. */
export function expandSnippet(template: string): { text: string; selFrom: number; selTo: number } {
	let text = '';
	let selFrom = -1;
	let selTo = -1;
	const re = /\$\{([^}]*)\}/g;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(template))) {
		text += template.slice(last, m.index);
		if (selFrom < 0) {
			selFrom = text.length;
			selTo = text.length + m[1]!.length;
		}
		text += m[1];
		last = m.index + m[0].length;
	}
	text += template.slice(last);
	if (selFrom < 0) selFrom = selTo = text.length;
	return { text, selFrom, selTo };
}

/** The smallest single replacement that turns `a` into `b`. */
export function minimalChange(a: string, b: string): { from: number; to: number; insert: string } | null {
	if (a === b) return null;
	let start = 0;
	const max = Math.min(a.length, b.length);
	while (start < max && a.charCodeAt(start) === b.charCodeAt(start)) start++;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) { endA--; endB--; }
	return { from: start, to: endA, insert: b.slice(start, endB) };
}

/**
 * Where to go back to from the footnote definition at `offset`: just after its first reference in the
 * text. Null outside a footnote definition or when the footnote is not referenced.
 */
export function referenceFor(text: string, offset: number, scan: FootnoteScan = scanFootnotes(text)): number | null {
	const ctx = footnoteAt(text, offset, scan);
	if (!ctx || ctx.inline) return null;
	const note = scan.notes.find((n) => n.def !== null && n.def.contentFrom === ctx.contentFrom);
	return note?.refs[0]?.to ?? null;
}

/**
 * True when `offset` is at the end of a finished footnote definition: after its closing full stop (or
 * question or exclamation mark), with nothing but whitespace after it in the footnote.
 */
export function atFinishedFootnote(text: string, offset: number, scan: FootnoteScan = scanFootnotes(text)): boolean {
	const ctx = footnoteAt(text, offset, scan);
	if (!ctx || ctx.inline) return false;
	const before = text.slice(ctx.contentFrom, offset);
	const after = text.slice(offset, ctx.contentTo);
	return after.trim() === '' && /[.?!]$/.test(before.trimEnd()) && before.trim().length > 1;
}
