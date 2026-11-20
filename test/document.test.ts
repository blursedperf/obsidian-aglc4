import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyseDocument, applyFixes } from '../src/aglc/document';
import { findSet } from '../src/prompts/engine';
import { EXAMPLE_ESSAY, EXAMPLE_MISTAKES, EXAMPLE_NAME, EXAMPLE_PRACTICE_FROM } from '../src/example';
import { noteEnabled, noteSettings } from '../src/scope';
import { DEFAULT_SETTINGS } from '../src/settings';
import { DEFAULT_EXPORT, exportDocx } from '../src/export/docx';
import { exportHtml } from '../src/export/html';
import { footnoteKeys, remapCrossReferences, scanFootnotes, tidyFootnotes } from '../src/footnotes';
import { atFinishedFootnote, referenceFor } from '../src/editor/context';

const rules = (t: string) => analyseDocument(t).issues.map((i) => i.rule);

describe('note-level rules', () => {
	it('footnote number before punctuation', () => {
		const t = 'The court agreed[^1].\n\n[^1]: Ibid.';
		const a = analyseDocument(t);
		const issue = a.issues.find((i) => i.rule === 'ref-after-punct')!;
		expect(issue).toBeDefined();
		expect(applyFixes(t, [issue]).text).toBe('The court agreed.[^1]\n\n[^1]: Ibid.');
	});

	it('Ibid in the first footnote', () => {
		expect(rules('Text.[^1]\n\n[^1]: Ibid.')).toContain('ibid-first');
	});

	it('Ibid after a footnote with two sources', () => {
		const t = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1; *Native Title Act 1993* (Cth).\n[^2]: Ibid 5.';
		expect(rules(t)).toContain('ibid-multiple');
	});

	it('repeated full citation of the preceding single source suggests Ibid', () => {
		const t = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1.\n[^2]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 30.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'use-ibid')!;
		expect(issue.fix!.insert).toBe('Ibid 30');
	});

	it('repeated full citation later suggests a short reference', () => {
		const t = 'A.[^1] B.[^2] C.[^3]\n\n[^1]: Jane Smith, *Principles of Law* (Federation Press, 2018).\n[^2]: *Native Title Act 1993* (Cth).\n[^3]: Jane Smith, *Principles of Law* (Federation Press, 2018) 45.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'repeat-citation')!;
		expect(issue.fix!.insert).toBe('Smith (n 1) 45');
	});

	it('cross-reference checks', () => {
		const base = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1.\n';
		expect(rules(base + '[^2]: *Mabo* (n 5) 3.')).toContain('n-missing');
		expect(rules(base + '[^2]: *Mabo* (n 2) 3.')).toContain('n-forward');
		expect(rules(base + '[^2]: *Wik* (n 1) 3.')).toContain('n-mismatch');
		expect(rules(base + '[^2]: *Mabo* (n 1) 3.')).toContain('use-ibid');
	});

	it('undefined, reused and unused footnotes', () => {
		const r = rules('A.[^1] B.[^1] C.[^2]\n\n[^1]: Text.\n[^3]: Orphan.');
		expect(r).toContain('ref-undefined');
		expect(r).toContain('ref-reused');
		expect(r).toContain('def-unused');
	});

	it('does not flag the footnote being typed as unfinished', () => {
		const t = 'A.[^1]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175';
		expect(analyseDocument(t, { cursor: t.length }).issues.map((i) => i.rule)).not.toContain('closing-stop');
		expect(analyseDocument(t).issues.map((i) => i.rule)).toContain('closing-stop');
	});

	it('ignores code blocks', () => {
		expect(rules('```\nx[^1].\n```\n')).toEqual([]);
	});
});

