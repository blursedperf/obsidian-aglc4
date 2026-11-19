import { describe, expect, it } from 'vitest';
import { analyseFootnote, applyFixes, lintFootnote } from '@legal-core/aglc';
import { INVALID, VALID } from './corpus';

const issuesOf = (t: string) => [...analyseFootnote(t).issues, ...lintFootnote(t)];

describe('AGLC4 corpus', () => {
	it.each(VALID)('accepts %s', (t) => {
		expect(issuesOf(t).map((i) => `${i.rule}: ${i.message}`)).toEqual([]);
	});

	it.each(INVALID)('flags %s', (t, rule) => {
		expect(issuesOf(t).map((i) => i.rule)).toContain(rule);
	});

	it.each(INVALID.filter(([t, rule]) => issuesOf(t).some((i) => i.rule === rule && i.fix)))('fixes %s', (t, rule) => {
		const before = issuesOf(t);
		const fixed = applyFixes(t, before.filter((i) => i.rule === rule)).text;
		const after = issuesOf(fixed);
		expect(after.map((i) => i.rule)).not.toContain(rule);
		// The fix must not introduce new errors.
		const errorsBefore = new Set(before.filter((i) => i.severity === 'error').map((i) => i.rule));
		expect([fixed, after.filter((i) => i.severity === 'error' && !errorsBefore.has(i.rule)).map((i) => i.rule)]).toEqual([fixed, []]);
	});

	it('recognises every citation in the valid corpus', () => {
		const prose = new Set([
			'But what of the second proposition, namely, that Mr Ford was benefited by the receipt of the means of obtaining goods and services that he genuinely and subjectively desired?',
			'This point was not argued before the trial judge, and the Full Court declined to consider it.',
			'Section 5 of the Act was repealed in 2010.',
			'The hearings ran on 21–22 September 2001, in the 2001–02 financial year.',
			'The Court said that it ‘must be examinable … at the ballot box’.',
		]);
		// Footnotes mixing citations with discursive sentences: every citation sentence must be recognised.
		const mixed = (t: string) => /\. (?:There|Later) /.test(t);
		const unrecognised = VALID.filter((t) => !prose.has(t) && !mixed(t) && analyseFootnote(t).segments.some((s) => s.kind === null));
		expect(unrecognised).toEqual([]);
	});
});
