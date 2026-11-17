/**
 * The AGLC4 citation grammar: for every kind of source, the ordered elements of a full citation.
 *
 * Each element is a sticky regular expression that consumes the element *and the separator before it*,
 * so a citation can be matched left to right. Matching tells us how far a citation is complete, which
 * element is expected next, and where a finished citation stops conforming. Element checks then look at
 * what was matched for formatting errors (missing italics, wrong brackets, and so on).
 */
import { JURISDICTIONS, JURISDICTION_FIXES, LEG_PINPOINTS, MNC_COURTS, MONTHS, VOLUME_SERIES, YEAR_SERIES, escapeRe } from './data';
import type { Issue } from './types';

export type SourceKind =
	| 'legislation'
	| 'legislation-short'
	| 'case-mnc'
	| 'case-reported'
	| 'case-unreported'
	| 'hansard'
	| 'treaty'
	| 'journal'
	| 'chapter'
	| 'book'
	| 'newspaper'
	| 'internet'
	| 'ibid'
	| 'subsequent';

export interface ElementMatch {
	id: string;
	from: number;
	to: number;
	text: string;
	groups: RegExpExecArray;
}

export interface CheckContext {
	/** The citation text being matched (signal removed). */
	text: string;
	/** Elements matched so far, by id (the last match for repeatable elements). */
	matched: Record<string, ElementMatch>;
	/** True when an introductory signal precedes the citation. */
	hasSignal: boolean;
}

export interface ElementSpec {
	id: string;
	label: string;
	/** Short description shown with suggestions. */
	hint: string;
	/** Text inserted when the element is suggested. `${...}` marks a placeholder that will be selected. */
	insert: string;
	re: RegExp;
	optional?: boolean;
	repeat?: boolean;
	/** Return true when a regex match should not count as this element (eg a court identifier as a series). */
	reject?: (m: RegExpExecArray, ctx: CheckContext) => boolean;
	/** Formatting checks on the matched element. Offsets are relative to the citation text. */
	check?: (m: ElementMatch, ctx: CheckContext) => Issue[];
}

export interface SourceSpec {
	kind: SourceKind;
	label: string;
	ref: string;
	/** Once this element has matched, the text is treated as this kind of citation and errors are reported. */
	claimAfter: string;
	/** Example of a full citation, shown when choosing a source type. */
	example: string;
	/** Text inserted to start this kind of citation. */
	start: string;
	elements: ElementSpec[];
}

// ---------------------------------------------------------------------------------------------------------
// Regex fragments

const S = (src: string): RegExp => new RegExp(src, 'y');

const MONTH = `(?:${MONTHS.join('|')})`;
const DATE = `\\d{1,2}\\s${MONTH}\\s\\d{4}`;
const ITALIC = '(?:\\*[^*\\n]+\\*|_[^_\\n]+_)';
const OPEN_Q = '[\'‘]';
const CLOSE_Q = '[\'’]';
const PIN_PAGE = '\\d+(?:[–-]\\d+)?(?:\\sn\\s\\d+)?';
const PIN_PARA = '\\[\\d+\\](?:[–-]\\[\\d+\\])?(?:\\sn\\s\\d+)?';
const PIN = `(?:${PIN_PARA}|${PIN_PAGE})`;
const BOOK_PIN = `(?:\\[[\\d.]+\\](?:[–-]\\[[\\d.]+\\])?(?:\\sn\\s\\d+)?|${PIN_PAGE})`;
const LEG_DESIGNATOR = `(?:${LEG_PINPOINTS.map(escapeRe).join('|')})`;
const LEG_UNIT = '(?:\\d+[A-Za-z]*|[IVXLC]+[A-Z]?|[A-Z]\\d*)(?:\\([0-9A-Za-z]+\\))*';
const LEG_NUM = `${LEG_UNIT}(?:[–-]${LEG_UNIT})?`;
const LEG_PIN = `${LEG_DESIGNATOR}\\s${LEG_NUM}(?:(?:,\\s|\\sand\\s|\\sor\\s)${LEG_NUM})*`;
const JUR = `(?:${JURISDICTIONS.map(escapeRe).join('|')})`;
const JUDGE_TITLES = '(?:CJ in Eq|CJ|ACJ|JJA|JJ|JA|AJA|AJ|DCJ|J|P|SM|DP|M|C)';
/** A personal or organisational name: capitalised words, with the particles names and bodies use. */
const NAME = '\\p{Lu}[\\p{L}\\p{N}.\'’&-]*(?:\\s(?:\\p{Lu}[\\p{L}\\p{N}.\'’&-]*|of|the|for|on|and|in|de|van|von|der|den|di|da|le|la|du|bin|binti|et al|&))*';
const AUTHORS = `${NAME}(?:,\\s${NAME})*`;
const SHORT_TITLE = `\\s\\((?:\\*${OPEN_Q}[^'’*\\n]+${CLOSE_Q}\\*|${OPEN_Q}\\*[^*\\n]+\\*${CLOSE_Q}|${OPEN_Q}[^'’\\n]+${CLOSE_Q})\\)`;