describe('footnote tidying', () => {
	it('moves definitions to the bottom in reading order and renumbers', () => {
		const t = 'First.[^b]\n\n[^b]: Second def.\n\nThen.[^a] And.^[Inline one.]\n\n[^a]: First def.\n\nMore text.';
		const r = tidyFootnotes(t, { renumber: true, convertInline: true });
		expect(r.text).toBe('First.[^1]\n\nThen.[^2] And.[^3]\n\nMore text.\n\n[^1]: Second def.\n[^2]: First def.\n[^3]: Inline one.\n');
	});

	it('keeps multi-line definitions', () => {
		const t = 'A.[^1]\n\n[^1]: Line one.\n    Line two.\n\nBody.';
		expect(tidyFootnotes(t, { renumber: true, convertInline: false }).text).toBe('A.[^1]\n\nBody.\n\n[^1]: Line one.\n    Line two.\n');
	});

	it('is idempotent', () => {
		const t = 'A.[^1] B.[^2]\n\n[^1]: One.\n[^2]: Two.\n';
		expect(tidyFootnotes(t, { renumber: true, convertInline: false }).changed).toBe(false);
	});

	it('remaps (n X) when a footnote is inserted before', () => {
		const before = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1.\n[^2]: *Mabo* (n 1) 4.\n';
		const keysBefore = footnoteKeys(scanFootnotes(before));
		const after = 'New.[^new] A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1.\n[^2]: *Mabo* (n 1) 4.\n[^new]: Ibid.\n';
		const keysAfter = footnoteKeys(scanFootnotes(after));
		const r = remapCrossReferences(after, keysBefore, keysAfter);
		expect(r.changed).toBe(1);
		expect(r.text).toContain('*Mabo* (n 2) 4.');
	});
});

describe('example essay', () => {
	const issues = analyseDocument(EXAMPLE_ESSAY).issues;
	const practice = EXAMPLE_ESSAY.indexOf(`[^${EXAMPLE_PRACTICE_FROM}]:`);
	const last = EXAMPLE_PRACTICE_FROM + Object.keys(EXAMPLE_MISTAKES).length - 1;
	const footnoteAt = (pos: number) => /\[\^(\d+)\]:/.exec(EXAMPLE_ESSAY.slice(EXAMPLE_ESSAY.lastIndexOf('\n[^', pos) + 1))?.[1];

	it('is the sample in the repository', () => {
		expect(readFileSync(new URL('../sample/AGLC4 example essay.md', import.meta.url), 'utf8')).toBe(EXAMPLE_ESSAY);
	});

	it('raises no problems, suggestions included, outside the practice part', () => {
		expect(issues.filter((i) => i.from < practice)).toEqual([]);
	});

	it('shows each mistake in the practice part', () => {
		for (const [label, rule] of Object.entries(EXAMPLE_MISTAKES)) {
			expect([label, issues.some((i) => i.rule === rule && footnoteAt(i.from) === label)]).toEqual([label, true]);
		}
		// Every practice footnote has at least one problem.
		for (let n = EXAMPLE_PRACTICE_FROM; n <= last; n++) expect(issues.some((i) => footnoteAt(i.from) === String(n))).toBe(true);
	});

	it('is AGLC4-correct once every problem is fixed', () => {
		let t = EXAMPLE_ESSAY;
		for (let p = 0; p < 4; p++) {
			const r = applyFixes(t, analyseDocument(t, { showInfo: false }).issues);
			if (!r.applied) break;
			t = r.text;
		}
		expect(analyseDocument(t).issues).toEqual([]);
		expect(t).toContain('[^32]: *Cubillo v Commonwealth [No 2]* (2000) 103 FCR 1, 45.');
		expect(t).toContain('[^33]: *Racial Discrimination Act 1975* (Cth) s 10.');
		expect(t).toContain('[^34]: *Commonwealth v Yarmirr* (2001) 208 CLR 1.');
		expect(t).toContain('[^35]: Richard H Bartlett, *Native Title in Australia* (LexisNexis Butterworths, 3rd ed, 2015).');
		expect(t).toContain('[^36]: Ibid 30.');
		expect(t).toContain('[^37]: *Queensland v Congoo* [2015] HCA 17.');
	});

	it('is in the plugin\'s scope and style through its properties', () => {
		const fm = { aglc: true, 'aglc-headings': 'aglc', 'aglc-bibliography': true, 'aglc-prompts': 'critical' };
		expect(EXAMPLE_ESSAY.startsWith('---\naglc: true\naglc-headings: aglc\naglc-bibliography: true\naglc-prompts: critical\n---\n')).toBe(true);
		expect(findSet(fm['aglc-prompts'])?.id).toBe('critical');
		expect(noteEnabled({ scope: 'marked', scopeFolders: '' }, `${EXAMPLE_NAME}.md`, fm)).toBe(true);
		const s = noteSettings(DEFAULT_SETTINGS, fm);
		expect([s.headingScheme, s.bibliography]).toEqual(['aglc', true]);
	});

	it('exports with AGLC4 headings, a bibliography and no tour', async () => {
		const s = noteSettings(DEFAULT_SETTINGS, { 'aglc-headings': 'aglc', 'aglc-bibliography': true });
		const opts = { ...DEFAULT_EXPORT, headingScheme: s.headingScheme, bibliography: s.bibliography };
		const { html, footnotes } = exportHtml(EXAMPLE_ESSAY, opts);
		expect(footnotes).toBe(37);
		expect(html).not.toContain('TRY THE PLUGIN');
		expect(html).toContain('<span class="hnum">I</span>&nbsp;Introduction');
		expect(html).toContain('<span class="hnum">II</span>&nbsp;Recognition');
		expect(html).toContain('<span class="hnum">A</span>&nbsp;From Terra Nullius');
		expect(html).toContain('<span class="hnum">1</span>&nbsp;Pastoral Leases');
		expect(html).toContain('Reynolds, Henry, <em>The Law of the Land</em>');
		expect(html).toContain('>Bibliography<');
		expect(html).toContain('Strelein, Lisa, <em>Compromised Jurisprudence');
		const r = await exportDocx(EXAMPLE_ESSAY, opts);
		expect(r.footnotes).toBe(37);
		expect(r.warnings).toEqual([]);
	});
});

