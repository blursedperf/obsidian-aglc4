/**
 * Page geometry and paragraph styles shared by the Word export and the page preview, so that the preview
 * paginates the document Word will see. All measurements are in points.
 *
 * Word's line height for "multiple" line spacing is the font's line height (ascent + descent + line gap
 * from its hhea table, as a fraction of the em) times the font size times the multiple. For Times New
 * Roman that fraction is 2355/2048 = 1.1499, which matched Word's own PDF output to within 0.3pt.
 */
import type { HeadingScheme } from './headings';

export const PAGE = {
	/** A4 */
	width: 595.28,
	height: 841.89,
	/** One inch on every side, Word's default. */
	margin: 72,
} as const;

export const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;
export const CONTENT_HEIGHT = PAGE.height - 2 * PAGE.margin;

/** Line height as a fraction of the font size, for fonts whose metrics are known. */
const LINE_FACTORS: Record<string, number> = {
	'times new roman': 2355 / 2048,
	'liberation serif': 2355 / 2048,
	'tinos': 2355 / 2048,
	'arial': 2355 / 2048,
	'liberation sans': 2355 / 2048,
	'arimo': 2355 / 2048,
	'calibri': 2500 / 2048,
	'carlito': 2500 / 2048,
	'cambria': 2400 / 2048,
	'caladea': 2400 / 2048,
	'georgia': 2327 / 2048,
	'garamond': 2290 / 2048,
	'aptos': 2489 / 2048,
};

/** Metric-compatible fonts to fall back on where the Word font is not installed (eg Linux). */
const FALLBACKS: Record<string, string[]> = {
	'times new roman': ['Liberation Serif', 'Tinos'],
	'arial': ['Liberation Sans', 'Arimo'],
	'calibri': ['Carlito'],
	'cambria': ['Caladea'],
	'courier new': ['Liberation Mono', 'Cousine'],
};

export function lineFactor(font: string): number {
	return LINE_FACTORS[font.trim().toLowerCase()] ?? 1.15;
}

/** CSS font-family list for a Word font, with metric-compatible substitutes. */
export function cssFontFamily(font: string): string {
	const extra = FALLBACKS[font.trim().toLowerCase()] ?? [];
	return [font, ...extra].map((f) => `"${f}"`).join(', ') + ', serif';
}

export interface ParaStyle {
	/** Font size. */
	size: number;
	/** Line spacing multiple (1, 1.5, 2). */
	multiple: number;
	before: number;
	after: number;
	bold?: boolean;
	italic?: boolean;
	center?: boolean;
	/** Keep on the same page as the next paragraph (headings). */
	keepNext?: boolean;
	/** Do not split across pages (headings). */
	keepLines?: boolean;
	smallCaps?: boolean;
	/** For numbered headings: the number is set upright even when the heading is italic. */
	uprightNumber?: boolean;
}

export interface LayoutOptions {
	font: string;
	fontSize: number;
	footnoteSize: number;
	lineSpacing: number;
	headingScheme?: HeadingScheme;
	/** Keep each footnote whole on one page rather than continuing it on the next. */
	keepFootnotesTogether?: boolean;
}

export interface Styles {
	body: ParaStyle;
	footnote: ParaStyle;
	/** Long quotations (block quotes): AGLC4 sets them indented in a smaller font, without quotation marks. */
	quote: ParaStyle;
	/** Headings 1–6. */
	headings: ParaStyle[];
	title: ParaStyle;
	/** Height of the footnote separator, which Word lays out as a single-spaced body-size paragraph. */
	separator: number;
	/** Indent of block quotations and each list level. */
	indent: number;
	/** Hanging indent of list markers. */
	hanging: number;
}

