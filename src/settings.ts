import { type App, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';
import type { HeadingScheme, TopLevel } from './layout/headings';
import type Aglc4Plugin from './main';

export interface Aglc4Settings {
	underline: boolean;
	showInfo: boolean;
	ghostHint: boolean;
	autoSuggest: boolean;
	statusBar: boolean;
	tidyOnLeave: boolean;
	renumber: boolean;
	convertInline: boolean;
	syncCrossRefs: boolean;
	disabledRules: string[];
	exportFolder: string;
	font: string;
	fontSize: number;
	footnoteSize: number;
	lineSpacing: number;
	smartQuotes: boolean;
	pageNumbers: boolean;
	useTitle: boolean;
	headingScheme: HeadingScheme;
	aglcTopLevel: TopLevel;
}

export const DEFAULT_SETTINGS: Aglc4Settings = {
	underline: true,
	showInfo: true,
	ghostHint: true,
	autoSuggest: true,
	statusBar: true,
	tidyOnLeave: true,
	renumber: true,
	convertInline: false,
	syncCrossRefs: true,
	disabledRules: [],
	exportFolder: '',
	font: 'Times New Roman',
	fontSize: 12,
	footnoteSize: 10,
	lineSpacing: 1.5,
	smartQuotes: true,
	pageNumbers: true,
	useTitle: false,
	headingScheme: 'plain',
	aglcTopLevel: 'auto',
};

type Key = keyof Aglc4Settings;

interface Control {
	name: string;
	desc?: string;
	control:
		| { type: 'toggle'; key: Key }
		| { type: 'text'; key: Key; placeholder?: string }
		| { type: 'textarea'; key: Key; rows?: number }
		| { type: 'slider'; key: Key; min: number; max: number; step: number }
		| { type: 'dropdown'; key: Key; options: Record<string, string> };
}

interface Group {
	heading: string;
	items: Control[];
}

/** Every setting, defined once: rendered declaratively on Obsidian 1.13+ and by display() before that. */
const GROUPS: Group[] = [
	{
		heading: 'Checking',
		items: [
			{ name: 'Underline problems', desc: 'Underline incorrect or incomplete citations in footnotes as you write. Hover an underline for the rule and a fix.', control: { type: 'toggle', key: 'underline' } },
			{ name: 'Show suggestions', desc: 'Also mark lesser points with a dotted underline, such as text that may be an unfinished citation.', control: { type: 'toggle', key: 'showInfo' } },
			{ name: 'Disabled rules', desc: 'Rule identifiers to ignore, one per line. Hover an underline to see its rule, or use "Ignore this rule" there.', control: { type: 'textarea', key: 'disabledRules', rows: 4 } },
		],
	},
	{
		heading: 'Next element',
		items: [
			{ name: 'Inline hint', desc: 'Show the next required element of the citation you are typing, faintly after the cursor.', control: { type: 'toggle', key: 'ghostHint' } },
			{ name: 'Suggest as you type', desc: 'Open the list of next elements after a space, comma, bracket or closing italics in a footnote. The "Suggest next citation element" command opens it at any time.', control: { type: 'toggle', key: 'autoSuggest' } },
			{ name: 'Status bar', desc: 'Show the number of problems in the note and the next element of the citation at the cursor.', control: { type: 'toggle', key: 'statusBar' } },
		],
	},
	{
		heading: 'Footnotes',
		items: [
			{ name: 'Keep footnotes at the bottom', desc: 'When you leave a note, move every footnote definition to the bottom of the note in reading order. Text is otherwise untouched.', control: { type: 'toggle', key: 'tidyOnLeave' } },
			{ name: 'Renumber footnotes', desc: 'Relabel footnotes 1, 2, 3 … in reading order when tidying or inserting.', control: { type: 'toggle', key: 'renumber' } },
			{ name: 'Convert inline footnotes', desc: 'Turn ^[inline] footnotes into numbered footnotes at the bottom when tidying.', control: { type: 'toggle', key: 'convertInline' } },
			{ name: 'Keep cross-references in sync', desc: 'When footnotes are added, removed or reordered, update "(n X)" so it still points at the same footnote.', control: { type: 'toggle', key: 'syncCrossRefs' } },
		],
	},
	{
		heading: 'Headings',
		items: [
			{ name: 'Heading style', desc: 'AGLC4 numbers and formats headings I, A, 1, (a), (i): level one centred in small capitals, level two centred in italics, levels three to five in italics. Numbers are added on export, in the page preview and as a faint label in the editor; your notes keep plain headings.', control: { type: 'dropdown', key: 'headingScheme', options: { plain: 'As written', aglc: 'AGLC4 hierarchy' } } },
			{ name: 'AGLC4 level one', desc: 'Which Markdown heading is level I. Automatic: ## when the note opens with a single # heading, which becomes the title; otherwise #.', control: { type: 'dropdown', key: 'aglcTopLevel', options: { auto: 'Automatic', h1: '# headings', h2: '## headings (# is the title)' } } },
		],
	},
	{
		heading: 'Export and page preview',
		items: [
			{ name: 'Export folder', desc: 'Vault folder for exported files. Leave empty to save next to the note.', control: { type: 'text', key: 'exportFolder', placeholder: 'Exports' } },
			{ name: 'Font', control: { type: 'text', key: 'font' } },
			{ name: 'Body text size', desc: 'In points.', control: { type: 'slider', key: 'fontSize', min: 9, max: 16, step: 0.5 } },
			{ name: 'Footnote text size', desc: 'In points.', control: { type: 'slider', key: 'footnoteSize', min: 7, max: 14, step: 0.5 } },
			{ name: 'Line spacing', control: { type: 'dropdown', key: 'lineSpacing', options: { '1': 'Single', '1.5': '1.5 lines', '2': 'Double' } } },
			{ name: 'Typographic quotation marks', desc: 'Export straight quotes as ‘curly’ quotes, as in a published AGLC4 document.', control: { type: 'toggle', key: 'smartQuotes' } },
			{ name: 'Page numbers', desc: 'Number the pages of Word exports in the footer.', control: { type: 'toggle', key: 'pageNumbers' } },
			{ name: 'Title from file name', desc: 'Add the note\'s name as a title when the note has no top-level heading.', control: { type: 'toggle', key: 'useTitle' } },
		],
	},
];

export class Aglc4SettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: Aglc4Plugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return GROUPS.map((g) => ({ type: 'group', heading: g.heading, items: g.items.map((i) => ({ ...i, control: { ...i.control } })) }));
	}

	/** Values as the controls show them: some settings are stored in another form. */
	getControlValue(key: string): unknown {
		const s = this.plugin.settings;
		if (key === 'disabledRules') return s.disabledRules.join('\n');
		if (key === 'lineSpacing') return String(s.lineSpacing);
		return s[key as Key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const s = this.plugin.settings as unknown as Record<string, unknown>;
		switch (key) {
			case 'disabledRules':
				s.disabledRules = String(value).split(/\s+/).map((x) => x.trim()).filter(Boolean);
				break;
			case 'lineSpacing':
				s.lineSpacing = Number(value);
				break;
			case 'exportFolder':
				s.exportFolder = String(value).trim().replace(/^\/+|\/+$/g, '');
				break;
			case 'font':
				s.font = String(value).trim() || DEFAULT_SETTINGS.font;
				break;
			default:
				s[key] = value;
		}
		await this.plugin.saveSettings();
	}

	/** Fallback for Obsidian before 1.13, which has no declarative settings. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		for (const g of GROUPS) {
			new Setting(containerEl).setName(g.heading).setHeading();
			for (const item of g.items) {
				const row = new Setting(containerEl).setName(item.name);
				if (item.desc) row.setDesc(item.desc);
				const c = item.control;
				const value = this.getControlValue(c.key);
				const set = (v: unknown) => { void this.setControlValue(c.key, v); };
				switch (c.type) {
					case 'toggle':
						row.addToggle((t) => t.setValue(value as boolean).onChange(set));
						break;
					case 'text':
						row.addText((t) => t.setPlaceholder(c.placeholder ?? '').setValue(value as string).onChange(set));
						break;
					case 'textarea':
						row.addTextArea((t) => {
							t.setValue(value as string).onChange(set);
							t.inputEl.rows = c.rows ?? 3;
						});
						break;
					case 'slider':
						row.addSlider((sl) => sl.setLimits(c.min, c.max, c.step).setValue(value as number).onChange(set));
						break;
					case 'dropdown':
						row.addDropdown((d) => d.addOptions(c.options).setValue(value as string).onChange(set));
						break;
				}
			}
		}
	}
}
