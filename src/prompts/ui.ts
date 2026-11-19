import { type App, SuggestModal } from 'obsidian';
import type { PromptSet } from './sets';

/** A choice of prompt set; `null` is "no prompts" when `allowNone`. */
export class PromptSetModal extends SuggestModal<PromptSet | null> {
	constructor(app: App, private sets: PromptSet[], placeholder: string, private allowNone: boolean, private onChoose: (set: PromptSet | null) => void) {
		super(app);
		this.setPlaceholder(placeholder);
	}

	getSuggestions(query: string): (PromptSet | null)[] {
		const q = query.toLowerCase();
		const sets = this.sets.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(q));
		return this.allowNone && 'no prompts'.includes(q) ? [...sets, null] : sets;
	}

	renderSuggestion(set: PromptSet | null, el: HTMLElement): void {
		if (!set) {
			el.createDiv({ text: 'No prompts' });
			el.createDiv({ cls: 'aglc-suggestion-hint', text: 'Turn paragraph prompts off for this note.' });
			return;
		}
		el.createDiv({ text: set.custom ? `${set.name} (custom)` : set.name });
		el.createDiv({ cls: 'aglc-suggestion-hint', text: set.custom ? `From ${set.path ?? 'a note'}` : set.description });
	}

	onChooseSuggestion(set: PromptSet | null): void {
		this.onChoose(set);
	}
}
