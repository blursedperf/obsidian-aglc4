import { describe, expect, it } from 'vitest';
import { type PBlock, type PNote, paginate } from '../src/layout/paginate';

const para = (lines: number, extra: Partial<PBlock> = {}): PBlock => ({ lines, lineHeight: 10, spaceBefore: 0, spaceAfter: 0, refs: [], ...extra });
const note = (lines: number): PNote => ({ lines, lineHeight: 5 });
const geo = { contentHeight: 100, separator: 10 };
/** Lines of each block on each page, eg [[0, 0, 10]] = block 0 lines 0–10. */
const layout = (blocks: PBlock[], notes: PNote[] = [], g = geo) =>
	paginate(blocks, notes, g).map((p) => p.body.map((s) => [s.block, s.from, s.to]));

describe('pagination', () => {
	it('fills pages with whole lines', () => {
		expect(layout([para(25)])).toEqual([[[0, 0, 10]], [[0, 10, 20]], [[0, 20, 25]]]);
	});

	it('requires a line to fit completely', () => {
		expect(layout([para(10)], [], { ...geo, contentHeight: 99 })).toEqual([[[0, 0, 8]], [[0, 8, 10]]]);
	});

	it('uses the larger of space after and space before', () => {
		const pages = paginate([para(2, { spaceAfter: 6 }), para(2, { spaceBefore: 12 })], [], geo);
		expect(pages[0]!.body[1]!.y).toBe(20 + 12);
	});

	it('suppresses space before at the top of later pages but not the first', () => {
		const pages = paginate([para(1, { spaceBefore: 12 }), para(8), para(3, { spaceBefore: 12 })], [], geo);
		expect(pages[0]!.body[0]!.y).toBe(12);
		expect(pages[1]!.body[0]!.y).toBe(0);
	});

	it('moves a line to avoid a widow', () => {
		expect(layout([para(11)])).toEqual([[[0, 0, 9]], [[0, 9, 11]]]);
	});

	it('moves a paragraph to avoid an orphan', () => {
		expect(layout([para(9), para(5)])).toEqual([[[0, 0, 9]], [[1, 0, 5]]]);
	});

	it('keeps a heading with the next paragraph', () => {
		const heading = para(1, { keepNext: true, keepLines: true });
		expect(layout([para(8), heading, para(4)])).toEqual([[[0, 0, 8]], [[1, 0, 1], [2, 0, 4]]]);
	});

	it('places a footnote on the page of its reference, with the separator', () => {
		// Line 6 cites a 4-line footnote: 7 lines (70) + separator (10) + 20 = 100 fits; line 8 then cannot.
		const pages = paginate([para(10, { refs: [{ line: 6, note: 0 }] })], [note(4)], geo);
		expect(pages[0]!.body).toEqual([{ block: 0, from: 0, to: 7, y: 0 }]);
		expect(pages[0]!.notes).toEqual([{ note: 0, from: 0, to: 4, y: 0 }]);
		expect(pages[0]!.notesHeight).toBe(30);
	});

	it('continues a long footnote on the next page and keeps its reference', () => {
		// Line 2 cites a 20-line footnote: after 3 lines (30) and the separator (10), 12 lines fit.
		const pages = paginate([para(10, { refs: [{ line: 2, note: 0 }] })], [note(20)], geo);
		expect(pages[0]!.body).toEqual([{ block: 0, from: 0, to: 3, y: 0 }]);
		expect(pages[0]!.notes).toEqual([{ note: 0, from: 0, to: 12, y: 0 }]);
		expect(pages[1]!.continued).toBe(true);
		expect(pages[1]!.notes[0]).toEqual({ note: 0, from: 12, to: 20, y: 0 });
		// The continued footnote takes 8 × 5 + 10 = 50, leaving room for 5 body lines.
		expect(pages[1]!.body).toEqual([{ block: 0, from: 3, to: 8, y: 0 }]);
	});

	it('keeps a footnote whole by moving its reference to the next page', () => {
		// Line 5 cites a 14-line footnote (70, plus 10 for the separator). Under 6 lines (60) it would need
		// 140: rather than split it, line 5 and the footnote go to the next page.
		const pages = paginate([para(10, { refs: [{ line: 5, note: 0 }] })], [note(14)], { ...geo, keepNotesTogether: true });
		expect(pages[0]!.notes).toEqual([]);
		expect(pages[0]!.body).toEqual([{ block: 0, from: 0, to: 5, y: 0 }]);
		expect(pages[1]!.notes).toEqual([{ note: 0, from: 0, to: 14, y: 0 }]);
		expect(pages[1]!.continued).toBe(false);
	});

	it('still splits a footnote too long for any page', () => {
		const pages = paginate([para(4, { refs: [{ line: 1, note: 0 }] })], [note(30)], { ...geo, keepNotesTogether: true });
		expect(pages[0]!.notes[0]!.to).toBeLessThan(30);
		expect(pages[1]!.continued).toBe(true);
	});

	it('moves the reference when not even one footnote line fits', () => {
		// Line 8 cites a footnote; 9 lines (90) + separator (10) leaves no room for a footnote line.
		const pages = paginate([para(12, { refs: [{ line: 8, note: 0 }] })], [note(1)], geo);
		expect(pages[0]!.body[0]!.to).toBe(8);
		expect(pages[1]!.notes).toEqual([{ note: 0, from: 0, to: 1, y: 0 }]);
	});

	it('places a line that cannot fit anywhere rather than looping', () => {
		expect(layout([para(1, { lineHeight: 150 })]).length).toBe(1);
	});
});
