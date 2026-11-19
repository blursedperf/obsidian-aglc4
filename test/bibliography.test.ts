import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildBibliography, withBibliography, numberHeadings, tidyFootnotes, analyseDocument, DEFAULT_EXPORT, exportDocx, exportHtml } from '@legal-core/aglc';
import { scanFootnotes } from '@legal-core/md-pipeline';
import { paginate } from '@legal-core/docx-engine';

/** A note citing each footnote once, in order. */
function note(footnotes: string[], body = ''): string {
	return `${body}${footnotes.map((_, i) => `Text.[^${i + 1}]`).join(' ')}\n\n${footnotes.map((f, i) => `[^${i + 1}]: ${f}`).join('\n')}\n`;
}

// The sources of the example bibliography in AGLC4 r 1.13, cited out of order, with pinpoints, judges,
// signals, short titles, Ibid and subsequent references.
const FOOTNOTES = [
	'See Ian M Ramsay and Nicholas Lew, ‘Corporate Law Reform and Delisting in Australia’ (2007) 2(2) *Virginia Law & Business Review* 265, 270.',
	'*Lane v Morrison* (2009) 239 CLR 230, 236 [12] (French CJ and Gummow J) (‘*Lane*’).',
	'Michelle Foster, *International Refugee Law and Socio-Economic Rights: Refuge from Deprivation* (Cambridge University Press, 2007) 45.',
	'Ibid 46.',
	'James C Hathaway and Michelle Foster, *The Law of Refugee Status* (Cambridge University Press, 2nd ed, 2014).',
	'*Access to Medicinal Cannabis Act 2016* (Vic) s 5.',
	'James C Hathaway, *The Rights of Refugees under International Law* (Cambridge University Press, 2005) 12.',
	'Ian Ramsay and Cameron Sim, ‘The Role and Use of Debt Agreements in Australian Personal Insolvency Law’ (2011) 19(3) *Insolvency Law Journal* 168.',
	'*Australian Constitution* s 51(xxxi).',
	'Oona A Hathaway, Sabrina McElroy and Sara Aronchick Solow, ‘International Law at a Crossroads’ (2012) 7(1) *Yale Journal of International Affairs* 54.',
	'*Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment*, opened for signature 10 December 1984, 1465 UNTS 85 (entered into force 26 June 1987) art 1.',
	'James C Hathaway and Audrey Macklin, ‘Should We Presume State Protection?’ (2016) 32(3) *Refuge* 49, 50.',
	'New South Wales, *Parliamentary Debates*, Legislative Assembly, 15 December 1909, 4250 (Charles Wade).',
	'Ian M Ramsay, ‘Corporate Theory and Corporate Law Reform in Australia’ (1994) 1(2) *Agenda: A Journal of Policy Analysis and Reform* 179.',
	'Michelle Foster, ‘The Implications of the Failed “Malaysia Solution”: The Australian High Court and Refugee Responsibility Sharing at International Law’ (2012) 13(1) *Melbourne Journal of International Law* 395, 400.',
	'Foster (n 3) 50; *Lane* (n 2) 240 [20].',
];