function isItalic(s: string): boolean {
	const t = s.trim();
	return (t.startsWith('*') && t.endsWith('*')) || (t.startsWith('_') && t.endsWith('_'));
}

function stripItalic(s: string): string {
	return s.trim().replace(/^[*_]|[*_]$/g, '');
}

function issue(m: ElementMatch, rule: string, severity: Issue['severity'], message: string, ref?: string, fix?: Issue['fix'], from?: number, to?: number): Issue {
	return { rule, severity, message, ref, fix, from: from ?? m.from, to: to ?? m.to };
}

/** Skip a leading separator (comma/space) so an underline covers only the element itself. */
function bodyStart(m: ElementMatch): number {
	const lead = /^[,\s]*/.exec(m.text)?.[0].length ?? 0;
	return m.from + lead;
}

// ---------------------------------------------------------------------------------------------------------
// Shared elements

const caseName: ElementSpec = {
	id: 'name',
	label: 'Case name',
	hint: 'Party v Party, in italics (AGLC4 r 2.1)',
	insert: '*${Party v Party}*',
	re: S(`(?:${ITALIC}|(?:Re\\s|[A-Z][^;*_\\n]*?\\sv\\s)[^;*_\\n]*?(?=\\s[[(]\\d{4}[\\])]))`),
	check: (m) => {
		const out: Issue[] = [];
		if (!isItalic(m.text)) {
			out.push(issue(m, 'case-italics', 'error', 'Case names are italicised.', 'r 2.1', { from: m.from, to: m.to, insert: `*${m.text.trim()}*`, label: 'Italicise case name' }));
		}
		const vs = /\s(vs\.?|v\.|versus)\s/.exec(m.text);
		if (vs) {
			const at = m.from + vs.index + 1;
			out.push(issue(m, 'case-v', 'error', 'Separate the parties with "v" (no full stop).', 'r 2.1', { from: at, to: at + vs[1]!.length, insert: 'v' }, at, at + vs[1]!.length));
		}
		return out;
	},
};

const pinpoints: ElementSpec = {
	id: 'pinpoint',
	label: 'Pinpoint',
	hint: 'Page (", 23") or paragraph (", [23]")',
	insert: ', ${pinpoint}',
	re: S(`,\\s${PIN}`),
	optional: true,
	repeat: true,
};

const judges: ElementSpec = {
	id: 'judges',
	label: 'Judicial officer',
	hint: 'Judge(s) the pinpoint refers to, eg (Brennan J)',
	insert: ' (${Name J})',
	re: S(`\\s\\([^()\\n]*?\\b${JUDGE_TITLES}\\)`),
	optional: true,
};

const shortTitle = (id = 'short'): ElementSpec => ({
	id,
	label: 'Short title',
	hint: 'Only if the source is cited again: (\'*Short*\') (AGLC4 r 1.4.1)',
	insert: ' (\'*${Short Title}*\')',
	re: S(SHORT_TITLE),
	optional: true,
});

const author = (optional = false): ElementSpec => ({
	id: 'author',
	label: 'Author',
	hint: 'Name as it appears on the source, eg Jane Smith and Ali Khan (AGLC4 r 4.1)',
	insert: '${Author Name}',
	re: new RegExp(`${AUTHORS}(?=,\\s*(?:['‘"“*_]|$)|$)`, 'yu'),
	optional,
	check: (m) => {
		const out: Issue[] = [];
		const amp = m.text.indexOf(' & ');
		if (amp >= 0) {
			const at = m.from + amp + 1;
			out.push(issue(m, 'author-and', 'warning', 'Join authors with "and", not "&".', 'r 4.1', { from: at, to: at + 1, insert: 'and' }, at, at + 1));
		}
		const etal = /\bet al\./.exec(m.text);
		if (etal) {
			const at = m.from + etal.index;
			out.push(issue(m, 'et-al', 'error', '"et al" takes no full stop.', 'r 4.1', { from: at, to: at + 7, insert: 'et al' }, at, at + 7));
		}
		return out;
	},
});

const quotedTitle = (id: string, label: string, follow: string, leadingOptional = false): ElementSpec => ({
	id,
	label,
	hint: 'Title in single quotation marks, capitalised (AGLC4 r 4.2)',
	insert: leadingOptional ? '\'${Title}\'' : ', \'${Title}\'',
	re: S(`${leadingOptional ? '(?:^|,\\s)' : ',\\s'}["“'‘].*?["”'’](?=${follow}|$)`),
	check: (m) => {
		const at = bodyStart(m);
		const body = m.text.slice(at - m.from);
		if (/^["“]/.test(body) || /["”]$/.test(body)) {
			const inner = body.slice(1, -1);
			return [issue(m, 'title-quotes', 'error', 'Titles of articles and chapters take single quotation marks.', 'r 1.5.1', { from: at, to: m.to, insert: `'${inner}'` }, at, m.to)];
		}
		return [];
	},
});

const italicTitle = (id: string, label: string, hint: string): ElementSpec => ({
	id,
	label,
	hint,
	insert: ', *${Title}*',
	re: S(`,\\s${ITALIC}`),
});

