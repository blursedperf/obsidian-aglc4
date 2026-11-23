import { type App, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';
import type { HeadingScheme, TopLevel } from './layout/headings';
import type { Scope } from './scope';
import type Aglc4Plugin from './main';

export interface Aglc4Settings {
	underline: boolean;
	showInfo: boolean;
	ghostHint: boolean;
	paragraphPrompts: boolean;
	promptDetail: 'full' | 'current';
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
	footnoteEditing: 'pane' | 'note';
	chooseKindOnInsert: boolean;
	returnOnFinish: boolean;
	closeFootnotePane: boolean;
	keepFootnotesTogether: boolean;
	bibliography: boolean;
	historyEnabled: boolean;
	historyFolder: string;
	historyInterval: number;
	historyKeepAll: boolean;
	scope: Scope;
	scopeFolders: string;
	historyScope: 'all' | 'aglc';
}

export const DEFAULT_SETTINGS: Aglc4Settings = {
	underline: true,
	showInfo: true,
	ghostHint: true,
	paragraphPrompts: true,
	promptDetail: 'full',
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
	footnoteEditing: 'pane',
	chooseKindOnInsert: false,
	returnOnFinish: true,
	closeFootnotePane: true,
	keepFootnotesTogether: true,
	bibliography: false,
	historyEnabled: true,
	historyFolder: '.aglc-history',
	historyInterval: 2,
	historyKeepAll: false,
	scope: 'all',
	scopeFolders: '',
	historyScope: 'all',
};

type Key = keyof Aglc4Settings;

export const EXAMPLE = {
	name: 'Create example essay',
	desc: 'Add a short, correctly cited essay to the vault, with a tour of what to try and some citations with mistakes to fix. A new note is created each time; nothing is replaced.',
};

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
export const GROUPS: Group[] = [
	{
		heading: 'Notes',
		items: [
			{ name: 'Use AGLC4 in', desc: 'Which notes the plugin works in. Assignment notes are those with the property "aglc" ticked: use "Turn AGLC4 on for this note", or click "AGLC4 off" in the status bar. In other notes nothing is checked, underlined, numbered or changed automatically; commands you run there (such as export) still work. With all notes, a note is left out by unticking its "aglc" property.', control: { type: 'dropdown', key: 'scope', options: { all: 'All notes', marked: 'Assignment notes only', 'marked-folders': 'Assignment notes, and notes in these folders' } } },
			{ name: 'Folders', desc: 'With "Assignment notes, and notes in these folders": every note in these folders (and the folders inside them) is on. One folder per line, eg Law/Assignments.', control: { type: 'textarea', key: 'scopeFolders', rows: 3 } },
		],
	},
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
		heading: 'Paragraph prompts',
		items: [
			{ name: 'Show paragraph prompts', desc: 'In a note with paragraph prompts (run "Choose paragraph prompts for this note", or "New legal essay or problem answer"), show a guide above the paragraph you are writing: what that paragraph of the essay or answer should do, and how to build its sentences, with the sentence you are on highlighted. It stays while you write the paragraph. IRAC, ILAC, HIRAC or MIRAT for problem questions, or a critical analysis or "discuss" essay. The guide is never written into the note. Turn off to hide it in every note.', control: { type: 'toggle', key: 'paragraphPrompts' } },
			{ name: 'Guide shows', desc: 'Every sentence of the paragraph\'s structure, or only the sentence you are writing.', control: { type: 'dropdown', key: 'promptDetail', options: { full: 'Every sentence', current: 'The current sentence' } } },
		],
	},
	{
		heading: 'Footnotes',
		items: [
			{ name: 'Write new footnotes in', desc: 'Where "Insert footnote" puts you to write the footnote. A pane below the note shows the same note at its footnotes, so the text you are writing stays where it is. On phones footnotes are always written in the note.', control: { type: 'dropdown', key: 'footnoteEditing', options: { pane: 'A pane below the note', note: 'The note (jump to the bottom)' } } },
			{ name: 'Choose a kind of source for new footnotes', desc: 'When "Insert footnote" adds a footnote, open the list of kinds of source (case, Act, government or inquiry report, journal article …) and insert the AGLC4 form of the one you choose, with Tab between its placeholders. Press Escape to leave the footnote empty.', control: { type: 'toggle', key: 'chooseKindOnInsert' } },
			{ name: 'Return after a footnote', desc: 'Press Enter after a footnote\'s closing full stop, or Escape anywhere in a footnote, to go back to its reference in the text.', control: { type: 'toggle', key: 'returnOnFinish' } },
			{ name: 'Close the footnote pane when done', desc: 'When you press Enter after a footnote\'s closing full stop in the footnote pane, close the pane as you return to the text. The next "Insert footnote" opens it again. Escape returns without closing it.', control: { type: 'toggle', key: 'closeFootnotePane' } },
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
		heading: 'Version history',
		items: [
			{ name: 'Keep version history', desc: 'Save versions of your notes as you write (and before the plugin rewrites one, or overwrites an exported Word file), so any earlier version can be restored, as in Word or Google Docs. Kept on this device, in the folder below. Open it with "Show version history" or the clock icon.', control: { type: 'toggle', key: 'historyEnabled' } },
			{ name: 'History folder', desc: 'Vault folder for the history. A folder starting with "." is hidden from the file list. If you back up or sync your vault folder (iCloud, Dropbox, OneDrive, Time Machine), the history is backed up with it. Changing the folder starts a new history; the old folder is left where it is.', control: { type: 'text', key: 'historyFolder', placeholder: '.aglc-history' } },
			{ name: 'Minutes between versions', desc: 'While you write, save a version at most this often. A version is also saved when you open or leave a note.', control: { type: 'slider', key: 'historyInterval', min: 1, max: 30, step: 1 } },
			{ name: 'Keep history of', desc: 'All notes, or only the notes the plugin works in (see "Use AGLC4 in").', control: { type: 'dropdown', key: 'historyScope', options: { all: 'All notes', aglc: 'Only notes AGLC4 is used in' } } },
			{ name: 'Keep every version', desc: 'Keep every version forever. When off, every version from the last day is kept, then one per hour for a month, then one per day, forever. Named versions are always kept.', control: { type: 'toggle', key: 'historyKeepAll' } },
		],
	},
	{
		heading: 'Export and page preview',
		items: [
			{ name: 'Export folder', desc: 'Vault folder for exported files. Leave empty to save next to the note.', control: { type: 'text', key: 'exportFolder', placeholder: 'Exports' } },
			{ name: 'Font', control: { type: 'text', key: 'font' } },
			{ name: 'Body text size', desc: 'In points.', control: { type: 'slider', key: 'fontSize', min: 9, max: 16, step: 0.5 } },
			{ name: 'Footnote text size', desc: 'In points.', control: { type: 'slider', key: 'footnoteSize', min: 7, max: 14, step: 0.5 } },
			{ name: 'Keep footnotes on one page', desc: 'Keep short footnotes (up to two lines, such as a citation with a long web address) whole at the bottom of one page: when one does not fit, the line citing it moves to the next page with it. Longer footnotes continue at the bottom of the next page, as Word does, so they do not leave a large gap at the bottom of a page. Turn off to let every footnote continue on the next page.', control: { type: 'toggle', key: 'keepFootnotesTogether' } },
			{ name: 'Add a bibliography', desc: 'Add a bibliography of every source cited in the footnotes, on a new page at the end, in the form AGLC4 requires (r 1.13): sections for articles, books and reports, cases, legislation, treaties and other sources, in alphabetical order, with the first author\'s name inverted and no pinpoints. Used in Word and HTML exports and the page preview. Not added when the note already has a heading "Bibliography", "References" or "Reference list".', control: { type: 'toggle', key: 'bibliography' } },
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
		const start: SettingDefinitionItem = {
			type: 'group',
			heading: 'Getting started',
			items: [{ name: EXAMPLE.name, desc: EXAMPLE.desc, action: () => { void this.plugin.createExampleEssay(); } }],
		};
		return [start, ...GROUPS.map((g): SettingDefinitionItem => ({ type: 'group', heading: g.heading, items: g.items.map((i) => ({ ...i, control: { ...i.control } })) }))];
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
			case 'scope':
				s.scope = value;
				await this.plugin.saveSettings();
				if (value !== 'all') this.plugin.offerToMarkNotes();
				return;
			case 'historyFolder':
				s.historyFolder = String(value).trim().replace(/^\/+|\/+$/g, '') || DEFAULT_SETTINGS.historyFolder;
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
		new Setting(containerEl).setName('Getting started').setHeading();
		new Setting(containerEl).setName(EXAMPLE.name).setDesc(EXAMPLE.desc)
			.addButton((b) => b.setButtonText('Create').onClick(() => { void this.plugin.createExampleEssay(); }));
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
