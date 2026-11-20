import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { DEFAULT_EXPORT, exportDocx } from '../src/export/docx';
import { exportHtml } from '../src/export/html';
import { parseInline, plainText, smartenQuotes } from '../src/export/markdown';

const NOTE = `---
title: Test
---
# Native Title

The High Court recognised native title.[^1] It later considered extinguishment.^[*Western Australia v Ward* (2002) 213 CLR 1.]

> A long quotation of three or more lines is indented.

- point one
- point two

[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 30; see Jane Smith, 'It's a Title' (2004) 28(1) *Melbourne University Law Review* 1 <https://example.org>.
`;

describe('markdown inline parsing', () => {
	it('italics, bold and nesting', () => {
		expect(parseInline('a *b* **c** ***d***')).toEqual([
			{ t: 'text', v: 'a ' }, { t: 'em', c: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' ' },
			{ t: 'strong', c: [{ t: 'text', v: 'c' }] }, { t: 'text', v: ' ' },
			{ t: 'strong', c: [{ t: 'em', c: [{ t: 'text', v: 'd' }] }] },
		]);
	});
	it('intraword underscores are literal', () => {
		expect(plainText(parseInline('snake_case_name'))).toBe('snake_case_name');
	});
	it('keeps AGLC angle-bracket URLs', () => {
		expect(plainText(parseInline('Page <https://x.org/a>.'))).toBe('Page <https://x.org/a>.');
	});
	it('smart quotes across italics and apostrophes', () => {
		const nodes = smartenQuotes(parseInline('\'*Mabo*\' and Smith\'s \'title\''));
		expect(plainText(nodes)).toBe('‘Mabo’ and Smith’s ‘title’');
	});
});