const yearBracket: ElementSpec = {
	id: 'year',
	label: 'Year',
	hint: '(Year) for volume-numbered series, [Year] for year-organised series (AGLC4 r 2.2.1)',
	insert: ' (${Year})',
	re: S('\\s(?:\\(\\d{4}\\)|\\[\\d{4}\\])'),
};

const pageStart: ElementSpec = {
	id: 'page',
	label: 'Starting page',
	hint: 'First page of the source',
	insert: ' ${1}',
	re: S('\\s\\d+'),
};

// ---------------------------------------------------------------------------------------------------------
// Source specifications, in priority order: when two kinds match equally well the earlier one wins.

const LEGISLATION: SourceSpec = {
	kind: 'legislation',
	label: 'Legislation',
	ref: 'ch 3',
	claimAfter: 'jurisdiction',
	example: '*Native Title Act 1993* (Cth) s 223',
	start: '*${Title Year}* (${Cth})',
	elements: [
		{
			id: 'title',
			label: 'Title and year',
			hint: 'Short title including the year, in italics (AGLC4 r 3.1.1)',
			insert: '*${Title Year}*',
			re: S(`(?:\\*[^*\\n]+?\\s\\d{4}\\*|_[^_\\n]+?\\s\\d{4}_|\\*[^*\\n]+\\*\\s\\d{4}|[A-Z][A-Za-z ,'’()&-]*?\\s\\d{4}(?=\\s?\\((?:${JUR}|[A-Z][A-Za-z.' ]*)\\)))`),
			check: (m) => {
				if (/^\*[^*]+\*\s\d{4}$/.test(m.text)) {
					const title = stripItalic(m.text.replace(/\s\d{4}$/, ''));
					const year = m.text.slice(-4);
					return [issue(m, 'leg-year-italics', 'error', 'The year is part of the title and is italicised.', 'r 3.1.2', { from: m.from, to: m.to, insert: `*${title} ${year}*` })];
				}
				if (!isItalic(m.text)) {
					return [issue(m, 'leg-italics', 'error', 'Titles of legislation are italicised.', 'r 3.1.1', { from: m.from, to: m.to, insert: `*${m.text.trim()}*` })];
				}
				return [];
			},
		},
		{
			id: 'jurisdiction',
			label: 'Jurisdiction',
			hint: 'Abbreviated, in round brackets: (Cth), (NSW), (Vic) … (AGLC4 r 3.1.3)',
			insert: ' (${Cth})',
			re: S('\\s?\\([A-Z][A-Za-z.\' ]*\\)'),
			check: (m) => {
				const out: Issue[] = [];
				const name = m.text.trim().slice(1, -1);
				if (!m.text.startsWith(' ')) {
					out.push(issue(m, 'leg-jurisdiction-space', 'warning', 'Put a space before the jurisdiction.', 'r 3.1.3', { from: m.from, to: m.from, insert: ' ' }));
				}
				const fixed = JURISDICTION_FIXES[name];
				if (fixed) {
					const at = bodyStart(m);
					out.push(issue(m, 'leg-jurisdiction', 'error', `Abbreviate the jurisdiction as "${fixed}".`, 'r 3.1.3', { from: at + 1, to: m.to - 1, insert: fixed }, at, m.to));
				} else if (!(JURISDICTIONS as readonly string[]).includes(name)) {
					out.push(issue(m, 'leg-jurisdiction-unknown', 'warning', `"${name}" is not a recognised AGLC4 jurisdiction abbreviation.`, 'r 3.1.3', undefined, bodyStart(m), m.to));
				}
				return out;
			},
		},
		{
			id: 'pinpoint',
			label: 'Pinpoint',
			hint: 'Section, part, schedule …: s 5, ss 5–7, pt 2, sch 1 (AGLC4 r 3.1.4)',
			insert: ' s ${1}',
			re: S(`\\s${LEG_PIN}`),
			optional: true,
		},
		{
			id: 'pinpoint-more',
			label: 'Further pinpoint',
			hint: 'Another designator, eg ", sch 2"',
			insert: ', ${s 1}',
			re: S(`,\\s${LEG_PIN}`),
			optional: true,
			repeat: true,
		},
		shortTitle(),
	],
};

const LEGISLATION_SHORT: SourceSpec = {
	kind: 'legislation-short',
	label: 'Legislation (short title)',
	ref: 'r 1.4.1',
	claimAfter: 'pinpoint',
	example: '*Native Title Act* s 223',
	start: '*${Short Title}* s ${1}',
	elements: [
		{
			id: 'title',
			label: 'Short title',
			hint: 'The short title defined when the Act was first cited',
			insert: '*${Short Title}*',
			re: S(ITALIC),
		},
		{
			id: 'pinpoint',
			label: 'Pinpoint',
			hint: 's 5, pt 2, sch 1',
			insert: ' s ${1}',
			re: S(`\\s${LEG_PIN}`),
		},
		{
			id: 'pinpoint-more',
			label: 'Further pinpoint',
			hint: 'Another designator, eg ", sch 2"',
			insert: ', ${s 1}',
			re: S(`,\\s${LEG_PIN}`),
			optional: true,
			repeat: true,
		},
	],
};

