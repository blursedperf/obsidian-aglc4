/**
 * Whole-note AGLC4 analysis: every footnote's citations and style, plus the rules that span footnotes
 * (placement of footnote numbers, "Ibid", "(n X)" cross-references and repeated full citations).
 */
import { type Note, type FootnoteScan, scanFootnotes } from '../footnotes';
import { type CitationAnalysis, type FootnoteAnalysis, analyseFootnote } from './citation';
import { lintFootnote } from './lint';
import { type Issue, shiftIssue } from './types';

export interface AnalyseOptions {
	disabled?: ReadonlySet<string>;
	showInfo?: boolean;
	/** Cursor offset: the footnote being typed at the cursor is not yet expected to be finished. */
	cursor?: number;
}

export interface NoteAnalysis {
	note: Note;
	analysis: FootnoteAnalysis | null;
}

export interface DocumentAnalysis {
	scan: FootnoteScan;
	notes: NoteAnalysis[];
	/** Issues with absolute document offsets, sorted by position. */
	issues: Issue[];
}

const PUNCT_AFTER = /^[.,;:!?]/;
const FULL_KINDS = new Set(['case-mnc', 'case-reported', 'case-unreported', 'journal', 'chapter', 'book', 'newspaper', 'internet', 'treaty']);

function stripMarks(s: string): string {
	return s.replace(/[*_'‘’"“”]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function elementText(c: CitationAnalysis, id: string): string | null {
	const m = c.best?.elements.find((e) => e.id === id);
	return m ? m.text.replace(/^[,\s]+/, '') : null;
}

function pinpointTexts(c: CitationAnalysis): string[] {
	return c.best?.elements.filter((e) => e.id === 'pinpoint' || e.id === 'pinpoint-more').map((e) => e.text.replace(/^[,\s]+/, '')) ?? [];
}

/** Identity of the source a full citation refers to, used to spot repeated full citations. */
function sourceKey(c: CitationAnalysis): string | null {
	if (!c.kind || !FULL_KINDS.has(c.kind)) return null;
	if (c.kind.startsWith('case')) {
		const name = elementText(c, 'name');
		return name ? `case:${stripMarks(name)}` : null;
	}
	if (c.kind === 'treaty') {
		const t = elementText(c, 'title');
		return t ? `treaty:${stripMarks(t)}` : null;
	}
	const title = elementText(c, 'title');
	return title ? `src:${stripMarks(elementText(c, 'author') ?? '')}|${stripMarks(title)}` : null;
}

/** The short reference AGLC4 r 1.4.1 asks for when a source is cited again. */
function shortReference(c: CitationAnalysis, footnote: number): string | null {
	const pins = pinpointTexts(c);
	const pin = pins.length > 0 ? ` ${pins.join(', ')}` : '';
	const short = elementText(c, 'short');
	if (c.kind?.startsWith('case') || c.kind === 'treaty') {
		const title = short ? short.replace(/^\(|\)$/g, '').replace(/['‘’]/g, '') : elementText(c, c.kind === 'treaty' ? 'title' : 'name');
		if (!title) return null;
		const t = title.replace(/^[*_]|[*_]$/g, '');
		return `*${t}* (n ${footnote})${pin}`;
	}
	const author = elementText(c, 'author');
	if (!author) return short ? `${short.replace(/^\(|\)$/g, '')} (n ${footnote})${pin}` : null;
	const first = author.split(/,\s|\sand\s/)[0]!.trim();
	const surname = first.split(/\s+/).pop()!;
	const multi = /,\s|\sand\s/.test(author);
	const etAl = /\bet al\b/.test(author);
	return `${surname}${etAl ? ' et al' : multi ? ` and ${author.split(/\sand\s/).pop()!.trim().split(/\s+/).pop()!}` : ''} (n ${footnote})${pin}`;
}

export function analyseDocument(text: string, opts: AnalyseOptions = {}): DocumentAnalysis {
	const disabled = opts.disabled ?? new Set<string>();
	const scan = scanFootnotes(text);
	const issues: Issue[] = [];
	const push = (i: Issue) => { if (!disabled.has(i.rule) && (opts.showInfo !== false || i.severity !== 'info')) issues.push(i); };

	const notes: NoteAnalysis[] = scan.notes.map((note) => {
		if (note.contentFrom < 0) return { note, analysis: null };
		const end = note.contentFrom + note.content.replace(/\s+$/, '').length;
		const inProgress = opts.cursor !== undefined && opts.cursor >= note.contentFrom && opts.cursor <= end;
		const analysis = analyseFootnote(note.content, { showInfo: opts.showInfo !== false, inProgress });
		for (const i of analysis.issues) push(shiftIssue(i, note.contentFrom));
		for (const i of lintFootnote(note.content, disabled)) push(shiftIssue(i, note.contentFrom));
		return { note, analysis };
	});

	// Footnote markers.
	const markers: { from: number; to: number }[] = [
		...scan.refs.map((r) => ({ from: r.from, to: r.to })),
		...scan.inlines.map((i) => ({ from: i.from, to: i.to })),
	];
	for (const mk of markers) {
		const after = text.slice(mk.to, mk.to + 1);
		if (PUNCT_AFTER.test(after)) {
			push({
				rule: 'ref-after-punct', severity: 'error', from: mk.from, to: mk.to + 1,
				message: 'Footnote numbers go after punctuation.', ref: 'r 1.1.2',
				fix: { from: mk.from, to: mk.to + 1, insert: after + text.slice(mk.from, mk.to), label: 'Move after punctuation' },
			});
		}
		let ws = mk.from;
		while (ws > 0 && (text[ws - 1] === ' ' || text[ws - 1] === '\t')) ws--;
		if (ws < mk.from && ws > 0 && text[ws - 1] !== '\n') {
			push({
				rule: 'ref-space', severity: 'warning', from: ws, to: mk.to,
				message: 'No space before a footnote number.', ref: 'r 1.1.2',
				fix: { from: ws, to: mk.from, insert: '' },
			});
		}
	}

	for (const na of notes) {
		const n = na.note;
		if (n.label !== null && !n.def) {
			const r = n.refs[0]!;
			push({ rule: 'ref-undefined', severity: 'error', from: r.from, to: r.to, message: `Footnote [^${n.label}] has no text.` });
		}
		for (const r of n.refs.slice(1)) {
			push({
				rule: 'ref-reused', severity: 'warning', from: r.from, to: r.to,
				message: `Footnote ${n.number} is referenced more than once. Each reference needs its own footnote; cite again with "Ibid" or "(n ${n.number})".`,
				ref: 'r 1.4',
			});
		}
	}
	for (const d of scan.defs) {
		if (!scan.notes.some((n) => n.def === d)) {
			push({ rule: 'def-unused', severity: 'warning', from: d.from, to: d.contentFrom, message: `Footnote [^${d.label}] is never referenced in the text.` });
		}
	}

	// Rules spanning footnotes.
	const firstCited = new Map<string, number>();
	notes.forEach((na, idx) => {
		const a = na.analysis;
		if (!a) return;
		const base = na.note.contentFrom;
		const prev = idx > 0 ? notes[idx - 1]!.analysis : null;
		const prevSingle = !!prev && prev.segments.filter((s) => s.segment.body.length > 0).length === 1;

		a.segments.forEach((c, segIdx) => {
			const from = base + c.segment.bodyFrom;
			const to = base + c.segment.to;
			if (c.kind === 'ibid') {
				if (idx === 0) {
					push({ rule: 'ibid-first', severity: 'error', from, to, message: '"Ibid" refers to the preceding footnote, but this is the first footnote.', ref: 'r 1.4.3' });
				} else if (segIdx > 0) {
					push({ rule: 'ibid-position', severity: 'error', from, to, message: '"Ibid" can only be used for the first source in a footnote.', ref: 'r 1.4.3' });
				} else if (prev && !prevSingle) {
					push({ rule: 'ibid-multiple', severity: 'error', from, to, message: '"Ibid" cannot be used when the preceding footnote cites more than one source. Use a short reference with "(n X)".', ref: 'r 1.4.3' });
				}
			}

			if (c.kind === 'subsequent') {
				const nEl = c.best?.elements.find((e) => e.id === 'n');
				const target = nEl ? Number(/\d+/.exec(nEl.text)![0]) : NaN;
				const nFrom = nEl ? base + c.segment.bodyFrom + nEl.from + 1 : from;
				const nTo = nEl ? base + c.segment.bodyFrom + nEl.to : to;
				if (!Number.isNaN(target)) {
					if (target > notes.length) {
						push({ rule: 'n-missing', severity: 'error', from: nFrom, to: nTo, message: `There is no footnote ${target}.`, ref: 'r 1.4.1' });
					} else if (target >= na.note.number) {
						push({ rule: 'n-forward', severity: 'error', from: nFrom, to: nTo, message: `"(n ${target})" must refer to an earlier footnote.`, ref: 'r 1.4.1' });
					} else {
						const targetContent = notes[target - 1]!.note.content;
						const short = elementText(c, 'short');
						const words = short ? stripMarks(short).split(' ').filter((w) => w.length > 2) : [];
						if (words.length > 0 && !words.some((w) => stripMarks(targetContent).includes(w))) {
							push({ rule: 'n-mismatch', severity: 'warning', from: nFrom, to: nTo, message: `Footnote ${target} does not seem to cite "${short!.replace(/[*_]/g, '')}".`, ref: 'r 1.4.1' });
						}
						if (target === na.note.number - 1 && prevSingle && segIdx === 0) {
							const pins = pinpointTexts(c);
							const pin = pins.length > 0 ? ` ${pins.join(', ')}` : '';
							push({
								rule: 'use-ibid', severity: 'warning', from, to,
								message: 'The source is the only one in the preceding footnote: use "Ibid".', ref: 'r 1.4.3',
								fix: { from, to, insert: `${c.segment.signal ? 'ibid' : 'Ibid'}${pin}`, label: 'Replace with Ibid' },
							});
						}
					}
				}
			}

			const key = sourceKey(c);
			if (key) {
				const earlier = firstCited.get(key);
				if (earlier === undefined) {
					firstCited.set(key, na.note.number);
				} else if (earlier === na.note.number - 1 && prevSingle && segIdx === 0) {
					const pin = pinpointTexts(c).join(', ');
					push({
						rule: 'use-ibid', severity: 'warning', from, to,
						message: 'Same source as the preceding footnote: use "Ibid".', ref: 'r 1.4.3',
						fix: { from, to, insert: `${c.segment.signal ? 'ibid' : 'Ibid'}${pin ? ` ${pin}` : ''}`, label: 'Replace with Ibid' },
					});
				} else if (earlier !== na.note.number) {
					const short = shortReference(c, earlier);
					push({
						rule: 'repeat-citation', severity: 'warning', from, to,
						message: `Already cited in full in footnote ${earlier}: use a short reference${short ? ` such as "${short.replace(/[*_]/g, '')}"` : ' with "(n X)"'}.`, ref: 'r 1.4.1',
						fix: short ? { from, to, insert: short, label: 'Use short reference' } : undefined,
					});
				}
			}
		});
	});

	const seen = new Set<string>();
	const unique = issues.filter((i) => {
		const k = i.fix ? `${i.from}|${i.to}|${i.fix.from}|${i.fix.to}|${i.fix.insert}` : `${i.rule}|${i.from}|${i.to}`;
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
	unique.sort((a, b) => a.from - b.from || a.to - b.to);
	return { scan, notes, issues: unique };
}

/** Apply fixes, last first, skipping any that overlap a fix already applied. */
export function applyFixes(text: string, issues: Issue[]): { text: string; applied: number } {
	const fixes = issues.filter((i) => i.fix).map((i) => i.fix!).sort((a, b) => b.from - a.from || b.to - a.to);
	let out = text;
	let lastFrom = Infinity;
	let applied = 0;
	for (const f of fixes) {
		if (f.to > lastFrom) continue;
		out = out.slice(0, f.from) + f.insert + out.slice(f.to);
		lastFrom = f.from;
		applied++;
	}
	return { text: out, applied };
}
