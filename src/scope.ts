/**
 * Which notes the plugin works in, and a note's own style.
 *
 * With "Use AGLC4 in" set to all notes, every note is on unless its `aglc` property is false. Otherwise
 * only notes whose `aglc` property is true (assignment notes) are on, and optionally the notes in chosen
 * folders. A note that is off is left alone: no checking, hints, suggestions, heading numbers or automatic
 * changes. Commands you run on it still work.
 *
 * A note's properties can override the style settings for that note (see NOTE_PROPERTIES).
 */
import type { Aglc4Settings } from './settings';

export type Scope = 'all' | 'marked' | 'marked-folders';

/** The property that turns the plugin on (true) or off (false) for a note. */
export const ON_PROPERTY = 'aglc';

type Frontmatter = Record<string, unknown> | null | undefined;

function truthy(v: unknown): boolean | null {
	if (typeof v === 'boolean') return v;
	if (typeof v === 'number') return v !== 0;
	if (typeof v === 'string') {
		const s = v.trim().toLowerCase();
		if (['true', 'yes', 'on', '1'].includes(s)) return true;
		if (['false', 'no', 'off', '0'].includes(s)) return false;
	}
	return null;
}

/** The folders of "notes in these folders", one per line (or separated by commas). */
export function parseFolders(text: string): string[] {
	return text.split(/[\n,]/).map((f) => f.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean);
}

function inFolder(path: string, folder: string): boolean {
	return path === folder || path.startsWith(`${folder}/`);
}

/** Whether the plugin works in the note at `path`, with these properties. */
export function noteEnabled(settings: Pick<Aglc4Settings, 'scope' | 'scopeFolders'>, path: string | null, frontmatter: Frontmatter): boolean {
	const marked = truthy(frontmatter?.[ON_PROPERTY]);
	if (marked !== null) return marked;
	if (settings.scope === 'all') return true;
	if (settings.scope === 'marked-folders' && path) return parseFolders(settings.scopeFolders).some((f) => inFolder(path, f));
	return false;
}

interface NoteProperty {
	key: keyof Aglc4Settings;
	parse: (v: unknown) => unknown;
	/** For the README and settings: the values it takes. */
	values: string;
}

const oneOf = (...options: string[]) => (v: unknown) => {
	const s = typeof v === 'string' ? v.trim().toLowerCase() : String(v);
	return options.includes(s) ? s : undefined;
};
const bool = (v: unknown) => truthy(v) ?? undefined;
const number = (min: number, max: number) => (v: unknown) => {
	const n = typeof v === 'number' ? v : Number(String(v).trim());
	return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Properties that set a note's own style, overriding the settings for that note. */
export const NOTE_PROPERTIES: Record<string, NoteProperty> = {
	'aglc-headings': { key: 'headingScheme', parse: oneOf('aglc', 'plain'), values: 'aglc or plain' },
	'aglc-level-one': { key: 'aglcTopLevel', parse: oneOf('auto', 'h1', 'h2'), values: 'auto, h1 or h2' },
	'aglc-bibliography': { key: 'bibliography', parse: bool, values: 'true or false' },
	'aglc-font': { key: 'font', parse: text, values: 'a font name' },
	'aglc-font-size': { key: 'fontSize', parse: number(6, 30), values: 'points' },
	'aglc-footnote-size': { key: 'footnoteSize', parse: number(6, 30), values: 'points' },
	'aglc-line-spacing': { key: 'lineSpacing', parse: (v) => { const n = number(1, 3)(v); return n === 1 || n === 1.5 || n === 2 ? n : undefined; }, values: '1, 1.5 or 2' },
	'aglc-page-numbers': { key: 'pageNumbers', parse: bool, values: 'true or false' },
	'aglc-title': { key: 'useTitle', parse: bool, values: 'true or false' },
	'aglc-keep-footnotes-together': { key: 'keepFootnotesTogether', parse: bool, values: 'true or false' },
};

/** The settings for a note: the plugin's settings with the note's own properties applied. */
export function noteSettings(settings: Aglc4Settings, frontmatter: Frontmatter): Aglc4Settings {
	if (!frontmatter) return settings;
	let out: Aglc4Settings | null = null;
	for (const [prop, def] of Object.entries(NOTE_PROPERTIES)) {
		if (!(prop in frontmatter)) continue;
		const value = def.parse(frontmatter[prop]);
		if (value === undefined) continue;
		out ??= { ...settings };
		(out as unknown as Record<string, unknown>)[def.key] = value;
	}
	return out ?? settings;
}