describe('bibliography (AGLC4 r 1.13)', () => {
	it('reproduces the example bibliography in AGLC4 r 1.13', () => {
		expect(buildBibliography(note(FOOTNOTES))).toEqual([
			{ letter: 'A', title: 'Articles/Books/Reports', entries: [
				'Foster, Michelle, ‘The Implications of the Failed “Malaysia Solution”: The Australian High Court and Refugee Responsibility Sharing at International Law’ (2012) 13(1) *Melbourne Journal of International Law* 395',
				'Foster, Michelle, *International Refugee Law and Socio-Economic Rights: Refuge from Deprivation* (Cambridge University Press, 2007)',
				'Hathaway, James C, *The Rights of Refugees under International Law* (Cambridge University Press, 2005)',
				'Hathaway, James C and Audrey Macklin, ‘Should We Presume State Protection?’ (2016) 32(3) *Refuge* 49',
				'Hathaway, James C and Michelle Foster, *The Law of Refugee Status* (Cambridge University Press, 2nd ed, 2014)',
				'Hathaway, Oona A, Sabrina McElroy and Sara Aronchick Solow, ‘International Law at a Crossroads’ (2012) 7(1) *Yale Journal of International Affairs* 54',
				'Ramsay, Ian and Cameron Sim, ‘The Role and Use of Debt Agreements in Australian Personal Insolvency Law’ (2011) 19(3) *Insolvency Law Journal* 168',
				'Ramsay, Ian M, ‘Corporate Theory and Corporate Law Reform in Australia’ (1994) 1(2) *Agenda: A Journal of Policy Analysis and Reform* 179',
				'Ramsay, Ian M and Nicholas Lew, ‘Corporate Law Reform and Delisting in Australia’ (2007) 2(2) *Virginia Law & Business Review* 265',
			] },
			{ letter: 'B', title: 'Cases', entries: ['*Lane v Morrison* (2009) 239 CLR 230'] },
			{ letter: 'C', title: 'Legislation', entries: ['*Access to Medicinal Cannabis Act 2016* (Vic)', '*Australian Constitution*'] },
			{ letter: 'D', title: 'Treaties', entries: ['*Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment*, opened for signature 10 December 1984, 1465 UNTS 85 (entered into force 26 June 1987)'] },
			{ letter: 'E', title: 'Other', entries: ['New South Wales, *Parliamentary Debates*, Legislative Assembly, 15 December 1909'] },
		]);
	});

	it('omits empty sections and reletters the rest', () => {
		const b = buildBibliography(note(['*Native Title Act 1993* (Cth) s 223.', 'Jane Smith, *Principles* (Federation Press, 2018) 4.']));
		expect(b.map((s) => `${s.letter} ${s.title}`)).toEqual(['A Articles/Books/Reports', 'B Legislation']);
	});

	it('does not invert an institution, and sorts it by its name', () => {
		const b = buildBibliography(note([
			'Australian Law Reform Commission, *Traditional Rights and Freedoms* (Report No 129, December 2015) 209 [7.111].',
			'Paul Rishworth et al, *The New Zealand Bill of Rights* (Oxford University Press, 2003) 12.',
			'Peter Birks (ed), *New Perspectives in the Roman Law of Property* (Clarendon Press, 1989).',
		]));
		expect(b[0]!.entries).toEqual([
			'Australian Law Reform Commission, *Traditional Rights and Freedoms* (Report No 129, December 2015)',
			'Birks, Peter (ed), *New Perspectives in the Roman Law of Property* (Clarendon Press, 1989)',
			'Rishworth, Paul et al, *The New Zealand Bill of Rights* (Oxford University Press, 2003)',
		]);
	});

	it('lists a source once however often it is cited', () => {
		const b = buildBibliography(note(['*Mabo v Queensland [No 2]* (1992) 175 CLR 1, 30.', '*Mabo v Queensland [No 2]* (1992) 175 CLR 1, 42 (Brennan J).']));
		expect(b[0]!.entries).toEqual(['*Mabo v Queensland [No 2]* (1992) 175 CLR 1']);
	});

	it('is empty for a note with no citations', () => {
		expect(buildBibliography(note(['This point was not argued.']))).toEqual([]);
	});
});

describe('bibliography in exports', () => {
	const md = note(FOOTNOTES.slice(0, 3), '# Essay\n\n');
	const on = { ...DEFAULT_EXPORT, bibliography: true };

	it('Word: a page break, lettered sections and hanging indents', async () => {
		const r = await exportDocx(md, on);
		const doc = await (await JSZip.loadAsync(r.data)).file('word/document.xml')!.async('string');
		expect(doc).toMatch(/<w:pageBreakBefore\/>[\s\S]*?Bibliography/);
		expect(doc).toContain('Articles/Books/Reports');
		expect(doc).toContain('Ramsay, Ian M and Nicholas Lew, ‘Corporate Law Reform');
		expect(doc).toMatch(/<w:ind w:left="720" w:hanging="720"\/>/);
		// Without the option, no bibliography.
		const off = await (await JSZip.loadAsync((await exportDocx(md, DEFAULT_EXPORT)).data)).file('word/document.xml')!.async('string');
		expect(off).not.toContain('Bibliography');
	});

	it('HTML: the same, and the AGLC4 heading styles', () => {
		const { html } = exportHtml(md, { ...on, headingScheme: 'aglc' });
		expect(html).toMatch(/<h1 class="aglc aglc-1" style="break-before: page">Bibliography<\/h1>/);
		expect(html).toMatch(/<h2 class="aglc aglc-2"><span class="hnum">A<\/span>&nbsp;Articles\/Books\/Reports<\/h2>/);
		expect(html).toContain('<p class="bib">Foster, Michelle, <em>International Refugee Law');
	});

	it('is not added when the note has its own bibliography', () => {
		const { html } = exportHtml(`${md}\n## Bibliography\n\nMy own list.\n`, on);
		expect(html.match(/Bibliography/g)).toHaveLength(1);
	});
});

describe('page break before', () => {
	const b = (pageBreakBefore = false) => ({ lines: 2, lineHeight: 10, spaceBefore: 6, spaceAfter: 0, refs: [], pageBreakBefore });
	it('starts a new page, keeping the space before', () => {
		const pages = paginate([b(), b(true), b()], [], { contentHeight: 500, separator: 10 });
		expect(pages).toHaveLength(2);
		expect(pages[1]!.body.map((s) => [s.block, s.y])).toEqual([[1, 6], [2, 32]]);
	});
	it('adds no blank page when already at the top of one', () => {
		expect(paginate([b(true), b()], [], { contentHeight: 500, separator: 10 })).toHaveLength(1);
	});
});

