import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyseDocument, applyFixes } from '../src/aglc/document';
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
		const t = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1; *Native Title Act 1993* (Cth).\n[^2]: Ibid 5.';
		expect(rules(t)).toContain('ibid-multiple');
	});

	it('repeated full citation of the preceding single source suggests Ibid', () => {
		const t = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1.\n[^2]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 30.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'use-ibid')!;
		expect(issue.fix!.insert).toBe('Ibid 30');
	});

	it('repeated full citation later suggests a short reference', () => {
		const t = 'A.[^1] B.[^2] C.[^3]\n\n[^1]: Jane Smith, *Principles of Law* (Federation Press, 2018).\n[^2]: *Native Title Act 1993* (Cth).\n[^3]: Jane Smith, *Principles of Law* (Federation Press, 2018) 45.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'repeat-citation')!;
		expect(issue.fix!.insert).toBe('Smith (n 1) 45');
	});

	it('cross-reference checks', () => {
		const base = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1.\n';
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
		const t = 'A.[^1]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175';
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
		const before = 'A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1.\n[^2]: *Mabo* (n 1) 4.\n';
		const keysBefore = footnoteKeys(scanFootnotes(before));
		const after = 'New.[^new] A.[^1] B.[^2]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1.\n[^2]: *Mabo* (n 1) 4.\n[^new]: Ibid.\n';
		const keysAfter = footnoteKeys(scanFootnotes(after));
		const r = remapCrossReferences(after, keysBefore, keysAfter);
		expect(r.changed).toBe(1);
		expect(r.text).toContain('*Mabo* (n 2) 4.');
	});
});

describe('sample notes', () => {
	const read = (name: string) => readFileSync(new URL(`../sample/${name}`, import.meta.url), 'utf8');

	it('a correctly cited essay has no problems', () => {
		expect(analyseDocument(read('Native Title Essay.md')).issues).toEqual([]);
	});

	it('fixing all problems produces AGLC4 citations', () => {
		let t = read('Bad Citations.md');
		for (let p = 0; p < 4; p++) {
			const r = applyFixes(t, analyseDocument(t, { showInfo: false }).issues);
			if (!r.applied) break;
			t = r.text;
		}
		expect(t).toContain('[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 30.');
		expect(t).toContain('[^2]: Ibid 31.');
		expect(t).toContain('[^3]: *Native Title Act 1993* (Cth) s 223.');
		expect(t).toContain('[^5]: *Love v Commonwealth* [2020] HCA 3, [81].');
		expect(t).toContain('(Web Page, 1 May 2020) <https://example.org>.');
		expect(analyseDocument(t).issues.map((i) => i.rule)).toEqual(['not-aglc']);
	});
});

describe('returning from a footnote', () => {
	const note = 'First claim.[^1] Second claim.[^2]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1.\n[^2]: Ibid 4';
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
		expect(rules('The Court[^1]\'s view.\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1.')).not.toContain('ref-after-punct');
	});

	it('treats a footnote ending in a quoted sentence as closed', () => {
		const t = 'A.[^1]\n\n[^1]: The Court said \'the rule is settled.\'';
		expect(rules(t)).not.toContain('closing-stop');
	});

	it('words unexpected-text messages with element labels', () => {
		const t = 'A.[^1]\n\n[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 42 zzz qqq.';
		const issue = analyseDocument(t).issues.find((i) => i.rule === 'unexpected')!;
		expect(issue.message).toMatch(/^Unexpected text after the pinpoint of this case \(reported\) citation/);
	});
});
