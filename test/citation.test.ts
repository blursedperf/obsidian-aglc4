import { describe, expect, it } from 'vitest';
import { analyseFootnote, suggestNext, nextRequired } from '../src/aglc/citation';

function kinds(text: string) {
	return analyseFootnote(text).segments.map((s) => s.kind);
}
function rules(text: string) {
	return analyseFootnote(text).issues.map((i) => i.rule);
}

describe('recognises correct AGLC4 citations without issues', () => {
	const good: [string, string][] = [
		['*Mabo v Queensland (No 2)* (1992) 175 CLR 1, 30 (Brennan J).', 'case-reported'],
		['*Donoghue v Stevenson* [1932] AC 562, 580.', 'case-reported'],
		['*Love v Commonwealth* [2020] HCA 3, [81].', 'case-mnc'],
		['*R v Smith* (Supreme Court of Victoria, Smith J, 12 March 1990).', 'case-unreported'],
		['*Native Title Act 1993* (Cth) s 223.', 'legislation'],
		['*Corporations Act 2001* (Cth) ss 180–4, sch 2.', 'legislation'],
		['Jane Smith, \'The Title of the Article\' (2004) 28(1) Melbourne University Law Review 1, 12.', 'journal'],
		['Jane Smith, \'Chapter Title\' in Ali Khan (ed), *Book Title* (Federation Press, 2nd ed, 2015) 10, 15.', 'chapter'],
		['Jane Smith, *Principles of Australian Law* (Federation Press, 3rd ed, 2018) 45.', 'book'],
		['Jane Smith, \'Headline of Article\', *The Age* (Melbourne, 5 May 2020) 3.', 'newspaper'],
		['Jane Smith, \'Title of Page\' (Web Page, 1 May 2020) <https://example.org/page>.', 'internet'],
		['*Convention on the Rights of the Child*, opened for signature 20 November 1989, 1577 UNTS 3 (entered into force 2 September 1990) art 3.', 'treaty'],
		['Commonwealth, *Parliamentary Debates*, House of Representatives, 4 June 2020, 4250 (Scott Morrison).', 'hansard'],
		['Ibid 45.', 'ibid'],
		['Ibid.', 'ibid'],
		['*Mabo* (n 3) 30.', 'subsequent'],
		['Smith (n 4) 23.', 'subsequent'],
	];
	for (const [text, kind] of good) {
		it(kind + ': ' + text.slice(0, 40), () => {
			const a = analyseFootnote(text);
			expect(a.segments[0]!.kind).toBe(kind);
			expect(a.issues).toEqual([]);
		});
	}

	it('allows a short title after a URL', () => {
		for (const t of [
			'Department of Health, *Review of the Act* (Issues Paper, 26 May 2026) <https://example.gov.au/review.pdf> (\u2018*Issues Paper*\u2019).',
			'Jane Smith, \'Title of Page\' (Web Page, 1 May 2020) <https://example.org/page> (\'*Title of Page*\').',
			'Jane Smith, \'Headline\', *The Age* (online, 5 May 2020) <https://theage.com.au/a> (\'*Headline*\').',
			'Law Council, *Annual Report* (Report, 2020) 12 <https://example.org/r.pdf>.',
		]) {
			expect([t, rules(t)]).toEqual([t, []]);
		}
		expect(rules('Department of Health, *Review of the Act* (Issues Paper, 26 May 2026) https://example.gov.au/review.pdf (\'*Issues Paper*\').')).toContain('url-brackets');
	});

	it('handles several sources with signals', () => {
		const t = 'See, eg, *Mabo v Queensland (No 2)* (1992) 175 CLR 1; *Native Title Act 1993* (Cth) s 223.';
		expect(kinds(t)).toEqual(['case-reported', 'legislation']);
		expect(rules(t)).toEqual([]);
	});

	it('leaves explanatory prose alone', () => {
		expect(rules('This point was not argued before the trial judge.')).toEqual([]);
		expect(kinds('This point was not argued before the trial judge.')).toEqual([null]);
	});
});