const CASE_MNC: SourceSpec = {
	kind: 'case-mnc',
	label: 'Case (medium neutral citation)',
	ref: 'r 2.3',
	claimAfter: 'court',
	example: '*Love v Commonwealth* [2020] HCA 3, [81]',
	start: '*${Party v Party}* [${Year}] ${HCA} ${1}',
	elements: [
		caseName,
		{
			...yearBracket,
			hint: 'Year of judgment in square brackets (AGLC4 r 2.3.1)',
			insert: ' [${Year}]',
			check: (m) => (m.text.includes('(')
				? [issue(m, 'mnc-brackets', 'error', 'The year of a medium neutral citation goes in square brackets.', 'r 2.3.1', { from: bodyStart(m), to: m.to, insert: `[${m.text.trim().slice(1, -1)}]` }, bodyStart(m), m.to)]
				: []),
		},
		{
			id: 'court',
			label: 'Court identifier',
			hint: 'eg HCA, FCAFC, NSWCA, VSCA, QCA (AGLC4 r 2.3.1)',
			insert: ' ${HCA}',
			re: S('\\s[A-Z][A-Za-z]*(?:\\s(?:Civ|Crim|Admin|Ch|Fam|QB|KB|Comm|Pat|TCC))?'),
			reject: (m) => !MNC_COURTS.has(m[0].trim()),
		},
		{
			id: 'number',
			label: 'Judgment number',
			hint: 'Number of the judgment',
			insert: ' ${1}',
			re: S('\\s\\d+'),
		},
		{
			...pinpoints,
			hint: 'Paragraph in square brackets, eg ", [23]"',
			insert: ', [${1}]',
			check: (m) => (/^,\s\d/.test(m.text)
				? [issue(m, 'mnc-pinpoint', 'warning', 'Pinpoints to a medium neutral citation are paragraph numbers in square brackets.', 'r 2.3.1', { from: m.from + 2, to: m.to, insert: `[${m.text.slice(2)}]` }, m.from + 2, m.to)]
				: []),
		},
		judges,
		shortTitle(),
	],
};

const CASE_REPORTED: SourceSpec = {
	kind: 'case-reported',
	label: 'Case (reported)',
	ref: 'r 2.2',
	claimAfter: 'year',
	example: '*Mabo v Queensland (No 2)* (1992) 175 CLR 1, 30',
	start: '*${Party v Party}* (${Year}) ${Volume} ${CLR} ${1}',
	elements: [
		caseName,
		yearBracket,
		{
			id: 'volume',
			label: 'Volume',
			hint: 'Volume number (omit for year-organised series without volumes)',
			insert: ' ${Volume}',
			re: S('\\s\\d+(?=\\s[A-Z]|$)'),
			optional: true,
		},
		{
			id: 'series',
			label: 'Law report series',
			hint: 'Abbreviation of the report series, eg CLR, ALR, NSWLR, VR (AGLC4 r 2.2.2)',
			insert: ' ${CLR}',
			re: S('\\s[A-Z][A-Za-z\'’]*\\.?(?:\\s(?:\\([A-Z][A-Za-z]*\\)|[A-Z][A-Za-z\'’]*\\.?|\\d[a-z]{1,2}))*?(?=\\s\\d|$)'),
			reject: (m) => MNC_COURTS.has(m[0].trim()),
			check: (m, ctx) => {
				const out: Issue[] = [];
				const series = m.text.trim();
				const year = ctx.matched.year;
				if (year) {
					const round = year.text.includes('(');
					const y = year.text.trim().slice(1, -1);
					const yFrom = bodyStart(year);
					if (round && YEAR_SERIES.has(series)) {
						out.push(issue(m, 'year-brackets', 'error', `${series} is organised by year: put the year in square brackets.`, 'r 2.2.1', { from: yFrom, to: year.to, insert: `[${y}]` }, yFrom, year.to));
					} else if (!round && VOLUME_SERIES.has(series)) {
						out.push(issue(m, 'year-brackets', 'error', `${series} is organised by volume: put the year in round brackets.`, 'r 2.2.1', { from: yFrom, to: year.to, insert: `(${y})` }, yFrom, year.to));
					}
					if (round && !ctx.matched.volume) {
						out.push(issue(m, 'volume-missing', 'error', 'A year in round brackets must be followed by a volume number.', 'r 2.2.1', undefined, yFrom, m.to));
					}
				}
				if (/\./.test(series)) {
					out.push(issue(m, 'series-full-stops', 'warning', 'Report series abbreviations take no full stops.', 'Part I', { from: bodyStart(m), to: m.to, insert: series.replace(/\./g, '') }, bodyStart(m), m.to));
				}
				return out;
			},
		},
		pageStart,
		pinpoints,
		judges,
		shortTitle(),
	],
};

