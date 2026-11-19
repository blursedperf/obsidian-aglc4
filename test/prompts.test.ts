import { describe, expect, it } from 'vitest';
import { findSet, guideAt, headingKey, outline, parseCustomSet, promptAt, sentencesBefore, setToNote } from '../src/prompts/engine';
import { BUILT_IN_SETS, CRITICAL, DISCUSS, ESSAY_ALTERNATIVES, HIRAC, ILAC, IRAC, MIRAT, PROBLEM_ALTERNATIVES } from '../src/prompts/sets';

/** The aim of the guide at the `|` in `doc`. */
function at(doc: string, set = IRAC): string | null {
	const cursor = doc.indexOf('|');
	return promptAt(doc.replace('|', ''), cursor, set);
}

/** The guide at the `|` in `doc`. */
function guide(doc: string, set = IRAC) {
	const cursor = doc.indexOf('|');
	return guideAt(doc.replace('|', ''), cursor, set);
}

describe('paragraph prompts: built-in sets', () => {
	it('every set has a guide, with its sentences, for each section and the body, and its sources', () => {
		for (const set of BUILT_IN_SETS) {
			expect(set.sections.length).toBeGreaterThan(0);
			expect(set.body.length).toBeGreaterThan(0);
			expect(set.sources.length).toBeGreaterThan(0);
			for (const p of [...set.sections.flatMap((s) => s.prompts), ...set.body]) {
				expect(p.aim).toMatch(/^[A-Z][^:]+: /);
				expect(p.sentences.length).toBeGreaterThanOrEqual(2);
				for (const s of p.sentences) expect(s).toMatch(/^[A-Z][^:]{1,40}: \S/);
			}
		}
		expect(new Set(BUILT_IN_SETS.map((s) => s.id)).size).toBe(BUILT_IN_SETS.length);
	});

	it('finds a set by id or name, ignoring case', () => {
		expect(findSet('irac')).toBe(IRAC);
		expect(findSet(' MIRAT ')).toBe(MIRAT);
		expect(findSet('Essay: critical analysis')).toBe(CRITICAL);
		expect(findSet('nonsense')).toBeNull();
		expect(findSet(true)).toBeNull();
	});
});

