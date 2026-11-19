import { describe, expect, it } from 'vitest';
import { findSet, headingKey, outline, parseCustomSet, promptAt, setToNote } from '../src/prompts/engine';
import { BUILT_IN_SETS, CRITICAL, DISCUSS, HIRAC, ILAC, IRAC, MIRAT } from '../src/prompts/sets';

/** The prompt at the `|` in `doc`. */
function at(doc: string, set = IRAC): string | null {
	const cursor = doc.indexOf('|');
	return promptAt(doc.replace('|', ''), cursor, set);
}

describe('paragraph prompts: built-in sets', () => {
	it('every set has prompts for its sections and body, and its sources', () => {
		for (const set of BUILT_IN_SETS) {
			expect(set.sections.length).toBeGreaterThan(0);
			expect(set.body.length).toBeGreaterThan(0);
			expect(set.sources.length).toBeGreaterThan(0);
			for (const s of set.sections) expect(s.prompts.length).toBeGreaterThan(0);
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

describe('paragraph prompts: where each prompt shows', () => {
	it('prompts by section heading, in any heading style', () => {
		expect(at('## Issue\n\n|')).toMatch(/^Issue: frame it as a specific legal question/);
		expect(at('### A. Rule\n\n|')).toMatch(/^Rule: state the rule as a general principle/);
		expect(at('### (a) **Application**\n\n|')).toMatch(/^Apply each element/);
		expect(at('## Conclusion\n\n|')).toMatch(/likely outcome/);
		expect(at('## Law\n\n|', ILAC)).toMatch(/^Law: state the rule/);
		expect(at('## Material facts\n|', MIRAT)).toMatch(/who, what, when/);
	});

	it('moves to the next prompt for each paragraph written, then repeats the last', () => {
		expect(at('## Application\n\nHere, the offer was made.\n\n|')).toMatch(/follow \("Similar to …"\)/);
		expect(at('## Application\n\nOne.\n\nTwo.\n\n|')).toMatch(/other party's best argument/);
		expect(at('## Application\n\nOne.\n\nTwo.\n\nThree.\n\nFour.\n\nFive.\n\n|')).toMatch(/^End the paragraph/);
		// A paragraph over several lines counts once.
		expect(at('## Application\n\nOne\ncontinues.\n\n|')).toMatch(/follow \("Similar to …"\)/);
	});

	it('cycles through the body prompts under an essay point', () => {
		const doc = (n: number) => `## Introduction\n\nThesis.\n\n## The common law fails victims\n\n${'Para.\n\n'.repeat(n)}|`;
		expect(at(doc(0), CRITICAL)).toMatch(/^Topic sentence/);
		expect(at(doc(1), CRITICAL)).toMatch(/^Support the point/);
		expect(at(doc(3), CRITICAL)).toMatch(/^Link the paragraph back/);
		expect(at(doc(4), CRITICAL)).toMatch(/^Topic sentence/);
	});

	it('follows IRAC through an issue written without sub-headings', () => {
		const doc = (n: number) => `## Was there a valid acceptance?\n\n${'Para.\n\n'.repeat(n)}|`;
		expect(at(doc(0))).toMatch(/^Issue:/);
		expect(at(doc(1))).toMatch(/^Rule:/);
		expect(at(doc(2))).toMatch(/^Application:/);
		expect(at(doc(4))).toMatch(/^Conclusion:/);
		expect(at(doc(9))).toMatch(/^Conclusion:/);
	});

	it('treats a note\'s only # heading as its title', () => {
		expect(at('# Assignment 1\n\n|', CRITICAL)).toMatch(/^Introduction: identify the issue/);
		expect(at('# Assignment 1\n\nMy thesis.\n\n|', CRITICAL)).toMatch(/^Topic sentence/);
		expect(at('---\naglc: true\n---\n|', DISCUSS)).toMatch(/^Introduction: work out what "discuss" asks/);
	});

	it('gives a "discuss" essay its own introduction, evaluation and conclusion', () => {
		expect(at('## Evaluation\n\n|', DISCUSS)).toMatch(/^Weigh the two sides/);
		expect(at('## Conclusion\n\n|', DISCUSS)).toMatch(/answer the question as asked/);
		expect(at('## Counter-arguments\n\n|', CRITICAL)).toMatch(/strongest view against your thesis/);
	});

	it('prompts an empty heading in HIRAC, and nowhere else', () => {
		expect(at('## Overview\n\nText.\n\n## |', HIRAC)).toMatch(/^Heading: sum up the issue/);
		expect(at('## |', IRAC)).toBeNull();
	});

	it('shows nothing on a line with text, in footnotes, code, comments or frontmatter', () => {
		expect(at('## Issue\n\nSome text|')).toBeNull();
		expect(at('## Issue\n\nText.[^1]\n\n[^1]: |')).toBeNull();
		expect(at('## Issue\n\n```\n|\n```')).toBeNull();
		expect(at('## Issue\n\n%%\n|\n%%')).toBeNull();
		expect(at('---\naglc-prompts: irac\n|\n---\n')).toBeNull();
	});

	it('ignores headings inside code', () => {
		// The heading in the code block is not a heading, and the code block is not a paragraph.
		expect(at('## Issue\n\n```\n## Rule\n```\n\n|')).toMatch(/^Issue: frame it/);
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

	it('gives every outline heading the prompt meant for it', () => {
		const md = outline(IRAC, 'T');
		const cursorAfter = (h: string) => md.indexOf('\n', md.indexOf(h)) + 1;
		expect(promptAt(md, cursorAfter('### Rule'), IRAC)).toMatch(/^Rule:/);
		expect(promptAt(md, cursorAfter('## Overall conclusion'), IRAC)).toMatch(/^Bring the issues together/);
	});
});

describe('paragraph prompts: custom sets', () => {
	const note = [
		'---', 'aglc-prompt-set: My IPAC', 'aglc-prompt-kind: problem', '---', '',
		'Notes about the set are ignored.', '',
		'## Issue (each issue)', '- State the issue.', '- Any sub-issues.', '',
		'## Principle | Law (each issue)', '- The principle, with authority.', '',
		'## Background (optional)', '- Some background.', '',
		'## Body', '- A paragraph.', '',
	].join('\n');

	it('reads sections, alternative headings, markers and body prompts from a note', () => {
		const set = parseCustomSet('Prompts/IPAC.md', { 'aglc-prompt-set': 'My IPAC', 'aglc-prompt-kind': 'problem' }, note)!;
		expect(set.name).toBe('My IPAC');
		expect(set.kind).toBe('problem');
		expect(set.custom).toBe(true);
		expect(set.sections.map((s) => s.name)).toEqual(['Issue', 'Principle', 'Background']);
		expect(set.sections[0]).toMatchObject({ prompts: ['State the issue.', 'Any sub-issues.'], perIssue: true });
		expect(set.sections[1]!.aliases).toEqual(['principle', 'law']);
		expect(set.sections[2]!.optional).toBe(true);
		expect(set.body).toEqual(['A paragraph.']);
		expect(promptAt('## Law\n\n', 9, set)).toBe('The principle, with authority.');
		expect(findSet('my ipac', [set])).toBe(set);
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