describe('returning from a footnote', () => {
	const note = 'First claim.[^1] Second claim.[^2]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1.\n[^2]: Ibid 4';
	it('finds the reference of the footnote at the cursor', () => {
		const inFirst = note.indexOf('Mabo');
		expect(referenceFor(note, inFirst)).toBe(note.indexOf('[^1]') + 4);
		expect(referenceFor(note, note.length)).toBe(note.indexOf('[^2]') + 4);
		expect(referenceFor(note, 3)).toBeNull();
	});
	it('knows when a footnote is finished', () => {
		const endFirst = note.indexOf('CLR 1.') + 6;
		expect(atFinishedFootnote(note, endFirst)).toBe(true);
		expect(atFinishedFootnote(note, endFirst - 1)).toBe(false);
		expect(atFinishedFootnote(note, note.length)).toBe(false); // "Ibid 4" has no full stop yet
		expect(atFinishedFootnote(note + '.', note.length + 1)).toBe(true);
		expect(atFinishedFootnote(note, note.indexOf('First claim.') + 12)).toBe(false); // body text
	});
});

describe('note-level rules added in review', () => {
	it('warns when Ibid follows a footnote with no citation', () => {
		const t = 'A.[^1] B.[^2]\n\n[^1]: This point was not argued below.\n[^2]: Ibid.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'ibid-no-source')!;
		expect(issue.severity).toBe('warning');
	});

	it('moves a footnote number after a closing quotation mark', () => {
		const t = 'The test is \u2018reasonableness[^1]\u2019 here.\n\n[^1]: Ibid.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'ref-after-punct')!;
		expect(issue.message).toMatch(/quotation marks/);
		expect(applyFixes(t, [issue]).text).toContain('\u2018reasonableness\u2019[^1] here.');
		// An apostrophe in a word is not a closing quotation mark.
		expect(rules('The Court[^1]\'s view.\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1.')).not.toContain('ref-after-punct');
	});

	it('treats a footnote ending in a quoted sentence as closed', () => {
		const t = 'A.[^1]\n\n[^1]: The Court said \'the rule is settled.\'';
		expect(rules(t)).not.toContain('closing-stop');
	});

	it('words unexpected-text messages with element labels', () => {
		const t = 'A.[^1]\n\n[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 42 zzz qqq.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'unexpected')!;
		expect(issue.message).toMatch(/^Unexpected text after the pinpoint of this case \(reported\) citation/);
	});
});