const CASE_UNREPORTED: SourceSpec = {
	kind: 'case-unreported',
	label: 'Case (unreported, no medium neutral citation)',
	ref: 'r 2.3',
	claimAfter: 'court',
	example: '*R v Smith* (Supreme Court of Victoria, Smith J, 12 March 1990)',
	start: '*${Party v Party}* (${Court}, ${Judge J}, ${1 January 2000})',
	elements: [
		caseName,
		{
			id: 'court',
			label: 'Court',
			hint: 'Full name of the court, eg (Supreme Court of Victoria',
			insert: ' (${Court}',
			re: S('\\s\\((?!\\d)[A-Z][^,()\\n]*(?=,)'),
		},
		{
			id: 'judge',
			label: 'Judicial officer',
			hint: 'eg Smith J',
			insert: ', ${Name J}',
			re: S(`,\\s[^,()\\n]*?\\b${JUDGE_TITLES}(?=,)`),
		},
		{
			id: 'date',
			label: 'Date of judgment',
			hint: 'Day Month Year',
			insert: ', ${1 January 2000}',
			re: S(`,\\s${DATE}`),
		},
		{
			id: 'close',
			label: 'Closing bracket',
			hint: ')',
			insert: ')',
			re: S('\\)'),
		},
		{ ...pinpoints, re: S(`\\s${PIN}`), insert: ' ${pinpoint}', hint: 'Page or [paragraph] after a space' },
	],
};

const HANSARD: SourceSpec = {
	kind: 'hansard',
	label: 'Parliamentary debates (Hansard)',
	ref: 'ch 7',
	claimAfter: 'title',
	example: 'Commonwealth, *Parliamentary Debates*, House of Representatives, 4 June 2020, 4250 (Scott Morrison)',
	start: '${Commonwealth}, *Parliamentary Debates*, ${Senate}, ${1 January 2000}, ${1}',
	elements: [
		{
			id: 'jurisdiction',
			label: 'Jurisdiction',
			hint: 'Commonwealth, New South Wales, Victoria …',
			insert: '${Commonwealth}',
			re: S('(?:Commonwealth|New South Wales|Victoria|Queensland|Western Australia|South Australia|Tasmania|Australian Capital Territory|Northern Territory)(?=,)'),
		},
		{
			id: 'title',
			label: 'Parliamentary Debates',
			hint: '*Parliamentary Debates* in italics',
			insert: ', *Parliamentary Debates*',
			re: S(',\\s(?:\\*Parliamentary Debates\\*|_Parliamentary Debates_|Parliamentary Debates)'),
			check: (m) => (isItalic(m.text.slice(2))
				? []
				: [issue(m, 'hansard-italics', 'error', '"Parliamentary Debates" is italicised.', 'ch 7', { from: m.from + 2, to: m.to, insert: '*Parliamentary Debates*' }, m.from + 2, m.to)]),
		},
		{
			id: 'chamber',
			label: 'Chamber',
			hint: 'Senate, House of Representatives, Legislative Assembly …',
			insert: ', ${Senate}',
			re: S(',\\s(?:House of Representatives|Senate|Legislative Assembly|Legislative Council|House of Assembly)'),
		},
		{ id: 'date', label: 'Date', hint: 'Day Month Year', insert: ', ${1 January 2000}', re: S(`,\\s${DATE}`) },
		{ id: 'page', label: 'Page', hint: 'Page number of the Hansard', insert: ', ${1}', re: S(',\\s\\d+(?:[–-]\\d+)?') },
		{ id: 'speaker', label: 'Speaker', hint: 'Name of the speaker, and position if relevant', insert: ' (${Speaker Name})', re: S('\\s\\([^()\\n]+\\)'), optional: true },
	],
};

const TREATY: SourceSpec = {
	kind: 'treaty',
	label: 'Treaty',
	ref: 'ch 8',
	claimAfter: 'opened',
	example: '*Convention on the Rights of the Child*, opened for signature 20 November 1989, 1577 UNTS 3 (entered into force 2 September 1990) art 3',
	start: '*${Treaty Title}*, opened for signature ${1 January 2000}, ${1} UNTS ${1} (entered into force ${1 January 2000})',
	elements: [
		{ id: 'title', label: 'Treaty title', hint: 'Title in italics', insert: '*${Treaty Title}*', re: S(ITALIC) },
		{
			id: 'opened',
			label: 'Opened for signature',
			hint: 'opened for signature / signed Day Month Year',
			insert: ', opened for signature ${1 January 2000}',
			re: S(`,\\s(?:opened for signature|signed|adopted|concluded|done)\\s${DATE}`),
		},
		{
			id: 'series',
			label: 'Treaty series',
			hint: 'Volume, series and page, eg 1577 UNTS 3 or [1991] ATS 4',
			insert: ', ${1} UNTS ${1}',
			re: S(',\\s(?:\\[\\d{4}\\]\\s|\\d+\\s)[A-Z][A-Za-z .]*?\\s\\d+'),
		},
		{
			id: 'force',
			label: 'Entry into force',
			hint: '(entered into force Day Month Year) or (not yet in force)',
			insert: ' (entered into force ${1 January 2000})',
			re: S(`\\s\\((?:entered into force\\s${DATE}|not yet in force)[^()\\n]*\\)`),
		},
		{
			id: 'pinpoint',
			label: 'Pinpoint',
			hint: 'Article, eg art 3',
			insert: ' art ${1}',
			re: S('\\s(?:arts?|ch|pt|annex|paras?|sch)\\s[\\w().–-]+(?:(?:,\\s|\\sand\\s)[\\w().–-]+)*'),
			optional: true,
		},
		shortTitle(),
	],
};

