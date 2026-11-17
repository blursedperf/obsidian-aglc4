import { describe, expect, it } from 'vitest';
import { analyseFootnote } from '../src/aglc/citation';
import { applyFixes } from '../src/aglc/document';
import { lintFootnote } from '../src/aglc/lint';
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
			'This point was not argued before the trial judge, and the Full Court declined to consider it.',
			'Section 5 of the Act was repealed in 2010.',
			'The judge used the expression \'. . . reasonable\' in passing.',
		]);
		const unrecognised = VALID.filter((t) => !prose.has(t) && analyseFootnote(t).segments.some((s) => s.kind === null));
		expect(unrecognised).toEqual([]);
	});
});