describe('flags incorrect and incomplete citations', () => {
	it('unitalicised case name', () => {
		const a = analyseFootnote('Mabo v Queensland (No 2) (1992) 175 CLR 1.');
		expect(a.issues.map((i) => i.rule)).toContain('case-italics');
		expect(a.issues.find((i) => i.rule === 'case-italics')!.fix!.insert).toBe('*Mabo v Queensland (No 2)*');
	});
	it('wrong year brackets for the series', () => {
		expect(rules('*Mabo v Queensland (No 2)* [1992] 175 CLR 1.')).toContain('year-brackets');
		expect(rules('*Donoghue v Stevenson* (1932) AC 562.')).toContain('year-brackets');
	});
	it('round brackets on a medium neutral citation', () => {
		expect(rules('*Love v Commonwealth* (2020) HCA 3.')).toContain('mnc-brackets');
	});
	it('missing starting page', () => {
		const a = analyseFootnote('*Mabo v Queensland (No 2)* (1992) 175 CLR.');
		expect(a.issues.map((i) => i.rule)).toContain('incomplete');
		expect(a.issues.find((i) => i.rule === 'incomplete')!.message).toMatch(/starting page/);
	});
	it('missing jurisdiction', () => {
		expect(rules('*Native Title Act 1993* s 223.')).not.toContain('incomplete');
	});
	it('jurisdiction spelled out', () => {
		const a = analyseFootnote('*Native Title Act 1993* (Commonwealth) s 223.');
		expect(a.issues.find((i) => i.rule === 'leg-jurisdiction')!.fix!.insert).toBe('Cth');
	});
	it('year outside italics', () => {
		expect(rules('*Native Title Act* 1993 (Cth).')).toContain('leg-year-italics');
	});
	it('italicised journal name', () => {
		expect(rules('Jane Smith, \'Title\' (2004) 28(1) *Melbourne University Law Review* 1.')).toContain('journal-italics');
	});
	it('missing closing full stop', () => {
		expect(rules('*Mabo v Queensland (No 2)* (1992) 175 CLR 1')).toContain('closing-stop');
	});
	it('comma between (n X) and pinpoint', () => {
		expect(rules('*Mabo* (n 3), 30.')).toContain('n-comma');
	});
	it('lower-case ibid at the start', () => {
		expect(rules('ibid 4.')).toContain('ibid-case');
	});
	it('bare URL', () => {
		expect(rules('Jane Smith, \'Title of Page\' (Web Page, 1 May 2020) https://example.org/page.')).toContain('url-brackets');
	});
	it('double-quoted article title', () => {
		expect(rules('Jane Smith, "The Title" (2004) 28 Melbourne University Law Review 1.')).toContain('title-quotes');
	});
});

describe('suggests the next element', () => {
	const next = (t: string) => nextRequired(t)?.label;
	it('case', () => {
		expect(next('*Mabo v Queensland (No 2)*')).toBe('Year');
		expect(next('*Mabo v Queensland (No 2)* (1992)')).toBe('Law report series');
		expect(next('*Mabo v Queensland (No 2)* (1992) 175')).toBe('Law report series');
		expect(next('*Mabo v Queensland (No 2)* (1992) 175 CLR')).toBe('Starting page');
		expect(next('*Love v Commonwealth* [2020] HCA')).toBe('Judgment number');
	});
	it('legislation', () => {
		expect(next('*Native Title Act 1993*')).toBe('Jurisdiction');
	});
	it('journal', () => {
		expect(next('Jane Smith')).toBe('Article title');
		expect(next('Jane Smith, \'The Title\'')).toBe('Year');
		expect(next('Jane Smith, \'The Title\' (2004) 28(1)')).toBe('Journal');
		expect(next('Jane Smith, \'The Title\' (2004) 28(1) Melbourne University Law Review')).toBe('Starting page');
	});
	it('book', () => {
		expect(next('Jane Smith, *Principles*')).toBe('Publication details');
	});
	it('offers optional elements and finishing once complete', () => {
		const labels = suggestNext('*Mabo v Queensland (No 2)* (1992) 175 CLR 1').map((s) => s.label);
		expect(labels).toContain('Pinpoint');
		expect(labels).toContain('End footnote');
	});
	it('offers source types at the start', () => {
		expect(suggestNext('').length).toBeGreaterThan(5);
		expect(suggestNext('See ').map((s) => s.insert)).toContain('ibid');
	});
});

describe('does not hint inside ordinary prose', () => {
	it('no next element for explanatory sentences', () => {
		expect(nextRequired('This point was not argued')).toBeNull();
		expect(nextRequired('The court declined to consider it, ')).toBeNull();
	});
});