const JOURNAL: SourceSpec = {
	kind: 'journal',
	label: 'Journal article',
	ref: 'ch 5',
	claimAfter: 'year',
	example: 'Jane Smith, \'The Title of the Article\' (2004) 28(1) Melbourne University Law Review 1, 12',
	start: '${Author}, \'${Title}\' (${Year}) ${Volume}(${Issue}) ${Journal} ${1}',
	elements: [
		author(),
		quotedTitle('title', 'Article title', '\\s[[(]\\d'),
		{ ...yearBracket, hint: '(Year) if the journal has volume numbers, [Year] otherwise (AGLC4 ch 5)' },
		{
			id: 'volume',
			label: 'Volume (issue)',
			hint: 'Volume and issue, eg 28(1)',
			insert: ' ${Volume}(${Issue})',
			re: S('\\s\\d+(?:\\(\\d+(?:[–-]\\d+)?\\))?(?=\\s|$)'),
			optional: true,
		},
		{
			id: 'journal',
			label: 'Journal',
			hint: 'Full journal name, not italicised (AGLC4 ch 5)',
			insert: ' ${Journal Name}',
			re: S('\\s(?:\\*[^*\\n]+\\*|_[^_\\n]+_|[A-Z][A-Za-z&\'’ .:()-]*?)(?=\\s\\d|$)'),
			check: (m) => {
				const name = m.text.trim();
				if (isItalic(name)) {
					return [issue(m, 'journal-italics', 'error', 'Journal names are not italicised.', 'ch 5', { from: bodyStart(m), to: m.to, insert: stripItalic(name) }, bodyStart(m), m.to)];
				}
				return [];
			},
		},
		pageStart,
		pinpoints,
		shortTitle(),
	],
};

const CHAPTER: SourceSpec = {
	kind: 'chapter',
	label: 'Chapter in an edited book',
	ref: 'ch 6',
	claimAfter: 'editors',
	example: 'Jane Smith, \'Chapter Title\' in Ali Khan (ed), *Book Title* (Federation Press, 2nd ed, 2015) 10, 15',
	start: '${Author}, \'${Chapter Title}\' in ${Editor} (ed), *${Book Title}* (${Publisher}, ${Year}) ${1}',
	elements: [
		author(),
		quotedTitle('title', 'Chapter title', '\\sin\\s'),
		{
			id: 'editors',
			label: 'Editor(s)',
			hint: 'in Name (ed) / in Name and Name (eds)',
			insert: ' in ${Editor Name} (ed)',
			re: S('\\sin\\s[^,()\\n]+?\\s\\((?:[Ee]ds?\\.?)\\)'),
			check: (m) => {
				const br = /\(([Ee]ds?\.?)\)$/.exec(m.text);
				if (br && /[E.]/.test(br[1]!)) {
					const fixed = br[1]!.replace('.', '').toLowerCase();
					const at = m.to - br[1]!.length - 1;
					return [issue(m, 'editor-abbrev', 'error', `Write "(${fixed})": lower case, no full stop.`, 'ch 6', { from: at, to: m.to - 1, insert: fixed }, at, m.to - 1)];
				}
				return [];
			},
		},
		italicTitle('book', 'Book title', 'Title of the edited book, in italics'),
		{
			id: 'publication',
			label: 'Publication details',
			hint: '(Publisher, edition, Year)',
			insert: ' (${Publisher}, ${Year})',
			re: S('\\s\\((?:[^()\\n]|\\([^()\\n]*\\))*?\\d{4}\\)'),
			check: (m) => publicationChecks(m),
		},
		pageStart,
		pinpoints,
		shortTitle(),
	],
};

function publicationChecks(m: ElementMatch): Issue[] {
	const out: Issue[] = [];
	const ed = /\b(\d+(?:st|nd|rd|th))\s(edition|[Ee]dn?\.?|Ed\.?)(?=[,)])/.exec(m.text);
	if (ed && ed[2] !== 'ed') {
		const at = m.from + ed.index + ed[1]!.length + 1;
		out.push(issue(m, 'edition', 'error', 'Write the edition as "2nd ed".', 'ch 6', { from: at, to: at + ed[2]!.length, insert: 'ed' }, at, at + ed[2]!.length));
	}
	if (/[^,]\s\d{4}\)$/.test(m.text) && !/\(\d{4}\)$/.test(m.text.trim()) && !/\d{1,2}\s\w+\s\d{4}\)$/.test(m.text) && !/\b[A-Z][a-z]+\s\d{4}\)$/.test(m.text)) {
		out.push(issue(m, 'publication-comma', 'warning', 'Separate the publisher and year with a comma.', 'ch 6', undefined));
	}
	return out;
}

/** A URL in angle brackets, for material accessed online (AGLC4 ch 7). */
const urlElement = (optional: boolean): ElementSpec => ({
	id: 'url',
	label: 'URL',
	hint: 'In angle brackets: <https://…>',
	insert: ' <${https://}>',
	re: S('\\s(?:<[^>\\s]+>|https?:\\/\\/[^\\s;]+?)(?=[.;]?$|;|\\s\\()'),
	optional,
	check: (m) => (m.text.trim().startsWith('<')
		? []
		: [issue(m, 'url-brackets', 'error', 'URLs go in angle brackets.', 'ch 7', { from: bodyStart(m), to: m.to, insert: `<${m.text.trim()}>` }, bodyStart(m), m.to)]),
});

