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

[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 30; see Jane Smith, 'It's a Title' (2004) 28(1) Melbourne University Law Review 1 <https://example.org>.
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
	it('creates real footnotes with formatting', async () => {
		const r = await exportDocx(NOTE, { ...DEFAULT_EXPORT, title: 'Test' });
		expect(r.footnotes).toBe(2);
		const zip = await JSZip.loadAsync(r.data);
		const footnotes = await zip.file('word/footnotes.xml')!.async('string');
		const document = await zip.file('word/document.xml')!.async('string');
		expect(document).toContain('w:footnoteReference');
		expect(footnotes).toContain('Mabo v Queensland (No 2)');
		expect(footnotes).toContain('Western Australia v Ward');
		// Case name is italic in the footnote.
		expect(footnotes).toMatch(/<w:i\/>[\s\S]*?Mabo v Queensland/);
		expect(footnotes).toContain('‘It’s a Title’');
		expect(footnotes).toContain('&lt;');
		expect(document).not.toContain('[^1]');
		// Each footnote's number is followed by a space, as Word inserts it.
		expect((footnotes.match(/<w:footnoteRef\/><\/w:r><w:r><w:t xml:space="preserve"> <\/w:t><\/w:r>/g) ?? []).length).toBe(2);
		// Footnotes are kept whole on one page by default.
		const styles = await zip.file('word/styles.xml')!.async('string');
		expect(/<w:style [^>]*w:styleId="FootnoteText"[\s\S]*?<\/w:style>/.exec(styles)![0]).toContain('<w:keepLines/>');
				// Footnotes use the 10pt single-spaced footnote style, not the body style.
		expect((footnotes.match(/<w:pStyle w:val="FootnoteText"\/>/g) ?? []).length).toBe(2);
	});
});

describe('HTML export', () => {
	it('lists footnotes at the bottom in order', () => {
		const { html, footnotes } = exportHtml(NOTE, { ...DEFAULT_EXPORT, title: 'Test' });
		expect(footnotes).toBe(2);
		expect(html.indexOf('id="fn1"')).toBeLessThan(html.indexOf('id="fn2"'));
		expect(html).toContain('<em>Mabo v Queensland (No 2)</em>');
		expect(html).toContain('&lt;<a href="https://example.org">https://example.org</a>&gt;');
	});
});
