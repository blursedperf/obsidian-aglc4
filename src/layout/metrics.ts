/**
 * Page geometry and paragraph styles shared by the Word export and the page preview, so that the preview
 * paginates the document Word will see. All measurements are in points.
 *
 * Word's line height for "multiple" line spacing is the font's line height (ascent + descent + line gap
 * from its hhea table, as a fraction of the em) times the font size times the multiple. For Times New
 * Roman that fraction is 2355/2048 = 1.1499, which matched Word's own PDF output to within 0.3pt.
 */

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
}

export interface LayoutOptions {
	font: string;
	fontSize: number;
	footnoteSize: number;
	lineSpacing: number;
}

export interface Styles {
	body: ParaStyle;
	footnote: ParaStyle;
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
		footnote: { size: o.footnoteSize, multiple: 1, before: 0, after: 0 },
		headings: [
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

/** Height of one line of a paragraph style. */
export function lineHeight(style: ParaStyle, font: string): number {
	return style.size * lineFactor(font) * style.multiple;
}

/** Points to twentieths of a point, Word's unit for spacing and indents. */
export const twips = (pt: number): number => Math.round(pt * 20);