describe('paragraph prompts: which guide shows', () => {
	it('guides by section heading, in any heading style', () => {
		expect(at('## Issue\n\n|')).toBe('Issue: the legal question this issue raises');
		expect(at('### A. Rule\n\n|')).toBe('Rule: the governing principle and its source');
		expect(at('### (a) **Application**\n\n|')).toBe('Application: one element applied to the facts');
		expect(at('## Conclusion\n\n|')).toBe('Conclusion: the likely outcome on this issue');
		expect(at('## Law\n\n|', ILAC)).toBe('Law: the governing principle and its source');
		expect(at('## Material facts\n|', MIRAT)).toBe('Material facts: the facts that matter');
	});

	it('moves to the next guide for each paragraph, then repeats the last', () => {
		expect(at('## Application\n\nHere, the offer was made.\n\n|')).toBe('Application: the next element');
		expect(at('## Application\n\nOne.\n\nTwo.\n\n|')).toBe('Application: the other side');
		expect(at('## Application\n\nOne.\n\nTwo.\n\nThree.\n\nFour.\n\n|')).toBe('Application: the other side');
		// A paragraph over several lines counts once.
		expect(at('## Application\n\nOne\ncontinues.\n\n|')).toBe('Application: the next element');
	});

	it('stays while the paragraph is written, above its first line', () => {
		const doc = '## Rule\n\nA promise is enforceable only if it is supported by consideration. The leading|';
		const g = guide(doc)!;
		expect(g.prompt.aim).toBe('Rule: the governing principle and its source');
		expect(g.from).toBe('## Rule\n\n'.length);
		expect(g.sentence).toBe(1);
		// On a later line of the same paragraph, and in its middle.
		expect(guide('## Rule\n\nFirst line\nsecond| line.')!.from).toBe('## Rule\n\n'.length);
		expect(guide('## Rule\n\nOne. Tw|o. Three.')!.sentence).toBe(1);
		// The next paragraph has its own guide.
		expect(at('## Rule\n\nOne. Two.\n\nThe courts| have')).toBe('Rule: how the courts apply it');
	});

	it('counts the sentences finished before the cursor', () => {
		expect(sentencesBefore('')).toBe(0);
		expect(sentencesBefore('One sentence')).toBe(0);
		expect(sentencesBefore('One sentence.')).toBe(0);
		expect(sentencesBefore('One sentence. ')).toBe(1);
		expect(sentencesBefore('Is it? Yes! And “quoted.” Then (bracketed.) More')).toBe(4);
		expect(sentencesBefore('It was held.[^1] Then')).toBe(1);
		expect(sentencesBefore('Under s 5 of the Act, 1.5 per cent, eg the Corporations Act 2001 (Cth). Then')).toBe(1);
	});

	it('guides each part of an essay: opening it, then PEEL paragraphs', () => {
		const doc = (n: number) => `## Introduction\n\nThesis.\n\nRoadmap.\n\n## The common law fails victims\n\n${'Para.\n\n'.repeat(n)}|`;
		expect(at(doc(0), CRITICAL)).toBe('Opening a part: what it argues');
		expect(at(doc(1), CRITICAL)).toBe('Body paragraph: one point for your thesis (PEEL)');
		expect(at(doc(5), CRITICAL)).toBe('Body paragraph: one point for your thesis (PEEL)');
		expect(guide(doc(1), CRITICAL)!.prompt.sentences.map((s) => s.split(':')[0])).toEqual(['Point', 'Evidence', 'Explanation', 'Further support (optional)', 'Link']);
	});

	it('follows IRAC through an issue written without sub-headings', () => {
		const doc = (n: number) => `## Was there a valid acceptance?\n\n${'Para.\n\n'.repeat(n)}|`;
		expect(at(doc(0))).toMatch(/^Issue:/);
		expect(at(doc(1))).toMatch(/^Rule:/);
		expect(at(doc(2))).toMatch(/^Application: one element/);
		expect(at(doc(3))).toMatch(/^Application: the other side/);
		expect(at(doc(4))).toMatch(/^Conclusion:/);
		expect(at(doc(9))).toMatch(/^Conclusion:/);
	});

	it('opens with the introduction, then the roadmap, before any heading or under the title', () => {
		expect(at('# Assignment 1\n\n|', CRITICAL)).toBe('Introduction: the issue and your thesis');
		expect(at('# Assignment 1\n\nMy thesis.\n\n|', CRITICAL)).toBe('Introduction: the roadmap');
		expect(at('# Assignment 1\n\nOne.\n\nTwo.\n\n|', CRITICAL)).toBe('Opening a part: what it argues');
		expect(at('---\naglc: true\n---\n|', DISCUSS)).toBe('Introduction: the question and where you come down');
	});

	it('gives a "discuss" essay its own introduction, evaluation and conclusion', () => {
		expect(at('## Evaluation\n\n|', DISCUSS)).toBe('Evaluation: weigh the two sides');
		expect(at('## Conclusion\n\n|', DISCUSS)).toMatch(/^Conclusion: answer the question/);
		expect(at('## Counter-arguments\n\n|', CRITICAL)).toBe('Counter-argument: the strongest view against your thesis');
	});

	it('guides an issue heading in HIRAC, while it is written, but not a section heading or the title', () => {
		expect(at('## Overview\n\nText.\n\n## |', HIRAC)).toBe('Heading: the issue in a few words');
		expect(at('## Overview\n\nText.\n\n## Was there an offer|', HIRAC)).toBe('Heading: the issue in a few words');
		expect(at('## Rule|', HIRAC)).toBeNull();
		expect(at('# Title|\n\n## Issue 1', HIRAC)).toBeNull();
		expect(at('## |', IRAC)).toBeNull();
		expect(at('## Issue|', IRAC)).toBeNull();
	});

	it('shows nothing in footnotes, code, comments, frontmatter, lists, quotations or tables', () => {
		expect(at('## Issue\n\nText.[^1]\n\n[^1]: |')).toBeNull();
		expect(at('## Issue\n\n```\n|\n```')).toBeNull();
		expect(at('## Issue\n\n%%\n|\n%%')).toBeNull();
		expect(at('---\naglc-prompts: irac\n|\n---\n')).toBeNull();
		expect(at('## Issue\n\n- a list| item')).toBeNull();
		expect(at('## Issue\n\n> a long quotation|')).toBeNull();
		const table = '## Issue\n\n| a | table |';
		expect(promptAt(table, table.length - 2, IRAC)).toBeNull();
	});

	it('does not count code or a list as a paragraph, or a heading in code as a heading', () => {
		expect(at('## Issue\n\n```\n## Rule\n```\n\n|')).toBe('Issue: the legal question this issue raises');
		// A paragraph directly after a list starts after the list.
		expect(guide('## Issue\n\n- item\nText|')!.from).toBe('## Issue\n\n- item\n'.length);
	});
});