export function styles(o: LayoutOptions): Styles {
	const heading = (size: number, before: number, after: number, extra: Partial<ParaStyle>): ParaStyle => ({
		size, multiple: o.lineSpacing, before, after, keepNext: true, keepLines: true, ...extra,
	});
	return {
		body: { size: o.fontSize, multiple: o.lineSpacing, before: 0, after: 6 },
		quote: { size: o.fontSize - 1, multiple: o.lineSpacing, before: 0, after: 6 },
		footnote: { size: o.footnoteSize, multiple: 1, before: 0, after: 0 },
		headings: o.headingScheme === 'aglc' ? [
			// AGLC4, at body size:
			// I    numeral upright; heading in large and small capitals; centred
			heading(o.fontSize, 12, 6, { smallCaps: true, center: true }),
			// A    letter upright; heading italic; centred
			heading(o.fontSize, 12, 6, { italic: true, uprightNumber: true, center: true }),
			// 1    numeral upright; heading italic; left-aligned
			heading(o.fontSize, 12, 6, { italic: true, uprightNumber: true }),
			// (a)  letter and heading italic; left-aligned
			heading(o.fontSize, 12, 6, { italic: true }),
			// (i)  numeral and heading italic; left-aligned
			heading(o.fontSize, 12, 6, { italic: true }),
			// Below level five: unnumbered, italic, left-aligned
			heading(o.fontSize, 12, 6, { italic: true }),
		] : [
			heading(o.fontSize + 4, 12, 6, { bold: true }),
			heading(o.fontSize + 2, 12, 6, { bold: true }),
			heading(o.fontSize, 10, 5, { bold: true, italic: true }),
			heading(o.fontSize, 10, 5, { italic: true }),
			heading(o.fontSize, 10, 5, { italic: true }),
			heading(o.fontSize, 10, 5, { italic: true }),
		],
		title: { size: o.fontSize + 6, multiple: o.lineSpacing, before: 0, after: 12, bold: true, center: true, keepNext: true, keepLines: true },
		separator: o.fontSize * lineFactor(o.font),
		indent: 36,
		hanging: 18,
	};
}

/**
 * With "Keep footnotes on one page", a footnote of at most this many lines is kept whole on the page of
 * its reference (the line citing it moves to the next page with it). A longer footnote may continue on
 * the next page, as Word does by default, so it does not leave a large gap at the bottom of a page.
 */
export const KEEP_TOGETHER_MAX_LINES = 2;

/**
 * Average width of a character as a fraction of the font size, for estimating how many lines a footnote
 * takes. The Word export cannot measure lines, so the export and the page preview both use this
 * estimate, which keeps them in agreement.
 */
const AVERAGE_CHARACTER_EM = 0.5;

/** Estimated lines of footnote text, given each paragraph's text, at the footnote size. */
export function estimatedFootnoteLines(paragraphs: string[], footnoteSize: number): number {
	const perLine = Math.max(1, Math.floor(CONTENT_WIDTH / (footnoteSize * AVERAGE_CHARACTER_EM)));
	// The first paragraph starts with the footnote number and a space.
	return paragraphs.reduce((n, text, i) => n + Math.max(1, Math.ceil((text.length + (i === 0 ? 3 : 0)) / perLine)), 0);
}

/** Whether a footnote is kept whole on one page: the setting is on, and the footnote is short. */
export function keepFootnoteTogether(paragraphs: string[], o: Pick<LayoutOptions, 'keepFootnotesTogether' | 'footnoteSize'>): boolean {
	return o.keepFootnotesTogether === true && estimatedFootnoteLines(paragraphs, o.footnoteSize) <= KEEP_TOGETHER_MAX_LINES;
}

/** Height of one line of a paragraph style. */
export function lineHeight(style: ParaStyle, font: string): number {
	return style.size * lineFactor(font) * style.multiple;
}

/** Separates a heading's number from its text: a space that keeps the number on the heading's line. */
export const NUMBER_SPACE = '\u00a0';

/** Points to twentieths of a point, Word's unit for spacing and indents. */
export const twips = (pt: number): number => Math.round(pt * 20);
