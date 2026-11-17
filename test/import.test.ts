import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { analyseDocument } from '../src/aglc/document';
import { DEFAULT_EXPORT, exportDocx } from '../src/export/docx';
import { cleanTarget, importDocx, levelFromStyleName } from '../src/import/docx';
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

[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 42 (Brennan J).
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
		expect(r.markdown).toContain('[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 42 (Brennan J).');
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
		const endnotes = `<?xml version="1.0"?><w:endnotes ${w}><w:endnote w:type="separator" w:id="0"><w:p/></w:endnote><w:endnote w:id="2"><w:p><w:r><w:endnoteRef/></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Mabo v Queensland [No 2]</w:t></w:r><w:r><w:t xml:space="preserve"> (1992) 175 CLR 1.</w:t></w:r></w:p></w:endnote></w:endnotes>`;
		const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.hcourt.gov.au/" TargetMode="External"/></Relationships>`;
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
			'[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1.',
			'',
		].join('\n'));
		expect(r.numberedHeadings).toBe(2);
		expect(r.warnings.join(' ')).toMatch(/deletions/);
		expect(r.warnings.join(' ')).toMatch(/Endnotes/);
	});

	const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
	const docx = (body: string, styles = '') => zipSync({
		'word/document.xml': strToU8(`<?xml version="1.0"?><w:document ${W_NS}><w:body>${body}</w:body></w:document>`),
		'word/styles.xml': strToU8(`<?xml version="1.0"?><w:styles ${W_NS}>${styles}</w:styles>`),
	});
	const para = (text: string, pPr = '', rPr = '') => `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

	it('reads heading levels from custom style names, nearest style first', () => {
		// Modelled on a law-school template: H1 and H2 styles are based on an italic "H3" style, which is
		// based on the body style, and the title style on Heading 1.
		const styles = `
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
<w:style w:type="paragraph" w:styleId="LawTitle"><w:name w:val="Law Title"/><w:basedOn w:val="Heading1"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:caps/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="LawPara"><w:name w:val="Law Para"/></w:style>
<w:style w:type="paragraph" w:styleId="LawH3num"><w:name w:val="Law H3~ num"/><w:basedOn w:val="LawPara"/><w:rPr><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="LawH2let"><w:name w:val="Law H2 let"/><w:basedOn w:val="LawH3num"/><w:pPr><w:jc w:val="center"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="LawH1rome"><w:name w:val="Law H1 rome"/><w:basedOn w:val="LawH3num"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:i w:val="0"/><w:smallCaps/></w:rPr></w:style>`;
		const st = (id: string) => `<w:pStyle w:val="${id}"/>`;
		const body = [
			para('My essay', st('LawTitle')),
			para('Opening words.', st('LawPara')),
			para('I Introduction', st('LawH1rome')),
			para('Body.', st('LawPara')),
			para('A First Point', st('LawH2let')),
			para('B Second Point', st('LawH2let')),
			para('1 Detail', st('LawH3num')),
			para('II Conclusion', st('LawH1rome')),
		].join('');
		const r = importDocx(docx(body, styles));
		expect(r.markdown.split('\n').filter((l) => l.startsWith('#'))).toEqual([
			'# My essay', '## Introduction', '### First Point', '### Second Point', '#### Detail', '## Conclusion',
		]);
		expect(r.markdown).toContain('Opening words.\n\n## Introduction\n\nBody.');
		expect(r.numberedHeadings).toBe(5);
	});

	it('recognises AGLC4 headings formatted by hand', () => {
		const centre = '<w:jc w:val="center"/>';
		const body = [
			para('I', centre, '<w:smallCaps/>').replace('</w:p>', '') + `<w:r><w:rPr><w:smallCaps/></w:rPr><w:t xml:space="preserve"> Introduction</w:t></w:r></w:p>`,
			para('Text.'),
			para('A Background', centre, '<w:i/>'),
			para('1 Scope', '', '<w:i/>'),
			para('(a) Detail', '', '<w:i/>'),
			para('(i) Finer detail', '', '<w:i/>'),
			para('1 apple and 2 pears are on the table.'),
		].join('');
		const r = importDocx(docx(body));
		expect(r.markdown.split('\n').filter((l) => l.startsWith('#'))).toEqual([
			'# Introduction', '## Background', '### Scope', '#### Detail', '##### Finer detail',
		]);
		expect(r.markdown).toContain('1 apple and 2 pears are on the table.');
	});

	it('keeps a leading word that only looks like a number when headings are not numbered', () => {
		const styles = '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>';
		const body = [para('A New Approach', '<w:pStyle w:val="Heading2"/>'), para('Text.'), para('Further Thoughts', '<w:pStyle w:val="Heading2"/>')].join('');
		const r = importDocx(docx(body, styles));
		expect(r.markdown).toContain('## A New Approach');
		expect(r.numberedHeadings).toBe(0);
	});

	it('reads levels from style names', () => {
		const cases: [string, number | null][] = [
			['heading 2', 2], ['Law H2 let', 2], ['AGLC Heading 3', 3], ['Law H3~ num', 3], ['Law Title', 0], ['Title', 0],
			['Subtitle', null], ['Normal', null], ['TOC Heading', null], ['toc 1', null], ['HTML Preformatted', null], ['List Paragraph', null],
		];
		for (const [name, level] of cases) expect([name, levelFromStyleName(name)]).toEqual([name, level]);
	});

	it('reads footnote links from the footnotes\' own link list, keeping AGLC4 angle brackets', () => {
		const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
		const rel = (type: string, target: string) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/></Relationships>`;
		const zip = zipSync({
			'word/document.xml': strToU8(`<w:document ${ns}><w:body><w:p><w:r><w:t>Text.</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p></w:body></w:document>`),
			'word/footnotes.xml': strToU8(`<w:footnotes ${ns}><w:footnote w:id="1"><w:p><w:r><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Department of Health, </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Review</w:t></w:r><w:r><w:t xml:space="preserve"> (Issues Paper, 26 May 2026) &lt;</w:t></w:r><w:hyperlink r:id="rId1"><w:r><w:t>https://example.gov.au/review.pdf&gt;</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> (‘</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Review</w:t></w:r><w:r><w:t>’).</w:t></w:r></w:p></w:footnote></w:footnotes>`),
			// The same ID means something else in the main document's list.
			'word/_rels/document.xml.rels': strToU8(rel('customXml', '../customXml/item1.xml')),
			'word/_rels/footnotes.xml.rels': strToU8(rel('hyperlink', 'https://example.gov.au/review.pdf%3e')),
		});
		const r = importDocx(zip);
		expect(r.markdown).toContain('[^1]: Department of Health, *Review* (Issues Paper, 26 May 2026) <https://example.gov.au/review.pdf> (‘*Review*’).');
		expect(analyseDocument(r.markdown).issues).toEqual([]);
	});

	it('cleans link targets', () => {
		expect(cleanTarget('https://a.org/x%3e')).toBe('https://a.org/x');
		expect(cleanTarget('<https://a.org/x>')).toBe('https://a.org/x');
		expect(cleanTarget('../customXml/item1.xml')).toBeNull();
		expect(cleanTarget('#_Toc123')).toBeNull();
		expect(cleanTarget('mailto:a@b.org')).toBe('mailto:a@b.org');
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

	it('formats Word headings as the AGLC4 table sets out', async () => {
		const { data } = await exportDocx('## One\n\n### Two\n\n#### Three\n\n##### Four\n\n###### Five\n', { ...DEFAULT_EXPORT, headingScheme: 'aglc', aglcTopLevel: 'h2' });
		const files = unzipSync(new Uint8Array(data));
		const styles = strFromU8(files['word/styles.xml']!);
		const doc = strFromU8(files['word/document.xml']!);
		const style = (id: string) => new RegExp(`<w:style [^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`).exec(styles)![0];
		// Level one: centred, large and small capitals, not italic.
		expect(style('Heading1')).toContain('<w:jc w:val="center"/>');
		expect(style('Heading1')).toContain('<w:smallCaps/>');
		expect(style('Heading1')).not.toContain('<w:i/>');
		// Level two: centred italics; levels three to five: left-aligned italics.
		expect(style('Heading2')).toContain('<w:jc w:val="center"/>');
		for (const id of ['Heading2', 'Heading3', 'Heading4', 'Heading5']) expect(style(id)).toContain('<w:i/>');
		for (const id of ['Heading3', 'Heading4', 'Heading5']) expect(style(id)).not.toContain('<w:jc ');
		// Numbers: upright for levels two and three (italics switched off), italic for four and five.
		const numberRun = (n: string) => new RegExp(`<w:r>(?:(?!</w:r>).)*?<w:t[^>]*>${n.replace(/[()]/g, '\\$&')}\u00a0</w:t></w:r>`).exec(doc)![0];
		expect(numberRun('A')).toContain('<w:i w:val="false"/>');
		expect(numberRun('1')).toContain('<w:i w:val="false"/>');
		expect(numberRun('(a)')).not.toContain('<w:i');
		expect(numberRun('(i)')).not.toContain('<w:i');
	});

	it('exports numbered AGLC4 headings to Word', async () => {
		const { data } = await exportDocx('# Essay\n\n## Introduction\n\n### Background\n', { ...DEFAULT_EXPORT, headingScheme: 'aglc', aglcTopLevel: 'auto' });
		const r = importDocx(new Uint8Array(data));
		// The importer removes the numbers again (they were typed as text with a tab).
		expect(r.markdown).toBe('# Essay\n\n## Introduction\n\n### Background\n');
		expect(r.numberedHeadings).toBe(2);
	});
});
