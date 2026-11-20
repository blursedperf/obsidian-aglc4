import { ItemView, MarkdownView, type TFile, type WorkspaceLeaf, debounce, setIcon } from 'obsidian';
import type { ExportOptions } from '../export/docx';
import { PAGE } from './metrics';
import { NotLaidOutError, layoutNote, renderPages } from './preview';

export const PAGE_PREVIEW_VIEW = 'aglc4-page-preview';

export interface PreviewHost {
	exportOptions(file: TFile): ExportOptions;
}

type Zoom = 'fit' | number;

/**
 * Shows the active note as Word will paginate it: A4 pages with footnotes at the bottom of each page.
 * Follows the active note and re-renders as you type.
 */
export class PagePreviewView extends ItemView {
	private file: TFile | null = null;
	private zoom: Zoom = 'fit';
	private pagesEl!: HTMLElement;
	private measureEl!: HTMLElement;
	private infoEl!: HTMLElement;
	private generation = 0;
	private readonly refresh = debounce(() => { void this.render(); }, 500, true);
	/** Watches for the pane to be laid out, when a render had to wait for it. */
	private waiting: ResizeObserver | null = null;

	constructor(leaf: WorkspaceLeaf, private host: PreviewHost) {
		super(leaf);
	}

	getViewType(): string { return PAGE_PREVIEW_VIEW; }
	getDisplayText(): string { return this.file ? `Pages: ${this.file.basename}` : 'Page preview'; }
	getIcon(): string { return 'book-open'; }

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass('aglc-pv-view');

		const bar = root.createDiv({ cls: 'aglc-pv-toolbar' });
		this.infoEl = bar.createSpan({ cls: 'aglc-pv-info' });
		const buttons = bar.createDiv({ cls: 'aglc-pv-buttons' });
		const button = (icon: string, label: string, onClick: () => void) => {
			const b = buttons.createEl('button', { cls: 'clickable-icon' });
			setIcon(b, icon);
			b.setAttribute('aria-label', label);
			b.addEventListener('click', onClick);
		};
		button('zoom-out', 'Zoom out', () => this.setZoom(this.currentScale() / 1.25));
		button('zoom-in', 'Zoom in', () => this.setZoom(this.currentScale() * 1.25));
		button('maximize', 'Fit width', () => this.setZoom('fit'));
		button('refresh-cw', 'Refresh', () => { void this.render(); });

		const scroller = root.createDiv({ cls: 'aglc-pv-scroller' });
		this.pagesEl = scroller.createDiv({ cls: 'aglc-pv-pages' });
		// Paragraphs are measured off screen at the real page width.
		this.measureEl = root.createDiv();

		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.followActive()));
		this.registerEvent(this.app.workspace.on('editor-change', (_e, info) => {
			if (info.file && info.file === this.file) this.refresh();
		}));
		this.registerEvent(this.app.vault.on('modify', (f) => { if (f === this.file) this.refresh(); }));
		this.registerEvent(this.app.workspace.on('resize', () => this.applyZoom()));
		this.followActive();
	}

	async onClose(): Promise<void> {
		this.refresh.cancel();
		this.waiting?.disconnect();
		this.waiting = null;
		this.contentEl.empty();
	}

	private followActive() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file ?? null;
		if (file && file !== this.file) {
			this.file = file;
			void this.render();
		} else if (!this.file) {
			this.pagesEl.empty();
			this.infoEl.setText('Open a note to preview its pages.');
		}
	}

	/** Re-render after settings change. */
	rerender() {
		void this.render();
	}

	private async render() {
		const file = this.file;
		if (!file) return;
		const gen = ++this.generation;
		// Prefer the editor's text, which may not be saved yet.
		let text: string | null = null;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (text === null && leaf.view instanceof MarkdownView && leaf.view.file === file) text = leaf.view.editor.getValue();
		});
		const markdown = text ?? await this.app.vault.cachedRead(file);
		let layout;
		try {
			layout = await layoutNote(markdown, this.host.exportOptions(file), this.measureEl);
		} catch (e) {
			if (!(e instanceof NotLaidOutError)) throw e;
			// The pane is hidden or still opening: draw the pages once it has a size.
			if (gen === this.generation) this.renderWhenLaidOut();
			return;
		}
		if (gen !== this.generation) return;
		this.retries = 5;

		const scroller = this.pagesEl.parentElement!;
		const ratio = scroller.scrollHeight > 0 ? scroller.scrollTop / scroller.scrollHeight : 0;
		renderPages(layout, this.pagesEl);
		const footnotes = layout.notes.length;
		this.infoEl.setText(`${layout.pages.length} ${layout.pages.length === 1 ? 'page' : 'pages'} · ${footnotes} ${footnotes === 1 ? 'footnote' : 'footnotes'}`);
		this.applyZoom();
		scroller.scrollTop = ratio * scroller.scrollHeight;
		(this.leaf as unknown as { updateHeader?: () => void }).updateHeader?.();
	}

	/** Retries left for a pane that has a size but could not be measured yet. */
	private retries = 5;

	/** Render again as soon as the pane is laid out (it is hidden, or was still opening). */
	private renderWhenLaidOut() {
		if (this.waiting) return;
		this.infoEl.setText('Preparing pages…');
		const sized = () => this.contentEl.clientWidth > 0 && this.contentEl.clientHeight > 0;
		if (sized() && this.retries > 0) {
			// Sized but not measurable yet (still opening): try again on the next frames, a few times.
			this.retries--;
			window.requestAnimationFrame(() => { void this.render(); });
			return;
		}
		// Hidden: wait until the pane gets a new size.
		const from = `${this.contentEl.clientWidth}x${this.contentEl.clientHeight}`;
		this.waiting = new ResizeObserver(() => {
			if (!sized() || `${this.contentEl.clientWidth}x${this.contentEl.clientHeight}` === from) return;
			this.waiting?.disconnect();
			this.waiting = null;
			this.retries = 5;
			void this.render();
		});
		this.waiting.observe(this.contentEl);
	}

	private currentScale(): number {
		if (this.zoom !== 'fit') return this.zoom;
		const width = this.pagesEl.parentElement?.clientWidth ?? 0;
		const pagePx = PAGE.width * (96 / 72);
		return Math.max(0.2, Math.min(2, (width - 32) / pagePx));
	}

	private setZoom(z: Zoom) {
		this.zoom = z === 'fit' ? 'fit' : Math.max(0.25, Math.min(3, z));
		this.applyZoom();
	}

	private applyZoom() {
		if (!this.pagesEl) return;
		this.pagesEl.setCssStyles({ zoom: String(this.currentScale()) });
	}
}
