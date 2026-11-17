import { App, PluginSettingTab, Setting } from 'obsidian';
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
};

export class Aglc4SettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: Aglc4Plugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;
		const save = async () => { await this.plugin.saveSettings(); };

		new Setting(containerEl).setName('Checking').setHeading();
		new Setting(containerEl)
			.setName('Underline problems')
			.setDesc('Underline incorrect or incomplete citations in footnotes as you write. Hover an underline for the rule and a fix.')
			.addToggle((t) => t.setValue(s.underline).onChange(async (v) => { s.underline = v; await save(); }));
		new Setting(containerEl)
			.setName('Show suggestions')
			.setDesc('Also mark lesser points with a dotted underline, such as text that may be an unfinished citation.')
			.addToggle((t) => t.setValue(s.showInfo).onChange(async (v) => { s.showInfo = v; await save(); }));
		new Setting(containerEl)
			.setName('Disabled rules')
			.setDesc('Rule identifiers to ignore, one per line. Hover an underline to see its rule, or use "Ignore this rule" there.')
			.addTextArea((t) => {
				t.setValue(s.disabledRules.join('\n')).onChange(async (v) => {
					s.disabledRules = v.split(/\s+/).map((x) => x.trim()).filter(Boolean);
					await save();
				});
				t.inputEl.rows = 4;
			});

		new Setting(containerEl).setName('Next element').setHeading();
		new Setting(containerEl)
			.setName('Inline hint')
			.setDesc('Show the next required element of the citation you are typing, faintly after the cursor.')
			.addToggle((t) => t.setValue(s.ghostHint).onChange(async (v) => { s.ghostHint = v; await save(); }));
		new Setting(containerEl)
			.setName('Suggest as you type')
			.setDesc('Open the list of next elements after a space, comma, bracket or closing italics in a footnote. The "Suggest next citation element" command opens it at any time.')
			.addToggle((t) => t.setValue(s.autoSuggest).onChange(async (v) => { s.autoSuggest = v; await save(); }));
		new Setting(containerEl)
			.setName('Status bar')
			.setDesc('Show the number of problems in the note and the next element of the citation at the cursor.')
			.addToggle((t) => t.setValue(s.statusBar).onChange(async (v) => { s.statusBar = v; await save(); }));

		new Setting(containerEl).setName('Footnotes').setHeading();
		new Setting(containerEl)
			.setName('Keep footnotes at the bottom')
			.setDesc('When you leave a note, move every footnote definition to the bottom of the note in reading order. Text is otherwise untouched.')
			.addToggle((t) => t.setValue(s.tidyOnLeave).onChange(async (v) => { s.tidyOnLeave = v; await save(); }));
		new Setting(containerEl)
			.setName('Renumber footnotes')
			.setDesc('Relabel footnotes 1, 2, 3 … in reading order when tidying or inserting.')
			.addToggle((t) => t.setValue(s.renumber).onChange(async (v) => { s.renumber = v; await save(); }));
		new Setting(containerEl)
			.setName('Convert inline footnotes')
			.setDesc('Turn ^[inline] footnotes into numbered footnotes at the bottom when tidying.')
			.addToggle((t) => t.setValue(s.convertInline).onChange(async (v) => { s.convertInline = v; await save(); }));
		new Setting(containerEl)
			.setName('Keep cross-references in sync')
			.setDesc('When footnotes are added, removed or reordered, update "(n X)" so it still points at the same footnote.')
			.addToggle((t) => t.setValue(s.syncCrossRefs).onChange(async (v) => { s.syncCrossRefs = v; await save(); }));

		new Setting(containerEl).setName('Export').setHeading();
		new Setting(containerEl)
			.setName('Export folder')
			.setDesc('Vault folder for exported files. Leave empty to save next to the note.')
			.addText((t) => t.setPlaceholder('Exports').setValue(s.exportFolder).onChange(async (v) => { s.exportFolder = v.trim().replace(/^\/+|\/+$/g, ''); await save(); }));
		new Setting(containerEl)
			.setName('Font')
			.addText((t) => t.setValue(s.font).onChange(async (v) => { s.font = v.trim() || DEFAULT_SETTINGS.font; await save(); }));
		new Setting(containerEl)
			.setName('Body text size')
			.setDesc('In points.')
			.addSlider((sl) => sl.setLimits(9, 16, 0.5).setValue(s.fontSize).onChange(async (v) => { s.fontSize = v; await save(); }));
		new Setting(containerEl)
			.setName('Footnote text size')
			.setDesc('In points.')
			.addSlider((sl) => sl.setLimits(7, 14, 0.5).setValue(s.footnoteSize).onChange(async (v) => { s.footnoteSize = v; await save(); }));
		new Setting(containerEl)
			.setName('Line spacing')
			.addDropdown((d) => d.addOptions({ '1': 'Single', '1.5': '1.5 lines', '2': 'Double' }).setValue(String(s.lineSpacing)).onChange(async (v) => { s.lineSpacing = Number(v); await save(); }));
		new Setting(containerEl)
			.setName('Typographic quotation marks')
			.setDesc('Export straight quotes as ‘curly’ quotes, as in a published AGLC4 document.')
			.addToggle((t) => t.setValue(s.smartQuotes).onChange(async (v) => { s.smartQuotes = v; await save(); }));
		new Setting(containerEl)
			.setName('Page numbers')
			.setDesc('Number the pages of Word exports in the footer.')
			.addToggle((t) => t.setValue(s.pageNumbers).onChange(async (v) => { s.pageNumbers = v; await save(); }));
		new Setting(containerEl)
			.setName('Title from file name')
			.setDesc('Add the note\'s name as a title when the note has no top-level heading.')
			.addToggle((t) => t.setValue(s.useTitle).onChange(async (v) => { s.useTitle = v; await save(); }));
	}
}