describe('Word export', () => {
	it('turns off widow and orphan control for the first paragraph after a heading only', async () => {
		const md = '## Part one\n\nFirst after the heading.[^1]\n\nSecond paragraph.\n\n### A sub-part\n\n## Part two\n\nFirst after two headings.\n\n[^1]: A footnote.\n';
		const r = await exportDocx(md, DEFAULT_EXPORT);
		const zip = await JSZip.loadAsync(r.data);
		const document = await zip.file('word/document.xml')!.async('string');
		const paras = [...document.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map((m) => m[1]!);
		const widow = (text: string) => {
			const p = paras.find((x) => x.includes(text))!;
			return /<w:widowControl\/>|<w:widowControl w:val="(?:true|1|on)"\/>/.test(p) ? 'on' : 'off';
		};
		expect(widow('First after the heading.')).toBe('off');
		expect(widow('Second paragraph.')).toBe('on');
		expect(widow('First after two headings.')).toBe('off');
		// Footnotes keep it on: their paragraphs are built inside the text's first paragraph.
		const footnotes = await zip.file('word/footnotes.xml')!.async('string');
		expect(footnotes.match(/<w:p>[\s\S]*?A footnote\.[\s\S]*?<\/w:p>/)![0]).toMatch(/<w:widowControl\/>/);
	});

	it('creates real footnotes with formatting', async () => {
		const r = await exportDocx(NOTE, { ...DEFAULT_EXPORT, title: 'Test' });
		expect(r.footnotes).toBe(2);
		const zip = await JSZip.loadAsync(r.data);
		const footnotes = await zip.file('word/footnotes.xml')!.async('string');
		const document = await zip.file('word/document.xml')!.async('string');
		expect(document).toContain('w:footnoteReference');
		expect(footnotes).toContain('Mabo v Queensland [No 2]');
		expect(footnotes).toContain('Western Australia v Ward');
		// Case name is italic in the footnote.
		expect(footnotes).toMatch(/<w:i\/>[\s\S]*?Mabo v Queensland/);
		expect(footnotes).toContain('‘It’s a Title’');
		expect(footnotes).toContain('&lt;');
		expect(document).not.toContain('[^1]');
		// Each footnote's number is followed by a space, as Word inserts it.
		expect((footnotes.match(/<w:footnoteRef\/><\/w:r><w:r><w:t xml:space="preserve"> <\/w:t><\/w:r>/g) ?? []).length).toBe(2);
		const styles = await zip.file('word/styles.xml')!.async('string');
		// Long quotations: indented and a point smaller than the body (AGLC4).
		expect(/<w:style [^>]*w:styleId="AglcQuote"[\s\S]*?<\/w:style>/.exec(styles)?.[0] ?? '').toContain('<w:sz w:val="22"/>');
		expect(document).toContain('<w:pStyle w:val="AglcQuote"/>');
		// Footnotes are kept whole on one page by default.
		// Short footnotes are kept whole on one page by default, on their own paragraphs, not by the style
		// (so long footnotes can continue on the next page, leaving no large gap).
		expect(/<w:style [^>]*w:styleId="FootnoteText"[\s\S]*?<\/w:style>/.exec(styles)![0]).not.toContain('<w:keepLines/>');
		expect(footnotes).toContain('<w:keepLines/>');
				// Footnotes use the 10pt single-spaced footnote style, not the body style.
		expect((footnotes.match(/<w:pStyle w:val="FootnoteText"\/>/g) ?? []).length).toBe(2);
	});
});

describe('HTML export', () => {
	it('lists footnotes at the bottom in order', () => {
		const { html, footnotes } = exportHtml(NOTE, { ...DEFAULT_EXPORT, title: 'Test' });
		expect(footnotes).toBe(2);
		expect(html.indexOf('id="fn1"')).toBeLessThan(html.indexOf('id="fn2"'));
		expect(html).toContain('<em>Mabo v Queensland [No 2]</em>');
		expect(html).toContain('&lt;<a href="https://example.org">https://example.org</a>&gt;');
	});
});

describe('keeping footnotes on one page', () => {
	it('keeps a footnote of up to two lines whole, and lets a longer one continue on the next page', async () => {
		const { estimatedFootnoteLines, keepFootnoteTogether, KEEP_TOGETHER_MAX_LINES } = await import('../src/layout/metrics');
		expect(KEEP_TOGETHER_MAX_LINES).toBe(2);
		const at10 = { keepFootnotesTogether: true, footnoteSize: 10 };
		expect(estimatedFootnoteLines(['x'.repeat(80)], 10)).toBe(1);
		expect(estimatedFootnoteLines(['x'.repeat(170)], 10)).toBe(2);
		expect(estimatedFootnoteLines(['x'.repeat(200)], 10)).toBe(3);
		expect(estimatedFootnoteLines(['one', 'two'], 10)).toBe(2);
		expect(keepFootnoteTogether(['x'.repeat(170)], at10)).toBe(true);
		expect(keepFootnoteTogether(['x'.repeat(200)], at10)).toBe(false);
		expect(keepFootnoteTogether(['short'], { ...at10, keepFootnotesTogether: false })).toBe(false);
		// A larger footnote size fits fewer characters on a line.
		expect(keepFootnoteTogether(['x'.repeat(170)], { ...at10, footnoteSize: 12 })).toBe(false);

		const url = 'Jane Smith, \'Title of Page\' (Web Page, 1 May 2020) <https://example.org/a/long/address/that/runs/on/to/a/second/line>.';
		const long = `${'A long discursive footnote, which runs on for several lines. '.repeat(6)}`;
		const r = await exportDocx(`One.[^1] Two.[^2]\n\n[^1]: ${url}\n[^2]: ${long}\n`, { ...DEFAULT_EXPORT, title: 'T' });
		const footnotes = await (await JSZip.loadAsync(r.data)).file('word/footnotes.xml')!.async('string');
		const notes = [...footnotes.matchAll(/<w:footnote w:id="([12])">[\s\S]*?<\/w:footnote>/g)].map((m) => m[0]);
		expect(notes[0]).toContain('<w:keepLines/>');
		expect(notes[1]).not.toContain('<w:keepLines/>');
	});
});

