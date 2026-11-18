/**
 * Page preview: lays a note out as the Word export will, measures every paragraph and footnote in the
 * browser, paginates with Word's rules, and draws the pages.
 *
 * Measurement uses the same fonts, sizes and line heights as the export (see metrics.ts). Each page shows
 * a window onto the full paragraph, so the browser wraps lines exactly as it did when measuring.
 */
import { type ExportOptions, prepare } from '../export/docx';
import { type Block, type Inline, type MdDocument, parseMarkdown } from '../export/markdown';
import { CONTENT_HEIGHT, CONTENT_WIDTH, PAGE, type ParaStyle, type Styles, NUMBER_SPACE, cssFontFamily, lineHeight, styles } from './metrics';
import { type PBlock, type PNote, type Page, paginate } from './paginate';

const PX = 96 / 72;

interface Item {
	el: HTMLElement;
	style: ParaStyle;
	/** Line height in points. */
	lh: number;
	/** Treat as one unbreakable unit (tables). */
	atomic?: boolean;
	/** Start a new page before this paragraph (the bibliography). */
	pageBreak?: boolean;
}

export interface PreviewLayout {
	pages: Page[];
	blocks: Item[];
	notes: Item[];
	styles: Styles;
	options: ExportOptions;
}

interface Run {
	italic: boolean;
	bold: boolean;
}

class Builder {
	readonly blocks: Item[] = [];
	readonly notes: Item[] = [];
	readonly st: Styles;
	private readonly family: string;

	constructor(private doc: MdDocument, private opts: ExportOptions) {
		this.st = styles(opts);
		this.family = cssFontFamily(opts.font);
	}

	private para(style: ParaStyle, indent = 0): HTMLElement {
		const el = createDiv({ cls: 'aglc-pv-para' });
		el.setCssStyles({
			fontFamily: this.family,
			fontSize: `${style.size}pt`,
			lineHeight: `${lineHeight(style, this.opts.font)}pt`,
			fontWeight: style.bold ? 'bold' : 'normal',
			fontStyle: style.italic ? 'italic' : 'normal',
			fontVariant: style.smallCaps ? 'small-caps' : 'normal',
			textAlign: style.center ? 'center' : 'left',
			paddingLeft: `${indent}pt`,
		});
		return el;
	}

	private add(el: HTMLElement, style: ParaStyle, atomic = false) {
		this.blocks.push({ el, style, lh: lineHeight(style, this.opts.font), atomic });
	}

	inline(nodes: Inline[], parent: HTMLElement, run: Run, inFootnote: boolean): void {
		for (const n of nodes) {
			switch (n.t) {
				case 'text': parent.appendText(n.v); break;
				case 'br': parent.createEl('br'); break;
				case 'code': parent.createSpan({ cls: 'aglc-pv-code', text: n.v }); break;
				case 'em': this.styled(n.c, parent, { ...run, italic: !run.italic }, inFootnote); break;
				case 'strong': this.styled(n.c, parent, { ...run, bold: true }, inFootnote); break;
				case 'strike': this.inline(n.c, parent.createEl('s'), run, inFootnote); break;
				case 'mark': this.inline(n.c, parent.createEl('mark'), run, inFootnote); break;
				case 'sup': this.inline(n.c, parent.createEl('sup'), run, inFootnote); break;
				case 'link': this.inline(n.c, parent.createSpan({ cls: 'aglc-pv-link' }), run, inFootnote); break;
				case 'url': parent.appendText(`<${n.href}>`); break;
				case 'fnref': {
					if (inFootnote) break;
					const content = this.doc.footnotes.get(n.label);
					if (content) this.ref(parent, content);
					break;
				}
				case 'fninline':
					if (!inFootnote) this.ref(parent, [{ t: 'para', c: n.c }]);
					break;
			}
		}
	}

	private styled(nodes: Inline[], parent: HTMLElement, run: Run, inFootnote: boolean) {
		const span = parent.createSpan();
		span.setCssStyles({ fontStyle: run.italic ? 'italic' : 'normal', fontWeight: run.bold ? 'bold' : 'normal' });
		this.inline(nodes, span, run, inFootnote);
	}

	/** A footnote reference: every reference gets its own footnote, as in the Word export. */
	private ref(parent: HTMLElement, content: Block[]) {
		const index = this.notes.length;
		const wrap = parent.createSpan({ cls: 'aglc-pv-ref' });
		wrap.dataset.note = String(index);
		wrap.createEl('sup', { text: String(index + 1) });
		const style = this.st.footnote;
		const el = createDiv({ cls: 'aglc-pv-note' });
		let first = true;
		const paras = flattenParas(content);
		for (const p of paras.length > 0 ? paras : [[]]) {
			const pe = el.appendChild(this.para(style));
			if (first) {
				// The footnote number, then a space before the text, as in Word.
				pe.createEl('sup', { text: String(index + 1) });
				pe.appendText(' ');
			}
			first = false;
			this.inline(p, pe, { italic: false, bold: false }, true);
		}
		this.notes.push({ el, style, lh: lineHeight(style, this.opts.font) });
	}