describe('insert bibliography command', () => {
	const essay = '# Title\n\n## Introduction\n\nText.[^1] More.[^2]\n\n## Conclusion\n\nEnd.\n\n[^1]: *Lane v Morrison* (2009) 239 CLR 230, 236.\n[^2]: Jane Smith, *Principles* (Federation Press, 2018) 4.\n';

	const BIB = '## Bibliography\n\n### A Articles/Books/Reports\n\nSmith, Jane, *Principles* (Federation Press, 2018)\n\n### B Cases\n\n*Lane v Morrison* (2009) 239 CLR 230\n';

	it('inserts it after the footnote definitions, at the level of the parts', () => {
		const r = withBibliography(essay, 'auto')!;
		expect(r.replaced).toBe(false);
		expect(r.sources).toBe(2);
		expect(r.text).toBe(`${essay}\n${BIB}`);
	});

	it('moves a bibliography above the footnotes (as 1.6.0 inserted it) to after them', () => {
		const old = essay.replace('[^1]:', `${BIB}\n[^1]:`);
		const r = withBibliography(old, 'auto')!;
		expect(r.replaced).toBe(true);
		expect(r.text).toBe(`${essay}\n${BIB}`);
	});

	it('is kept after the footnotes when they are tidied or a footnote is added', () => {
		const text = withBibliography(essay, 'auto')!.text;
		expect(tidyFootnotes(text, { renumber: true, convertInline: true }).text).toBe(text);
		// A new footnote is added at the end of the note, then the footnotes are tidied.
		const added = `${text.replace('End.', 'End.[^3]')}\n[^3]: Ibid 5.\n`;
		const tidied = tidyFootnotes(added, { renumber: true, convertInline: true }).text;
		expect(tidied.indexOf('[^3]: Ibid 5.')).toBeLessThan(tidied.indexOf('## Bibliography'));
		expect(tidied.endsWith(BIB)).toBe(true);
	});

	it('is not read as part of the last footnote, and raises no problems', () => {
		const text = withBibliography(essay, 'auto')!.text;
		expect(scanFootnotes(text).defs.map((d) => d.content)).toEqual(['*Lane v Morrison* (2009) 239 CLR 230, 236.', 'Jane Smith, *Principles* (Federation Press, 2018) 4.']);
		expect(analyseDocument(text, { showInfo: false }).issues).toEqual([]);
	});

	it('replaces an existing bibliography, keeping the footnotes', () => {
		const once = withBibliography(essay, 'auto')!.text;
		const edited = once.replace('### B Cases', '### B Cases\n\nHand-written entry');
		const r = withBibliography(edited, 'auto')!;
		expect(r.replaced).toBe(true);
		expect(r.text).toBe(once);
	});

	it('uses # in a note without headings, and returns null when nothing is cited', () => {
		expect(withBibliography('Text.[^1]\n\n[^1]: *Lane v Morrison* (2009) 239 CLR 230.\n', 'auto')!.text)
			.toBe('Text.[^1]\n\n[^1]: *Lane v Morrison* (2009) 239 CLR 230.\n\n# Bibliography\n\n## A Cases\n\n*Lane v Morrison* (2009) 239 CLR 230\n');
		expect(withBibliography('Text.[^1]\n\n[^1]: Not a citation.\n', 'auto')).toBeNull();
	});

	it('does not number the bibliography as a part of the essay', () => {
		// Title, I Introduction, II Conclusion, then the unnumbered bibliography and its sections.
		const n = numberHeadings([1, 2, 2, 2, 3, 3], 'auto', 3);
		expect(n.map((h) => h.number)).toEqual([null, 'I', 'II', null, null, null]);
		expect(n.map((h) => h.aglcLevel)).toEqual([null, 1, 1, 1, 2, 2]);
		// The bibliography's level does not change how the essay's headings are numbered.
		expect(numberHeadings([2, 2, 1, 2], 'auto', 2).slice(0, 2)).toEqual(numberHeadings([2, 2], 'auto'));
		expect(numberHeadings([1, 1, 1, 2], 'auto', 2).slice(0, 2)).toEqual(numberHeadings([1, 1], 'auto'));
	});

	it('exports an inserted bibliography on a new page, with upright section letters and hanging entries', async () => {
		const text = withBibliography(essay, 'auto')!.text;
		const { html } = exportHtml(text, { ...DEFAULT_EXPORT, headingScheme: 'aglc' });
		expect(html).toContain('<h1 class="aglc aglc-1" style="break-before: page">Bibliography</h1>');
		expect(html).toContain('<h2 class="aglc aglc-2"><span class="hnum">A</span>&nbsp;Articles/Books/Reports</h2>');
		expect(html).toContain('<h1 class="aglc aglc-1"><span class="hnum">II</span>&nbsp;Conclusion</h1>');
		expect(html).toContain('<p class="bib">Smith, Jane, <em>Principles</em>');
		// The generated one is not added as well.
		expect(exportHtml(text, { ...DEFAULT_EXPORT, bibliography: true }).html.match(/>Bibliography</g)).toHaveLength(1);
		const doc = await (await JSZip.loadAsync((await exportDocx(text, DEFAULT_EXPORT)).data)).file('word/document.xml')!.async('string');
		expect(doc).toMatch(/<w:pageBreakBefore\/>[\s\S]*?Bibliography/);
		expect(doc).toMatch(/<w:ind w:left="720" w:hanging="720"\/>/);
	});
});