describe('issues that can be seen', () => {
	const NOTE = 'A.[^1] B.[^2] C.[^3] D.[^4] E.[^5]\n\n'
		+ '[^1]: *Green v Brown* (1990) 170 CLR 1.\n'
		+ '[^2]: *Green* (n 1), 13.\n'
		+ '[^3]: *Ibid*, 5.\n'
		+ '[^4]: *Ibid.*\n'
		+ '[^5]: See *ibid* 7.\n';
	const issues = analyseDocument(NOTE, { showInfo: false }).issues;
	const at = (rule: string) => issues.filter((i) => i.rule === rule).map((i) => NOTE.slice(i.from, i.to));

	it('flags an italicised Ibid instead of a missing full stop', () => {
		expect(at('closing-stop')).toEqual([]);
		expect(at('ibid-italics')).toEqual(['*Ibid*', '*Ibid.*', '*ibid*']);
		expect(at('ibid-comma')).toHaveLength(1);
	});
	it('underlines a stray comma together with the word before it', () => {
		expect(at('n-comma')).toEqual(['(n 1),']);
		expect(at('ibid-comma')[0]).toMatch(/Ibid\*?,$/);
	});
	it('never underlines only punctuation or formatting marks', () => {
		for (const i of issues) expect(NOTE.slice(i.from, i.to)).toMatch(/[\p{L}\p{N}]/u);
	});
	it('fixes them all', () => {
		let text = NOTE;
		for (let k = 0; k < 3; k++) text = applyFixes(text, analyseDocument(text, { showInfo: false }).issues).text;
		// Footnote 2 cites the source of footnote 1, so it becomes Ibid (r 1.4.3).
		expect(text).toContain('[^2]: Ibid 13.');
		expect(text).toContain('[^3]: Ibid 5.');
		expect(text).toContain('[^4]: Ibid.');
		expect(text).toContain('[^5]: See ibid 7.');
		expect(analyseDocument(text, { showInfo: false }).issues.filter((i) => i.severity === 'error')).toEqual([]);
	});
});

describe('one underline for one mistake', () => {
	const issuesOf = (fn: string) => {
		const t = `A.[^1]\n\n[^1]: ${fn}\n`;
		return analyseDocument(t, { showInfo: false }).issues.map((i) => `${i.rule} "${t.slice(i.from, i.to)}"`);
	};
	it('"at" before a pinpoint is the only problem, not the pinpoint too', () => {
		expect(issuesOf('*Cubillo v Commonwealth [No 2]* (2000) 103 FCR 1 at 45.')).toEqual(['at-pinpoint " at "']);
		expect(issuesOf('*Love v Commonwealth* [2020] HCA 3 at [81].')).toEqual(['at-pinpoint " at "']);
		expect(issuesOf('Jane Smith, *Principles* (Federation Press, 2018) at 4.')).toEqual(['at-pinpoint " at "']);
	});
	it('still reports text that the fix does not explain', () => {
		expect(issuesOf('*Mabo v Queensland [No 2]* (1992) 175 CLR 1 at 45 zzz qqq.')).toContain('unexpected " at 45 zzz qqq"');
	});
});