	private quoteDepth = 0;

	build(blocks: Block[], indent = 0) {
		for (const b of blocks) {
			switch (b.t) {
				case 'heading': {
					const style = b.title ? this.st.title : this.st.headings[(b.styleLevel ?? b.level) - 1]!;
					const el = this.para(style, indent);
					if (b.number) {
						el.createSpan({ cls: style.uprightNumber ? 'aglc-pv-hnum aglc-pv-hnum-upright' : 'aglc-pv-hnum', text: b.number + NUMBER_SPACE });
					}
					this.inline(b.c, el, { italic: !!style.italic, bold: !!style.bold }, false);
					this.add(el, style);
					if (b.pageBreak) this.blocks[this.blocks.length - 1]!.pageBreak = true;
					break;
				}
				case 'para': {
					const style = this.quoteDepth > 0 ? this.st.quote : this.st.body;
					// A bibliography entry hangs: its first line starts at the margin, the rest are indented.
					const el = this.para(style, b.hanging ? indent + this.st.hanging * 2 : indent);
					if (b.hanging) el.setCssStyles({ textIndent: `-${this.st.hanging * 2}pt` });
					this.inline(b.c, el, { italic: false, bold: false }, false);
					this.add(el, style);
					break;
				}
				case 'quote':
					this.quoteDepth++;
					this.build(b.blocks, indent + this.st.indent);
					this.quoteDepth--;
					break;
				case 'code': {
					const el = this.para(this.st.body, indent + this.st.hanging);
					el.addClass('aglc-pv-codeblock');
					b.v.split('\n').forEach((l, i) => { if (i > 0) el.createEl('br'); el.appendText(l); });
					this.add(el, this.st.body);
					break;
				}
				case 'hr': {
					const el = this.para(this.st.body, indent);
					el.addClass('aglc-pv-hr');
					el.appendText(' ');
					this.add(el, this.st.body);
					break;
				}
				case 'list': {
					const level = Math.round(indent / this.st.indent);
					const left = this.st.indent * (level + 1);
					b.items.forEach((item, k) => {
						item.forEach((blk, j) => {
							if (j === 0 && blk.t === 'para') {
								// The marker hangs in the indent, as with Word's hanging indent.
								const el = this.para(this.st.body, left);
								const marker = el.createSpan({ cls: 'aglc-pv-marker' });
								marker.setText(b.ordered ? listMarker(level, b.start + k) : ['•', '◦', '▪'][level % 3]!);
								marker.setCssStyles({ width: `${this.st.hanging}pt`, marginLeft: `-${this.st.hanging}pt` });
								this.inline(blk.c, el, { italic: false, bold: false }, false);
								this.add(el, this.st.body);
							} else {
								this.build([blk], indent + this.st.indent);
							}
						});
					});
					break;
				}
				case 'table': {
					const el = createDiv({ cls: 'aglc-pv-table' });
					const table = el.createEl('table');
					[b.header, ...b.rows].forEach((row, r) => {
						const tr = table.createEl('tr');
						for (const cell of row) {
							const td = tr.createEl('td');
							const p = td.appendChild(this.para(this.st.body));
							this.inline(cell, p, { italic: false, bold: r === 0 }, false);
						}
					});
					this.blocks.push({ el, style: { ...this.st.body, keepLines: true }, lh: 0, atomic: true });
					break;
				}
			}
		}
	}

	title(text: string) {
		const el = this.para(this.st.title);
		el.appendText(text);
		this.add(el, this.st.title);
	}
}

function listMarker(level: number, n: number): string {
	if (level % 3 === 1) return `${String.fromCharCode(96 + ((n - 1) % 26) + 1)}.`;
	if (level % 3 === 2) return `${toRoman(n)}.`;
	return `${n}.`;
}

function toRoman(n: number): string {
	const map: [number, string][] = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
	let out = '';
	for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
	return out;
}

/** Footnote content as a list of paragraphs' inline content. */
function flattenParas(blocks: Block[]): Inline[][] {
	const out: Inline[][] = [];
	for (const b of blocks) {
		if (b.t === 'para' || b.t === 'heading') out.push(b.c);
		else if (b.t === 'quote') out.push(...flattenParas(b.blocks));
		else if (b.t === 'list') for (const it of b.items) out.push(...flattenParas(it));
	}
	return out;
}

/**
 * Lay out a note. `host` must be attached to the document: paragraphs are measured inside it and removed
 * again afterwards.
 */