describe('paragraph prompts: new essays', () => {
	it('outlines a problem answer with each issue\'s sections', () => {
		const md = outline(IRAC, 'Contracts problem');
		expect(md).toMatch(/^---\naglc: true\naglc-prompts: irac\n---\n# Contracts problem\n/);
		expect(md).toContain('## Issue 1: [the issue in a few words]\n\n### Issue\n\n### Rule\n\n### Application\n\n### Conclusion\n\n## Overall conclusion\n');
		expect(md).not.toContain('## Overview');
	});

	it('outlines MIRAT with its material facts first', () => {
		const md = outline(MIRAT, 'Torts');
		expect(md.indexOf('## Material facts')).toBeLessThan(md.indexOf('## Issue 1'));
		expect(md).toContain('### Tentative conclusion');
	});

	it('outlines an essay: introduction, points, other sections, conclusion', () => {
		const md = outline(CRITICAL, 'Essay');
		const order = ['## Introduction', '## [Your first point]', '## [Your second point]', '## Counter-arguments', '## Conclusion'].map((h) => md.indexOf(h));
		expect(order.every((n) => n >= 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	it('gives every outline heading the guide meant for it', () => {
		const md = outline(IRAC, 'T');
		const after = (h: string) => md.indexOf('\n', md.indexOf(h)) + 1;
		expect(promptAt(md, after('### Rule'), IRAC)).toMatch(/^Rule:/);
		expect(promptAt(md, after('## Overall conclusion'), IRAC)).toBe('Overall conclusion: the advice');
	});
});

describe('paragraph prompts: custom sets', () => {
	const note = [
		'---', 'aglc-prompt-set: My IPAC', 'aglc-prompt-kind: problem', '---', '',
		'Notes about the set are ignored.', '',
		'## Issue (each issue)', '- Issue: the question', '\t- Facts: the key facts.', '\t- Question: the issue.', '- Sub-issues', '',
		'## Principle | Law (each issue)', '- The principle, with authority.', '',
		'## Background (optional)', '- Some background.', '',
		'## Body', '- A paragraph.', '  - Point: the point.', '',
		'## Issue heading', '- Heading: a short question', '',
	].join('\n');

	it('reads sections, alternative headings, markers, sentences and body guides from a note', () => {
		const set = parseCustomSet('Prompts/IPAC.md', { 'aglc-prompt-set': 'My IPAC', 'aglc-prompt-kind': 'problem' }, note)!;
		expect(set.name).toBe('My IPAC');
		expect(set.kind).toBe('problem');
		expect(set.custom).toBe(true);
		expect(set.sections.map((s) => s.name)).toEqual(['Issue', 'Principle', 'Background']);
		expect(set.sections[0]).toMatchObject({
			prompts: [{ aim: 'Issue: the question', sentences: ['Facts: the key facts.', 'Question: the issue.'] }, { aim: 'Sub-issues', sentences: [] }],
			perIssue: true,
		});
		expect(set.sections[1]!.aliases).toEqual(['principle', 'law']);
		expect(set.sections[2]!.optional).toBe(true);
		expect(set.body).toEqual([{ aim: 'A paragraph.', sentences: ['Point: the point.'] }]);
		expect(set.issueHeading?.aim).toBe('Heading: a short question');
		expect(promptAt('## Law\n\n', 9, set)).toBe('The principle, with authority.');
		expect(findSet('my ipac', [set])).toBe(set);
	});

	it('reads its own alternatives, or uses the usual ones for its kind', () => {
		const own = parseCustomSet('a.md', { 'aglc-prompt-set': 'A' }, '## Body\n- Para\n\n## Alternatives\n\nSome notes.\n\n- Example: a case.\n- Policy: why.')!;
		expect(own.alternatives).toEqual(['Example: a case.', 'Policy: why.']);
		expect(own.body).toEqual([{ aim: 'Para', sentences: [] }]);
		expect(parseCustomSet('a.md', { 'aglc-prompt-set': 'B', 'aglc-prompt-kind': 'problem' }, '## Body\n- Para')!.alternatives).toBe(PROBLEM_ALTERNATIVES);
		expect(parseCustomSet('a.md', { 'aglc-prompt-set': 'C' }, '## Body\n- Para')!.alternatives).toBe(ESSAY_ALTERNATIVES);
	});

	it('reads a set from 1.11.0, with no sentences', () => {
		const set = parseCustomSet('a.md', { 'aglc-prompt-set': 'Old' }, '## Introduction\n- State your thesis.\n- Outline the argument.')!;
		expect(set.sections[0]!.prompts).toEqual([{ aim: 'State your thesis.', sentences: [] }, { aim: 'Outline the argument.', sentences: [] }]);
	});

	it('is not a set without its property', () => {
		expect(parseCustomSet('a.md', {}, note)).toBeNull();
		expect(parseCustomSet('a.md', undefined, note)).toBeNull();
	});

	it('copies every built-in set to a note that reads back the same', () => {
		for (const set of BUILT_IN_SETS) {
			const text = setToNote(set, `My ${set.id}`);
			const fm = { 'aglc-prompt-set': `My ${set.id}`, 'aglc-prompt-kind': set.kind };
			const back = parseCustomSet('x.md', fm, text)!;
			expect(back.kind).toBe(set.kind);
			expect(back.body).toEqual(set.body);
			expect(back.issueHeading).toEqual(set.issueHeading);
			expect(back.alternatives).toEqual(set.alternatives);
			expect(back.sections.map((s) => [s.name, s.prompts, !!s.perIssue, !!s.optional])).toEqual(set.sections.map((s) => [s.name, s.prompts, !!s.perIssue, !!s.optional]));
			for (const s of set.sections) for (const a of s.aliases) expect(back.sections.find((b) => b.name === s.name)!.aliases).toContain(a);
		}
	});

	it('names a custom set in a new essay\'s properties', () => {
		const set = parseCustomSet('a.md', { 'aglc-prompt-set': 'Lecturer: Smith' }, '## Introduction\n- Thesis.')!;
		expect(outline(set, 'E')).toContain('aglc-prompts: "Lecturer: Smith"');
	});
});

describe('headingKey', () => {
	it('drops numbering, emphasis and text after a colon', () => {
		expect(headingKey('II. **Rule**')).toBe('rule');
		expect(headingKey('(a) Application: the offer')).toBe('application');
		expect(headingKey('3. Conclusion')).toBe('conclusion');
		expect(headingKey('A  Issue')).toBe('issue');
		expect(headingKey('A Rule of thumb')).toBe('a rule of thumb');
	});
});
