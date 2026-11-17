/**
 * Standalone HTML export: the note with its footnotes numbered and listed at the bottom, styled for
 * print. Opening it in a browser and printing gives a PDF with the footnotes at the end of the document;
 * for footnotes at the bottom of each page use the Word export.
 */
import { prepare, type ExportOptions } from './docx';
import { type Block, type Inline, type MdDocument, parseMarkdown } from './markdown';

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

class HtmlBuilder {
	readonly notes: string[] = [];

	constructor(private doc: MdDocument) {}

	inline(nodes: Inline[], inFootnote = false): string {
		return nodes.map((n) => {
			switch (n.t) {
				case 'text': return esc(n.v);
				case 'br': return '<br>';
				case 'code': return `<code>${esc(n.v)}</code>`;
				case 'em': return `<em>${this.inline(n.c, inFootnote)}</em>`;
				case 'strong': return `<strong>${this.inline(n.c, inFootnote)}</strong>`;
				case 'strike': return `<s>${this.inline(n.c, inFootnote)}</s>`;
				case 'mark': return `<mark>${this.inline(n.c, inFootnote)}</mark>`;
				case 'link': return `<a href="${esc(n.href)}">${this.inline(n.c, inFootnote)}</a>`;
				case 'url': return `&lt;<a href="${esc(n.href)}">${esc(n.href)}</a>&gt;`;
				case 'fnref': {
					if (inFootnote) return '';
					const content = this.doc.footnotes.get(n.label);
					return content ? this.ref(this.blocks(content, true)) : '';
				}
				case 'fninline':
					return inFootnote ? '' : this.ref(`<p>${this.inline(n.c, true)}</p>`);
			}
			return '';
		}).join('');
	}

	private ref(html: string): string {
		this.notes.push(html);
		const n = this.notes.length;
		return `<sup class="fnref"><a href="#fn${n}" id="fnref${n}">${n}</a></sup>`;
	}

	blocks(blocks: Block[], inFootnote = false): string {
		return blocks.map((b) => {
			switch (b.t) {
				case 'heading': return `<h${b.level}>${this.inline(b.c, inFootnote)}</h${b.level}>`;
				case 'para': return `<p>${this.inline(b.c, inFootnote)}</p>`;
				case 'quote': return `<blockquote>${this.blocks(b.blocks, inFootnote)}</blockquote>`;
				case 'code': return `<pre><code>${esc(b.v)}</code></pre>`;
				case 'hr': return '<hr>';
				case 'list': {
					const tag = b.ordered ? 'ol' : 'ul';
					const start = b.ordered && b.start !== 1 ? ` start="${b.start}"` : '';
					return `<${tag}${start}>${b.items.map((it) => `<li>${this.blocks(it, inFootnote)}</li>`).join('')}</${tag}>`;
				}
				case 'table':
					return `<table><thead><tr>${b.header.map((c) => `<th>${this.inline(c, inFootnote)}</th>`).join('')}</tr></thead><tbody>${
						b.rows.map((r) => `<tr>${r.map((c) => `<td>${this.inline(c, inFootnote)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
			}
			return '';
		}).join('\n');
	}
}

export function exportHtml(markdown: string, opts: ExportOptions): { html: string; footnotes: number } {
	const doc = prepare(parseMarkdown(markdown), opts);
	const b = new HtmlBuilder(doc);
	const body = b.blocks(doc.blocks);
	const notes = b.notes.map((n, i) => `<li id="fn${i + 1}">${n.replace(/<\/p>$/, ` <a class="back" href="#fnref${i + 1}">↩</a></p>`)}</li>`).join('\n');
	const title = esc(opts.title ?? 'Export');
	const css = `
body { font-family: "${opts.font}", serif; font-size: ${opts.fontSize}pt; line-height: ${opts.lineSpacing}; max-width: 42em; margin: 2em auto; padding: 0 1em; }
h1, h2, h3 { line-height: 1.2; }
blockquote { margin: 0 2.5em; }
sup.fnref a { text-decoration: none; }
section.footnotes { font-size: ${opts.footnoteSize}pt; line-height: 1.2; border-top: 1px solid #999; margin-top: 3em; padding-top: 1em; }
section.footnotes p { margin: 0 0 .4em; }
a.back { text-decoration: none; font-size: .8em; }
table { border-collapse: collapse; } td, th { border: 1px solid #999; padding: .2em .5em; }
@media print { a { color: inherit; text-decoration: none; } a.back { display: none; } body { margin: 0; max-width: none; } }`;
	const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${css}
</style>
</head>
<body>
${body}
${b.notes.length > 0 ? `<section class="footnotes">\n<ol>\n${notes}\n</ol>\n</section>` : ''}
</body>
</html>
`;
	return { html, footnotes: b.notes.length };
}