const BOOK: SourceSpec = {
	kind: 'book',
	label: 'Book or report',
	ref: 'ch 6 / ch 7',
	claimAfter: 'publication',
	example: 'Jane Smith, *Principles of Australian Law* (Federation Press, 3rd ed, 2018) 45',
	start: '${Author}, *${Title}* (${Publisher}, ${Year})',
	elements: [
		author(),
		italicTitle('title', 'Title', 'Title in italics (AGLC4 r 4.2)'),
		{
			id: 'publication',
			label: 'Publication details',
			hint: 'Book: (Publisher, edition, Year). Report: (Report No 1, Month Year)',
			insert: ' (${Publisher}, ${Year})',
			re: S('\\s\\((?:[^()\\n]|\\([^()\\n]*\\))*?\\d{4}\\)'),
			check: (m) => publicationChecks(m),
		},
		{
			...pinpoints,
			id: 'pinpoint',
			repeat: false,
			insert: ' ${pinpoint}',
			re: S(`\\s${BOOK_PIN}`),
			hint: 'Page (" 45") or paragraph (" [4.12]") after a space',
		},
		{ ...pinpoints, id: 'pinpoint-more', insert: ', ${pinpoint}', re: S(`,\\s${BOOK_PIN}`), label: 'Further pinpoint', hint: 'Another page or paragraph' },
		urlElement(true),
		shortTitle(),
	],
};

const NEWSPAPER: SourceSpec = {
	kind: 'newspaper',
	label: 'Newspaper article',
	ref: 'ch 7',
	claimAfter: 'paper',
	example: 'Jane Smith, \'Headline of Article\', *The Age* (Melbourne, 5 May 2020) 3',
	start: '${Author}, \'${Headline}\', *${Newspaper}* (${Place}, ${1 January 2000}) ${1}',
	elements: [
		author(true),
		quotedTitle('title', 'Headline', ',\\s', true),
		italicTitle('paper', 'Newspaper', 'Name of the newspaper, in italics'),
		{
			id: 'details',
			label: 'Place and date',
			hint: '(Place, Day Month Year), or (online, Day Month Year)',
			insert: ' (${Place}, ${1 January 2000})',
			re: S(`\\s\\((?:[^(),\\n]+,\\s)?${DATE}\\)`),
		},
		{ id: 'page', label: 'Page', hint: 'Page number (print editions)', insert: ' ${1}', re: S('\\s\\d+'), optional: true },
		{ ...urlElement(true), hint: 'For online articles: <https://…>' },
		shortTitle(),
	],
};

const INTERNET: SourceSpec = {
	kind: 'internet',
	label: 'Internet material',
	ref: 'ch 7',
	claimAfter: 'url',
	example: 'Jane Smith, \'Title of Page\' (Web Page, 1 May 2020) <https://example.org/page>',
	start: '${Author}, \'${Title}\' (${Web Page}, ${1 January 2000}) <${https://}>',
	elements: [
		author(true),
		quotedTitle('title', 'Title', '\\s\\(', true),
		{
			id: 'details',
			label: 'Document type and date',
			hint: '(Web Page, Day Month Year), (Blog Post, …), (Media Release, …)',
			insert: ' (${Web Page}, ${1 January 2000})',
			re: S('\\s\\([A-Z][^()\\n]*\\)'),
		},
		{
			id: 'pinpoint',
			label: 'Pinpoint',
			hint: 'Page or paragraph, if the material has them',
			insert: ' ${pinpoint}',
			re: S(`\\s${PIN}(?=\\s<)`),
			optional: true,
		},
		urlElement(false),
		shortTitle(),
	],
};

const IBID: SourceSpec = {
	kind: 'ibid',
	label: 'Ibid',
	ref: 'r 1.4.3',
	claimAfter: 'ibid',
	example: 'Ibid 45',
	start: 'Ibid',
	elements: [
		{
			id: 'ibid',
			label: 'Ibid',
			hint: '"Ibid" (capitalised unless it follows a signal)',
			insert: 'Ibid',
			re: S('[Ii]bid\\.?'),
			check: (m, ctx) => {
				const out: Issue[] = [];
				const word = m.text.slice(0, 4);
				if (ctx.hasSignal && word === 'Ibid') {
					out.push(issue(m, 'ibid-case', 'error', '"ibid" is lower case after an introductory signal.', 'r 1.4.3', { from: m.from, to: m.from + 4, insert: 'ibid' }));
				} else if (!ctx.hasSignal && word === 'ibid') {
					out.push(issue(m, 'ibid-case', 'error', '"Ibid" is capitalised at the start of a footnote.', 'r 1.4.3', { from: m.from, to: m.from + 4, insert: 'Ibid' }));
				}
				if (m.text.endsWith('.') && m.to < ctx.text.length) {
					out.push(issue(m, 'ibid-stop', 'error', '"Ibid" takes no full stop.', 'r 1.4.3', { from: m.to - 1, to: m.to, insert: '' }, m.to - 1, m.to));
				}
				return out;
			},
		},
		{
			id: 'pinpoint',
			label: 'Pinpoint',
			hint: 'New pinpoint after a space, eg "Ibid 45" or "Ibid [12]" or "Ibid s 5"',
			insert: ' ${pinpoint}',
			re: S(`,?\\s(?:${LEG_PIN}|${PIN})`),
			optional: true,
			check: (m) => (m.text.startsWith(',')
				? [issue(m, 'ibid-comma', 'error', 'No comma between "Ibid" and the pinpoint.', 'r 1.4.3', { from: m.from, to: m.from + 1, insert: '' }, m.from, m.from + 1)]
				: []),
		},
	],
};

