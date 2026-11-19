/**
 * Which prompt to show where, new essays from a prompt set, and prompt sets defined in notes.
 */
import { excludedRanges, scanFootnotes } from '../footnotes';
import { BUILT_IN_SETS, type Prompt, type PromptKind, type PromptSection, type PromptSet, defaultAlternatives } from './sets';

/** The note property that chooses a note's prompt set: a built-in id or a custom set's name. */
export const PROMPTS_PROPERTY = 'aglc-prompts';
/** The properties of a note that defines a custom prompt set. */
export const CUSTOM_SET_PROPERTY = 'aglc-prompt-set';
export const CUSTOM_KIND_PROPERTY = 'aglc-prompt-kind';

/** A heading as compared with section names: no numbering, emphasis or text after a colon, lower case. */
export function headingKey(text: string): string {
	return text
		.replace(/[*_`]/g, '')
		.replace(/^\((?:[a-z]{1,3}|[ivxlc]+|\d+)\)\s+/, '')
		.replace(/^(?:[IVXLC]+|[A-Z]|\d+)(?:[.)]\s*|\t|\u00a0|\s{2,})/, '')
		.split(':')[0]!
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

function sectionFor(set: PromptSet, heading: string): PromptSection | null {
	const key = headingKey(heading);
	return set.sections.find((s) => s.name.toLowerCase() === key || s.aliases.includes(key)) ?? null;
}

/** The set a note's property names: a built-in id or name, or a custom set's name. */
export function findSet(value: unknown, custom: PromptSet[] = []): PromptSet | null {
	if (typeof value !== 'string' || !value.trim()) return null;
	const v = value.trim().toLowerCase();
	return BUILT_IN_SETS.find((s) => s.id === v || s.name.toLowerCase() === v)
		?? custom.find((s) => s.name.toLowerCase() === v || s.id === v)
		?? null;
}

/** The guide for the paragraph at the cursor. */
export interface Guide {
	/** Where the paragraph (or heading) starts: the guide is shown above it. */
	from: number;
	prompt: Prompt;
	/** The sentence of the paragraph the cursor is in, from 0. */
	sentence: number;
	/** The guides this paragraph could have instead (its section's, in order), and which one `prompt` is. */
	options: Prompt[];
	index: number;
}

/**
 * Where sentence `position` of a paragraph falls, starting from guide `base`: a paragraph with more
 * sentences than its guide carries on into the section's next guides, in order (an introduction written
 * as one paragraph goes on from the thesis into the roadmap). Past the last guide, `local` is past its end.
 */
export function resolvePosition(options: Prompt[], base: number, position: number): { index: number; local: number } {
	let index = base;
	let local = Math.max(0, position);
	while (index + 1 < options.length) {
		const n = options[index]!.sentences.length;
		if (n === 0 || local < n) break;
		local -= n;
		index++;
	}
	return { index, local };
}

/** A line that is not a paragraph of prose: a list item, quotation, table or indented code. */
const NOT_PROSE = /^(?:\s*(?:>|[-*+][ \t]|\d+[.)][ \t]|\|)|(?: {4}|\t))/;
const HEADING_LINE = /^(#{1,6})(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/;

/** The sentences finished in `text` (a paragraph up to the cursor): a full stop, ? or ! and a space. */
export function sentencesBefore(text: string): number {
	const plain = text.replace(/\^?\[\^?[^\]]*\]/g, '').replace(/`[^`]*`/g, '');
	return (plain.match(/[.?!…]['"’”)\]*_]*\s+/g) ?? []).length;
}

/**
 * The guide for the paragraph at `cursor`: the prompt for that paragraph, where it starts, and the
 * sentence being written. Null where no guide applies: in footnotes, code, comments, properties, lists,
 * quotations and tables.
 */
export function guideAt(text: string, cursor: number, set: PromptSet): Guide | null {
	const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
	const nl = text.indexOf('\n', cursor);
	const line = text.slice(lineStart, nl === -1 ? text.length : nl);

	const excluded: [number, number][] = [...excludedRanges(text), ...scanFootnotes(text).defs.map((d): [number, number] => [d.from, d.to + 1])];
	const inExcluded = (at: number) => excluded.some(([a, b]) => at >= a && at < b);
	if (inExcluded(lineStart)) return null;

	// The headings outside footnotes, code and comments.
	const headings: { at: number; level: number; text: string }[] = [];
	const re = /^(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/gm;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		if (!inExcluded(m.index)) headings.push({ at: m.index, level: m[1]!.length, text: m[2]! });
	}
	// A note that opens with its only # heading: that heading is the title, not a section.
	const title = headings[0]?.level === 1 && headings.filter((h) => h.level === 1).length === 1 ? headings[0] : null;

	const h = HEADING_LINE.exec(line);
	if (h) {
		// HIRAC: the heading of an issue (any heading that is not a section or the title).
		if (set.kind !== 'problem' || !set.issueHeading || title?.at === lineStart) return null;
		if (h[2] && sectionFor(set, h[2])) return null;
		return { from: lineStart, prompt: set.issueHeading, sentence: 0, options: [set.issueHeading], index: 0 };
	}
	if (NOT_PROSE.test(line)) return null;

	// The start of the paragraph the cursor is in.
	let from = lineStart;
	if (line.trim() !== '') {
		while (from > 0) {
			const prevStart = text.lastIndexOf('\n', from - 2) + 1;
			const prev = text.slice(prevStart, from - 1);
			if (prev.trim() === '' || HEADING_LINE.test(prev) || NOT_PROSE.test(prev) || inExcluded(prevStart)) break;
			from = prevStart;
		}
	}

	const before = headings.filter((x) => x.at < from && x !== title);
	const heading = before.length > 0 ? before[before.length - 1]! : null;

	// The paragraphs written between that heading (or the title, or the start) and this one.
	const sectionAt = heading ? heading.at : title && title.at < from ? title.at : -1;
	const sectionStart = sectionAt < 0 ? 0 : text.indexOf('\n', sectionAt) + 1 || from;
	const written: string[] = [];
	let inParagraph = false;
	let offset = sectionStart;
	for (const l of text.slice(sectionStart, from).split('\n')) {
		const at = offset;
		offset += l.length + 1;
		if (at >= from) break;
		if (inExcluded(at) || l.trim() === '' || /^---\s*$/.test(l)) { inParagraph = false; continue; }
		if (inParagraph) written[written.length - 1] += `\n${l}`;
		else written.push(l);
		inParagraph = true;
	}

	let options: Prompt[];
	if (heading) {
		// A heading that is no section: a part of an essay, or one issue of a problem answer.
		const section = sectionFor(set, heading.text);
		options = section ? section.prompts : set.body;
	} else {
		// No heading yet: the opening, then the body.
		const opening = set.sections.find((s) => (set.kind === 'essay' ? s.aliases.includes('introduction') : s.optional || s.aliases.includes('material facts')));
		options = [...(opening?.prompts ?? []), ...set.body];
	}
	if (options.length === 0) return null;
	// Each paragraph takes the guide after the one the paragraph before it ended in (the last repeats).
	let index = 0;
	for (const para of written) {
		const ended = resolvePosition(options, index, sentencesBefore(`${para} `) - 1).index;
		index = Math.min(ended + 1, options.length - 1);
	}
	return { from, prompt: options[index]!, sentence: sentencesBefore(text.slice(from, cursor)), options, index };
}

/** The aim of the guide at `cursor`, or null. */
export function promptAt(text: string, cursor: number, set: PromptSet): string | null {
	return guideAt(text, cursor, set)?.prompt.aim ?? null;
}

/** A new essay or answer from a prompt set: its outline as plain headings, under a title. */
export function outline(set: PromptSet, title: string): string {
	const value = set.custom ? set.name : set.id;
	const lines = ['---', 'aglc: true', `${PROMPTS_PROPERTY}: ${/[:#'"]/.test(value) ? JSON.stringify(value) : value}`, '---', `# ${title}`, ''];
	const h = (level: number, name: string) => { lines.push(`${'#'.repeat(level)} ${name}`, ''); };
	if (set.kind === 'problem') {
		const top = set.sections.filter((s) => !s.perIssue && !s.optional);
		const perIssue = set.sections.filter((s) => s.perIssue);
		const closing = top.filter((s) => /conclusion|advice|recommend/.test(s.name.toLowerCase()));
		for (const s of top.filter((s) => !closing.includes(s))) h(2, s.name);
		h(2, set.issueHeading ? 'Issue 1: [the issue, as a short question]' : 'Issue 1: [the issue in a few words]');
		for (const s of perIssue) h(3, s.name);
		for (const s of closing) h(2, s.name);
	} else {
		const intro = set.sections.find((s) => s.aliases.includes('introduction'));
		const close = set.sections.find((s) => s.aliases.includes('conclusion'));
		if (intro) h(2, intro.name);
		h(2, '[Your first point]');
		h(2, '[Your second point]');
		for (const s of set.sections.filter((s) => s !== intro && s !== close && !s.optional)) h(2, s.name);
		if (close) h(2, close.name);
	}
	return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

/**
 * A prompt set defined in a note: frontmatter `aglc-prompt-set: <name>` (and `aglc-prompt-kind: essay` or
 * `problem`), then a `##` heading for each section. Each list item is the guide for one paragraph (the
 * first, second, … in the section; the last repeats), and the items indented under it are its sentences:
 *
 *   ## Rule | Law | Relevant law (each issue)
 *   - Rule: the governing principle and its source
 *   	- Rule: the principle in general terms.
 *   	- Authority: its source, cited in AGLC4.
 *
 * Alternative headings for a section follow `|`. "(each issue)" marks a section that belongs to each issue
 * of a problem answer, "(optional)" one left out of a new essay's outline. `## Body` holds the guides for
 * paragraphs under any other heading, and `## Issue heading` the guide for an issue's heading.
 */
export function parseCustomSet(path: string, frontmatter: Record<string, unknown> | undefined, text: string): PromptSet | null {
	const name = frontmatter?.[CUSTOM_SET_PROPERTY];
	if (typeof name !== 'string' || !name.trim()) return null;
	const kindValue = frontmatter?.[CUSTOM_KIND_PROPERTY];
	const kind: PromptKind = typeof kindValue === 'string' && kindValue.trim().toLowerCase() === 'problem' ? 'problem' : 'essay';
	const sections: PromptSection[] = [];
	const body: Prompt[] = [];
	const issueHeading: Prompt[] = [];
	const alternatives: Prompt[] = [];
	let current: Prompt[] | null = null;
	for (const line of text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')) {
		const h = /^##[ \t]+(.+?)\s*$/.exec(line);
		if (h) {
			let heading = h[1]!;
			const perIssue = /\(each issue\)/i.test(heading);
			const optional = /\(optional\)/i.test(heading);
			heading = heading.replace(/\((?:each issue|optional)\)/gi, '').trim();
			const names = heading.split('|').map((n) => n.trim()).filter(Boolean);
			const first = names[0]?.toLowerCase();
			if (!first) { current = null; continue; }
			if (first === 'body' || first === 'paragraphs') { current = body; continue; }
			if (first === 'issue heading') { current = issueHeading; continue; }
			if (first === 'alternatives' || first === 'other sentences') { current = alternatives; continue; }
			const section: PromptSection = { name: names[0]!, aliases: names.map((n) => headingKey(n)), prompts: [], ...(perIssue ? { perIssue } : {}), ...(optional ? { optional } : {}) };
			sections.push(section);
			current = section.prompts;
			continue;
		}
		const item = /^([ \t]*)[-*+][ \t]+(.+?)\s*$/.exec(line);
		if (!item || !current) continue;
		const nested = item[1]!.length > 0;
		const last = current[current.length - 1];
		if (nested && last) last.sentences.push(item[2]!);
		else current.push({ aim: item[2]!, sentences: [] });
	}
	return {
		id: `custom:${name.trim().toLowerCase()}`,
		name: name.trim(),
		kind,
		description: `Custom prompt set (${path})`,
		sections,
		body,
		...(issueHeading[0] ? { issueHeading: issueHeading[0] } : {}),
		alternatives: alternatives.length > 0 ? alternatives.map((a) => a.aim) : defaultAlternatives(kind),
		sources: [path],
		custom: true,
		path,
	};
}

/** A prompt set written out as a note, to copy a built-in set and edit it as a custom set. */
export function setToNote(set: PromptSet, name: string): string {
	const lines = ['---', `${CUSTOM_SET_PROPERTY}: ${JSON.stringify(name)}`, `${CUSTOM_KIND_PROPERTY}: ${set.kind}`, '---', '',
		`Prompts for "${name}", copied from "${set.name}". Edit the headings and list items freely.`,
		'Each "##" heading is a section; alternative headings for it follow "|". "(each issue)" marks a section that belongs to each issue of a problem answer; "(optional)" leaves a section out of a new outline. Each list item is the guide for one paragraph (the first, second, … in the section; the last repeats), and the items indented under it are its sentences, in order. "Body" holds the guides for paragraphs under any other heading; "Alternatives", the other sentences to cycle through.',
		`To use it, set the property ${PROMPTS_PROPERTY}: "${name}" on a note, or run "New legal essay or problem answer".`, ''];
	const items = (prompts: Prompt[]) => prompts.flatMap((p) => [`- ${p.aim}`, ...p.sentences.map((x) => `\t- ${x}`)]);
	for (const s of set.sections) {
		const names = [s.name, ...s.aliases.filter((a) => a !== s.name.toLowerCase())];
		lines.push(`## ${names.join(' | ')}${s.perIssue ? ' (each issue)' : ''}${s.optional ? ' (optional)' : ''}`, '', ...items(s.prompts), '');
	}
	lines.push('## Body', '', ...items(set.body), '');
	if (set.issueHeading) lines.push('## Issue heading', '', ...items([set.issueHeading]), '');
	lines.push('## Alternatives', '', 'Other sentences to cycle through when the next sentence needs to do something the guide does not list.', '', ...set.alternatives.map((a) => `- ${a}`), '');
	if (set.sources.length > 0) lines.push(`Based on: ${set.sources.join('; ')}.`, '');
	return lines.join('\n');
}
