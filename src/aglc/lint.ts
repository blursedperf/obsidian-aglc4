/**
 * Text-level AGLC4 style rules applied to the whole of a footnote, independent of citation type.
 */
import { MONTHS } from './data';
import type { Issue } from './types';

interface LintRule {
	rule: string;
	re: RegExp;
	severity: Issue['severity'];
	message: string | ((m: RegExpExecArray) => string);
	ref?: string;
	/** Replacement for the matched text (or the capture group named "target" when present). */
	fix?: (m: RegExpExecArray) => string;
}

const MONTH = `(?:${MONTHS.join('|')})`;
const SHORT_MONTHS: Record<string, string> = Object.fromEntries(MONTHS.map((m) => [m.slice(0, 3), m]));
SHORT_MONTHS.Sept = 'September';

function latinFix(s: string): string {
	return s.startsWith('et') ? 'et al' : s.replace(/\./g, '');
}

const RULES: LintRule[] = [
	{
		rule: 'double-quotes',
		re: /["“”]/g,
		severity: 'warning',
		message: 'Use single quotation marks; double quotation marks are only for quotes within quotes.',
		ref: 'r 1.5.1',
		fix: (m) => (m[0] === '“' ? '‘' : m[0] === '”' ? '’' : '\''),
	},
	{
		rule: 'en-dash',
		re: /(?:\d|\])(?<target>-|—)(?=\d|\[)/g,
		severity: 'warning',
		message: 'Spans of numbers take an en dash (–), not a hyphen.',
		ref: 'Part I',
		fix: () => '–',
	},
	{
		rule: 'page-abbrev',
		re: /\s(?<target>pp?\.?\s)(?=\d)/g,
		severity: 'error',
		message: 'Page pinpoints are not preceded by "p" or "pp".',
		ref: 'ch 2',
		fix: () => '',
	},
	{
		rule: 'at-pinpoint',
		re: /[\d\])*_'’](?<target>,?\sat\s)(?=\d|\[)/g,
		severity: 'error',
		message: 'AGLC4 pinpoints follow a comma; "at" is not used.',
		ref: 'ch 2',
		fix: () => ', ',
	},
	{
		rule: 'para-pinpoint',
		re: /\s(?<target>(?:paras?|¶)\.?\s(\d+)(?:[–-](\d+))?)/g,
		severity: 'warning',
		message: 'Pinpoint paragraphs of judgments as [23], not "para 23".',
		ref: 'ch 2',
		fix: (m) => (m[3] ? `[${m[2]}]–[${m[3]}]` : `[${m[2]}]`),
	},
	{
		rule: 'section-symbol',
		re: /§§?\s?/g,
		severity: 'error',
		message: 'Use "s" (or "ss"), not "§".',
		ref: 'r 3.1.4',
		fix: (m) => (m[0].startsWith('§§') ? 'ss ' : 's '),
	},
	{
		rule: 'section-word',
		// Not at the start of a sentence, where AGLC4 writes "Section" in full.
		re: /(?:[^.!?\s]\s|[(])(?<target>(?:[Ss]ections?|[Ss]ecs?\.?|s\.|ss\.)\s?)(?=\d)/g,
		severity: 'warning',
		message: 'Abbreviate sections as "s" (one) or "ss" (several), without a full stop.',
		ref: 'r 3.1.4',
		fix: (m) => (/s(?:ections|s\.)/.test(m.groups!.target!) ? 'ss ' : 's '),
	},
	{
		rule: 'abbrev-stops',
		re: /\b(?<target>(?:Pty|Ltd|Co|Inc|No|Nos|eg|ie|cf|vol|Vol|ch|pt|div|sch|reg|cl|art|ed|eds|edn|trans)\.)(?=[\s,;)])/g,
		severity: 'warning',
		message: (m) => `"${m.groups!.target!.slice(0, -1)}" takes no full stop (AGLC4 abbreviations are unpunctuated).`,
		ref: 'Part I',
		fix: (m) => m.groups!.target!.slice(0, -1),
	},
	{
		rule: 'latin-abbrev',
		re: /\b(?<target>e\.g\.|i\.e\.|viz\.|et\. al\.?)/g,
		severity: 'error',
		message: (m) => `Write "${latinFix(m.groups!.target!)}" without full stops.`,
		ref: 'Part I',
		fix: (m) => latinFix(m.groups!.target!),
	},
	{
		rule: 'not-aglc',
		re: /\b(?<target>supra|infra|op\.? cit\.?|loc\.? cit\.?|[Ii]d\.)(?=[\s,.]|$)/g,
		severity: 'error',
		message: (m) => `"${m.groups!.target!}" is not used in AGLC4. Use "Ibid" for the preceding footnote, or a short reference with "(n X)".`,
		ref: 'r 1.4',
	},
	{
		rule: 'date-ordinal',
		re: new RegExp(`\\b(?<target>(\\d{1,2})(?:st|nd|rd|th))(?=\\s(?:of\\s)?${MONTH})`, 'g'),
		severity: 'error',
		message: 'Dates are written "1 January 2020", without ordinals.',
		ref: 'Part I',
		fix: (m) => m[2]!,
	},
	{
		rule: 'date-order',
		re: new RegExp(`\\b(?<target>(${MONTH})\\s(\\d{1,2}),?\\s(\\d{4}))\\b`, 'g'),
		severity: 'error',
		message: 'Dates are written day month year: "1 January 2020".',
		ref: 'Part I',
		fix: (m) => `${m[3]} ${m[2]} ${m[4]}`,
	},
	{
		rule: 'month-abbrev',
		re: /\b\d{1,2}\s(?<target>(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?)(?=\s\d{4})/g,
		severity: 'error',
		message: 'Write months in full.',
		ref: 'Part I',
		fix: (m) => SHORT_MONTHS[m[2]!] ?? m[2]!,
	},
	{
		rule: 'bare-url',
		re: /(?:^|[^<(\w])(?<target>https?:\/\/[^\s<>]+?)(?=[.,;]?(?:\s|$))/g,
		severity: 'error',
		message: 'Put URLs in angle brackets: <https://…>.',
		ref: 'ch 7',
		fix: (m) => `<${m.groups!.target!}>`,
	},
	{
		rule: 'double-space',
		re: /\S(?<target> {2,})(?=\S)/g,
		severity: 'warning',
		message: 'Use a single space.',
		fix: () => ' ',
	},
	{
		rule: 'space-before-punct',
		// Not the spaces of a spaced ellipsis (". . .").
		re: /[^\s.](?<target> +)(?=[,;.](?:\s|$))(?![,;.]\s\.)/g,
		severity: 'warning',
		message: 'No space before punctuation.',
		fix: () => '',
	},
	{
		rule: 'jurisdiction-dots',
		re: /\((?<target>N\.S\.W\.|W\.A\.|S\.A\.|N\.T\.|A\.C\.T\.|Qld\.|Vic\.|Tas\.|C'th|Cwlth)\)/g,
		severity: 'error',
		message: 'Abbreviate jurisdictions without full stops: (NSW), (Cth), (Vic) ….',
		ref: 'r 3.1.3',
		fix: (m) => ({ 'C\'th': 'Cth', 'Cwlth': 'Cth' } as Record<string, string>)[m.groups!.target!] ?? m.groups!.target!.replace(/\./g, ''),
	},
];

/** Ranges of URLs in angle brackets, which the text rules leave alone. */
function protectedRanges(text: string): [number, number][] {
	const out: [number, number][] = [];
	const re = /<https?:\/\/[^>\s]*>?|`[^`]*`/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length]);
	return out;
}

/**
 * Ranges inside single-quoted titles and quotations ('…', ‘…’), where double quotation marks are correct
 * for a quotation within the quotation.
 */
function singleQuoted(text: string): [number, number][] {
	const out: [number, number][] = [];
	const re = /(^|[\s(])['‘](.+?)['’](?=[\s,.;:)?!]|$)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) out.push([m.index + m[1]!.length, m.index + m[0].length]);
	return out;
}

/** Apply the text-level rules to footnote text. Offsets are relative to `text`. */
export function lintFootnote(text: string, disabled: ReadonlySet<string> = new Set()): Issue[] {
	const out: Issue[] = [];
	const prot = protectedRanges(text);
	const quoted = singleQuoted(text);
	const trimmedLength = text.replace(/\s+$/, '').length;
	for (const r of RULES) {
		if (disabled.has(r.rule)) continue;
		r.re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = r.re.exec(text))) {
			if (m[0].length === 0) { r.re.lastIndex++; continue; }
			const target = m.groups?.target;
			const from = target !== undefined ? m.index + m[0].lastIndexOf(target) : m.index;
			const to = from + (target ?? m[0]).length;
			if (prot.some(([a, b]) => from >= a && from < b)) continue;
			if (r.rule === 'double-quotes' && quoted.some(([a, b]) => from > a && from < b - 1)) continue;
			// A full stop that closes the footnote is not an abbreviation stop.
			if (r.rule === 'abbrev-stops' && to >= trimmedLength) continue;
			out.push({
				rule: r.rule,
				severity: r.severity,
				from,
				to,
				message: typeof r.message === 'function' ? r.message(m) : r.message,
				ref: r.ref,
				fix: r.fix ? { from, to, insert: r.fix(m) } : undefined,
			});
		}
	}
	return out;
}