const SUBSEQUENT: SourceSpec = {
	kind: 'subsequent',
	label: 'Subsequent reference',
	ref: 'r 1.4.1',
	claimAfter: 'n',
	example: '*Mabo* (n 3) 30',
	start: '${Short Title or Author Surname} (n ${1})',
	elements: [
		{
			id: 'short',
			label: 'Short title or author',
			hint: 'Case short title in italics, or author surname for secondary sources',
			insert: '${Short title}',
			re: new RegExp(`(?:\\*[^*\\n]+\\*|_[^_\\n]+_|${NAME})(?=\\s\\((?:n|fn|note|supra n)\\.?\\s|\\s?$)`, 'yu'),
		},
		{
			id: 'n',
			label: 'Footnote cross-reference',
			hint: '(n X), where X is the footnote with the full citation',
			insert: ' (n ${1})',
			re: S('\\s\\((?:n|fn|note|supra n)\\.?\\s\\d+\\)'),
			check: (m) => (/^\s\(n\s/.test(m.text)
				? []
				: [issue(m, 'n-format', 'error', 'Cross-references are written "(n X)".', 'r 1.4.1', { from: m.from + 1, to: m.to, insert: `(n ${/\d+/.exec(m.text)![0]})` }, m.from + 1, m.to)]),
		},
		{
			id: 'pinpoint',
			label: 'Pinpoint',
			hint: 'After a space, no comma: "(n 3) 30" or "(n 3) [12]"',
			insert: ' ${pinpoint}',
			re: S(`,?\\s(?:${LEG_PIN}|${PIN})(?:,\\s${PIN})*`),
			optional: true,
			check: (m) => (m.text.startsWith(',')
				? [issue(m, 'n-comma', 'error', 'No comma between "(n X)" and the pinpoint.', 'r 1.4.1', { from: m.from, to: m.from + 1, insert: '' }, m.from, m.from + 1)]
				: []),
		},
		judges,
	],
};

export const SPECS: SourceSpec[] = [
	IBID,
	HANSARD,
	LEGISLATION,
	CASE_MNC,
	CASE_REPORTED,
	CASE_UNREPORTED,
	TREATY,
	JOURNAL,
	CHAPTER,
	NEWSPAPER,
	INTERNET,
	BOOK,
	SUBSEQUENT,
	LEGISLATION_SHORT,
];

// ---------------------------------------------------------------------------------------------------------
// Matching

export interface MatchResult {
	spec: SourceSpec;
	elements: ElementMatch[];
	/** Characters consumed. */
	pos: number;
	/** Index into spec.elements of the first element that did not match (elements.length if all were tried). */
	next: number;
	/** True when every required element matched. */
	complete: boolean;
	/** True when the claimAfter element matched. */
	claimed: boolean;
	issues: Issue[];
}

export function matchSpec(spec: SourceSpec, text: string, hasSignal: boolean): MatchResult {
	const ctx: CheckContext = { text, matched: {}, hasSignal };
	const elements: ElementMatch[] = [];
	const issues: Issue[] = [];
	let pos = 0;
	let next = spec.elements.length;
	let complete = true;
	for (let i = 0; i < spec.elements.length; i++) {
		const el = spec.elements[i]!;
		let count = 0;
		for (;;) {
			if (pos >= text.length) break;
			el.re.lastIndex = pos;
			const m = el.re.exec(text);
			if (!m || m[0].length === 0 || (el.reject && el.reject(m, ctx))) break;
			const match: ElementMatch = { id: el.id, from: pos, to: pos + m[0].length, text: m[0], groups: m };
			elements.push(match);
			ctx.matched[el.id] = match;
			if (el.check) issues.push(...el.check(match, ctx));
			pos = match.to;
			count++;
			if (!el.repeat) break;
		}
		if (count === 0 && !el.optional) {
			next = i;
			complete = false;
			break;
		}
	}
	if (complete) {
		// Everything required matched; the first optional element still unmatched is "next".
		next = spec.elements.length;
		for (let i = spec.elements.length - 1; i >= 0; i--) {
			const el = spec.elements[i]!;
			if (ctx.matched[el.id] && !el.repeat) break;
			next = i;
		}
	}
	return { spec, elements, pos, next, complete, claimed: !!ctx.matched[spec.claimAfter], issues };
}