export async function layoutNote(markdown: string, opts: ExportOptions, host: HTMLElement): Promise<PreviewLayout> {
	const doc = prepare(parseMarkdown(markdown), opts, markdown);
	const b = new Builder(doc, opts);
	if (opts.title && !doc.blocks.some((x) => x.t === 'heading' && x.level === 1)) b.title(opts.title);
	b.build(doc.blocks);

	host.empty();
	host.addClass('aglc-pv-measure');
	host.setCssStyles({ width: `${CONTENT_WIDTH}pt` });
	for (const it of [...b.blocks, ...b.notes]) host.appendChild(it.el);
	try {
		await host.ownerDocument.fonts.ready;
	} catch {
		// fonts API unavailable: measure with what is loaded
	}

	const pblocks: PBlock[] = b.blocks.map((it) => {
		const rect = it.el.getBoundingClientRect();
		if (it.atomic) {
			it.lh = rect.height / PX;
			return { lines: 1, lineHeight: it.lh, spaceBefore: it.style.before, spaceAfter: it.style.after, keepLines: true, refs: refsIn(it.el, rect.top, rect.height) };
		}
		const lhPx = it.lh * PX;
		const lines = Math.max(1, Math.round(rect.height / lhPx));
		const refs = refsIn(it.el, rect.top, lhPx);
		return { lines, lineHeight: it.lh, spaceBefore: it.style.before, spaceAfter: it.style.after, keepNext: it.style.keepNext, keepLines: it.style.keepLines, pageBreakBefore: it.pageBreak, refs };
	});
	const pnotes: PNote[] = b.notes.map((it) => ({
		lines: Math.max(1, Math.round(it.el.getBoundingClientRect().height / (it.lh * PX))),
		lineHeight: it.lh,
	}));
	for (const it of [...b.blocks, ...b.notes]) it.el.detach();

	const pages = paginate(pblocks, pnotes, {
		contentHeight: CONTENT_HEIGHT,
		separator: b.st.separator,
		widowControl: true,
		keepNotesTogether: opts.keepFootnotesTogether === true,
	});
	return { pages, blocks: b.blocks, notes: b.notes, styles: b.st, options: opts };
}

/** Which line each footnote reference in a paragraph falls on. */
function refsIn(el: HTMLElement, top: number, lhPx: number): { line: number; note: number }[] {
	const out: { line: number; note: number }[] = [];
	el.querySelectorAll<HTMLElement>('.aglc-pv-ref').forEach((r) => {
		const rect = r.getClientRects()[0] ?? r.getBoundingClientRect();
		const mid = rect.top + rect.height / 2 - top;
		out.push({ line: Math.max(0, Math.floor(mid / lhPx)), note: Number(r.dataset.note) });
	});
	return out;
}

/** A window showing lines [from, to) of a measured paragraph. */
function slice(parent: HTMLElement, item: Item, from: number, to: number, top: number): void {
	const clip = parent.createDiv({ cls: 'aglc-pv-clip' });
	clip.setCssStyles({ top: `${top}pt`, height: `${(to - from) * item.lh}pt` });
	const inner = clip.appendChild(item.el.cloneNode(true) as HTMLElement);
	inner.setCssStyles({ marginTop: `-${from * item.lh}pt` });
}

export function renderPages(layout: PreviewLayout, parent: HTMLElement): void {
	parent.empty();
	const { pages, blocks, notes, styles: st, options } = layout;
	pages.forEach((page, i) => {
		const pageEl = parent.createDiv({ cls: 'aglc-pv-page' });
		pageEl.setCssStyles({ width: `${PAGE.width}pt`, height: `${PAGE.height}pt` });
		const content = pageEl.createDiv({ cls: 'aglc-pv-content' });
		content.setCssStyles({ left: `${PAGE.margin}pt`, top: `${PAGE.margin}pt`, width: `${CONTENT_WIDTH}pt`, height: `${CONTENT_HEIGHT}pt` });

		for (const s of page.body) slice(content, blocks[s.block]!, s.from, s.to, s.y);

		if (page.notes.length > 0) {
			const areaTop = CONTENT_HEIGHT - page.notesHeight;
			const rule = content.createDiv({ cls: 'aglc-pv-separator' });
			rule.setCssStyles({ top: `${areaTop + st.separator / 2}pt` });
			for (const n of page.notes) slice(content, notes[n.note]!, n.from, n.to, areaTop + st.separator + n.y);
		}

		if (options.pageNumbers) {
			// Word's footer sits 0.49in from the page edge, in a body-spaced paragraph.
			const num = pageEl.createDiv({ cls: 'aglc-pv-pagenum', text: String(i + 1) });
			const lh = lineHeight(st.body, options.font);
			num.setCssStyles({
				top: `${PAGE.height - 35.4 - lh - st.body.after}pt`,
				fontFamily: cssFontFamily(options.font),
				fontSize: `${st.body.size}pt`,
				lineHeight: `${lh}pt`,
			});
		}
	});
}
