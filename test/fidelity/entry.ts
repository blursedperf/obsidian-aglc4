/**
 * Browser entry for the Word fidelity check: runs the page preview's layout on a note and reports, for
 * each page, how many body lines it holds, which footnotes start on it and how many footnote lines it
 * holds. Obsidian adds DOM helpers to HTMLElement; the few the preview uses are provided here.
 */
import { DEFAULT_EXPORT } from '../../src/export/docx';
import { layoutNote, renderPages } from '../../src/layout/preview';

type Attrs = { cls?: string; text?: string };
const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
function make(this: HTMLElement | null, tag: string, o: Attrs = {}): HTMLElement {
	const el = document.createElement(tag);
	if (o.cls) el.className = o.cls;
	if (o.text !== undefined) el.textContent = o.text;
	if (this) this.appendChild(el);
	return el;
}
proto.createEl = function (this: HTMLElement, tag: string, o?: Attrs) { return make.call(this, tag, o); };
proto.createDiv = function (this: HTMLElement, o?: Attrs) { return make.call(this, 'div', o); };
proto.createSpan = function (this: HTMLElement, o?: Attrs) { return make.call(this, 'span', o); };
proto.setCssStyles = function (this: HTMLElement, s: Record<string, string>) { Object.assign(this.style, s); };
proto.appendText = function (this: HTMLElement, t: string) { this.appendChild(document.createTextNode(t)); };
proto.setText = function (this: HTMLElement, t: string) { this.textContent = t; };
proto.empty = function (this: HTMLElement) { this.replaceChildren(); };
proto.detach = function (this: HTMLElement) { this.remove(); };
proto.addClass = function (this: HTMLElement, ...c: string[]) { this.classList.add(...c); };
const g = globalThis as unknown as Record<string, unknown>;
g.createDiv = (o?: Attrs) => make.call(null, 'div', o);
g.createSpan = (o?: Attrs) => make.call(null, 'span', o);

g.runLayout = async (markdown: string) => {
	const host = document.body.appendChild(document.createElement('div'));
	const layout = await layoutNote(markdown, { ...DEFAULT_EXPORT }, host);
	const view = document.body.appendChild(document.createElement('div'));
	renderPages(layout, view);
	return layout.pages.map((p) => ({
		bodyLines: p.body.reduce((n, s) => n + s.to - s.from, 0),
		notesStarted: p.notes.filter((n) => n.from === 0).map((n) => n.note + 1),
		noteLines: p.notes.reduce((n, s) => n + s.to - s.from, 0),
	}));
};
