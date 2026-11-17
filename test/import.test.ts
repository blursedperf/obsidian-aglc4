import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { analyseDocument } from '../src/aglc/document';
import { DEFAULT_EXPORT, exportDocx } from '../src/export/docx';
import { importDocx } from '../src/import/docx';
import { applyHeadingScheme, numberHeadings } from '../src/layout/headings';
import { parseMarkdown } from '../src/export/markdown';

const NOTE = `# Native Title

## Introduction

The High Court rejected terra nullius.[^1] It was applied again.[^2] See the *Native Title Act*.[^3]

> A long quotation, indented and without quotation marks.

- first point
- second point with **bold**

1. numbered one
2. numbered two

[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 42 (Brennan J).
[^2]: Ibid 58.
[^3]: *Love v Commonwealth* [2020] HCA 3, [81]; Jane Smith, 'Title of Page' (Web Page, 1 May 2020) <https://example.org/a_b>.
`;

describe('Word import', () => {
	it('round-trips the plugin\'s own Word export', async () => {
		const { data } = await exportDocx(NOTE, { ...DEFAULT_EXPORT, smartQuotes: false });
		const r = importDocx(new Uint8Array(data));
		expect(r.footnotes).toBe(3);
		expect(r.markdown).toContain('# Native Title\n\n## Introduction');
		expect(r.markdown).toContain('The High Court rejected terra nullius.[^1] It was applied again.[^2] See the *Native Title Act*.[^3]');
		expect(r.markdown).toContain('> A long quotation, indented and without quotation marks.');
		expect(r.markdown).toContain('- first point\n- second point with **bold**');
		expect(r.markdown).toContain('1. numbered one\n1. numbered two');
		expect(r.markdown).toContain('[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 42 (Brennan J).');
		expect(r.markdown).toContain('[^2]: Ibid 58.');
		expect(r.markdown).toContain('[^3]: *Love v Commonwealth* [2020] HCA 3, [81]; Jane Smith, \'Title of Page\' (Web Page, 1 May 2020) <https://example.org/a_b>.');
		// The imported note checks clean.
		expect(analyseDocument(r.markdown).issues).toEqual([]);
	});

	it('handles fields, tracked changes, links, endnotes and numbered headings', () => {
		const w = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
		const doc = `<?xml version="1.0"?><w:document ${w}><w:body>
<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>My Essay</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>I</w:t></w:r><w:r><w:tab/><w:t>Introduction</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="7"/></w:numPr></w:pPr><w:r><w:t>Background</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Cited </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> ADDIN ZOTERO_ITEM {"citationID":"x"} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Mabo</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:del><w:r><w:delText>deleted</w:delText></w:r></w:del><w:ins><w:r><w:t xml:space="preserve"> here</w:t></w:r></w:ins><w:r><w:t>.</w:t></w:r><w:r><w:endnoteReference w:id="2"/></w:r><w:r><w:t xml:space="preserve"> See </w:t></w:r><w:hyperlink r:id="rId9"><w:r><w:t>the court</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> and 5 * 3 = 15 with snake_case.</w:t></w:r></w:p>
</w:body></w:document>`;
		const styles = `<?xml version="1.0"?><w:styles ${w}>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:i/></w:rPr></w:style>
</w:styles>`;
		const endnotes = `<?xml version="1.0"?><w:endnotes ${w}><w:endnote w:type="separator" w:id="0"><w:p/></w:endnote><w:endnote w:id="2"><w:p><w:r><w:endnoteRef/></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Mabo v Queensland (No 2)</w:t></w:r><w:r><w:t xml:space="preserve"> (1992) 175 CLR 1.</w:t></w:r></w:p></w:endnote></w:endnotes>`;
		const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="hyperlink" Target="https://www.hcourt.gov.au/" TargetMode="External"/></Relationships>`;
		const zip = zipSync({
			'word/document.xml': strToU8(doc),
			'word/styles.xml': strToU8(styles),
			'word/endnotes.xml': strToU8(endnotes),
			'word/_rels/document.xml.rels': strToU8(rels),
		});
		const r = importDocx(zip);
		expect(r.markdown).toBe([
			'# My Essay',
			'',
			'## Introduction',
			'',
			'### Background',
			'',
			'Cited *Mabo* here.[^1] See [the court](https://www.hcourt.gov.au/) and 5 \\* 3 = 15 with snake_case.',
			'',
			'[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1.',
			'',
		].join('\n'));
		expect(r.numberedHeadings).toBe(2);
		expect(r.warnings.join(' ')).toMatch(/deletions/);
		expect(r.warnings.join(' ')).toMatch(/Endnotes/);
	});

	it('rejects files that are not Word documents', () => {
		expect(() => importDocx(new Uint8Array([1, 2, 3]))).toThrow(/not a Word document/);
	});
});

describe('AGLC4 heading hierarchy', () => {
	it('numbers I, A, 1, (a), (i) and resets lower levels', () => {
		const n = numberHeadings([1, 2, 2, 3, 4, 5, 3, 1, 2], 'h1').map((h) => h.number);
		expect(n).toEqual(['I', 'A', 'B', '1', '(a)', '(i)', '2', 'II', 'A']);
	});

	it('treats a single opening # heading as the title', () => {
		const n = numberHeadings([1, 2, 3, 2], 'auto');
		expect(n.map((h) => h.title)).toEqual([true, false, false, false]);
		expect(n.map((h) => h.number)).toEqual([null, 'I', 'A', 'II']);
		expect(numberHeadings([1, 1], 'auto').map((h) => h.number)).toEqual(['I', 'II']);
	});

	it('removes typed numbers so they are not doubled', () => {
		const doc = applyHeadingScheme(parseMarkdown('## I\tIntroduction\n\n## A New Approach\n'), 'aglc', 'h2');
		const hs = doc.blocks.filter((b) => b.t === 'heading');
		expect(hs.map((h) => h.t === 'heading' && h.c[0]!.t === 'text' ? h.c[0]!.v : '')).toEqual(['Introduction', 'A New Approach']);
		expect(hs.map((h) => h.t === 'heading' ? h.number : '')).toEqual(['I', 'II']);
	});

	it('exports numbered AGLC4 headings to Word', async () => {
		const { data } = await exportDocx('# Essay\n\n## Introduction\n\n### Background\n', { ...DEFAULT_EXPORT, headingScheme: 'aglc', aglcTopLevel: 'auto' });
		const r = importDocx(new Uint8Array(data));
		// The importer removes the numbers again (they were typed as text with a tab).
		expect(r.markdown).toBe('# Essay\n\n## Introduction\n\n### Background\n');
		expect(r.numberedHeadings).toBe(2);
	});
});
