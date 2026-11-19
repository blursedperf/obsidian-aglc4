/**
 * Which prompt to show where, new essays from a prompt set, and prompt sets defined in notes.
 */
import { excludedRanges, scanFootnotes } from '../footnotes';
import { BUILT_IN_SETS, type PromptKind, type PromptSection, type PromptSet } from './sets';

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

/**
 * The prompt for an empty paragraph at `cursor`, or null when none applies (the line has text, or is in
 * a footnote, frontmatter, code or a comment).
 */
export function promptAt(text: string, cursor: number, set: PromptSet): string | null {
	const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
	const nl = text.indexOf('\n', cursor);
	const line = text.slice(lineStart, nl === -1 ? text.length : nl);
	const emptyHeading = /^#{1,6}[ \t]*$/.test(line);
	if (line.trim() !== '' && !emptyHeading) return null;

	const excluded: [number, number][] = [...excludedRanges(text), ...scanFootnotes(text).defs.map((d): [number, number] => [d.from, d.to + 1])];
	const inExcluded = (at: number) => excluded.some(([a, b]) => at >= a && at < b);
	if (inExcluded(lineStart)) return null;
	if (emptyHeading) return set.kind === 'problem' && set.issueHeading ? set.issueHeading : null;

	// The headings outside footnotes, code and comments.
	const headings: { at: number; level: number; text: string }[] = [];
	const re = /^(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/gm;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		if (!inExcluded(m.index)) headings.push({ at: m.index, level: m[1]!.length, text: m[2]! });
	}
	// A note that opens with its only # heading: that heading is the title, not a section.
	const title = headings[0]?.level === 1 && headings.filter((h) => h.level === 1).length === 1 ? headings[0] : null;
	const before = headings.filter((h) => h.at < lineStart && h !== title);
	const heading = before.length > 0 ? before[before.length - 1]! : null;

	// The paragraphs written between that heading (or the title, or the start) and the cursor.
	let from = heading ? heading.at : title && title.at < lineStart ? title.at : 0;
	from = text.indexOf('\n', from) + 1 || lineStart;
	let paragraphs = 0;
	let inParagraph = false;
	let offset = from;
	for (const l of text.slice(from, lineStart).split('\n')) {
		const at = offset;
		offset += l.length + 1;
		if (at >= lineStart) break;
		if (inExcluded(at) || l.trim() === '' || /^---\s*$/.test(l)) { inParagraph = false; continue; }
		if (!inParagraph) paragraphs++;
		inParagraph = true;
	}

	const pick = (prompts: string[], n: number) => (prompts.length > 0 ? prompts[Math.min(n, prompts.length - 1)]! : null);
	const body = (n: number) => (set.kind === 'essay' ? (set.body.length > 0 ? set.body[n % set.body.length]! : null) : pick(set.body, n));
	if (heading) {
		const section = sectionFor(set, heading.text);
		// A heading that is no section: a point of an essay, or one issue of a problem answer.
		return section ? pick(section.prompts, paragraphs) : body(paragraphs);
	}
	// No heading yet: the opening, then the body.
	const opening = set.sections.find((s) => (set.kind === 'essay' ? s.aliases.includes('introduction') : s.optional || s.aliases.includes('material facts')));
	if (opening && paragraphs === 0) return opening.prompts[0] ?? null;
	return body(opening ? paragraphs - 1 : paragraphs);
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
 * `problem`), then a `##` heading for each section with its prompts as list items:
 *
 *   ## Rule | Law | Relevant law (each issue)
 *   - State the rule as a general principle, with its authority.
 *
 * Alternative headings for a section follow `|`. "(each issue)" marks a section that belongs to each issue
 * of a problem answer, "(optional)" one left out of a new essay's outline. `## Body` holds the prompts for
 * paragraphs under any other heading.
 */
export function parseCustomSet(path: string, frontmatter: Record<string, unknown> | undefined, text: string): PromptSet | null {
	const name = frontmatter?.[CUSTOM_SET_PROPERTY];
	if (typeof name !== 'string' || !name.trim()) return null;
	const kindValue = frontmatter?.[CUSTOM_KIND_PROPERTY];
	const kind: PromptKind = typeof kindValue === 'string' && kindValue.trim().toLowerCase() === 'problem' ? 'problem' : 'essay';
	const sections: PromptSection[] = [];
	let body: string[] = [];
	let current: string[] | null = null;
	for (const line of text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')) {
		const h = /^##[ \t]+(.+?)\s*$/.exec(line);
		if (h) {
			let heading = h[1]!;
			const perIssue = /\(each issue\)/i.test(heading);
			const optional = /\(optional\)/i.test(heading);
			heading = heading.replace(/\((?:each issue|optional)\)/gi, '').trim();
			const names = heading.split('|').map((n) => n.trim()).filter(Boolean);
			if (names.length === 0) { current = null; continue; }
			if (names[0]!.toLowerCase() === 'body' || names[0]!.toLowerCase() === 'paragraphs') {
				current = body = [];
				continue;
			}
			const section: PromptSection = { name: names[0]!, aliases: names.map((n) => headingKey(n)), prompts: [], ...(perIssue ? { perIssue } : {}), ...(optional ? { optional } : {}) };
			sections.push(section);
			current = section.prompts;
			continue;
		}
		const item = /^\s*[-*+]\s+(.+?)\s*$/.exec(line);
		if (item && current) current.push(item[1]!);
	}
	return {
		id: `custom:${name.trim().toLowerCase()}`,
		name: name.trim(),
		kind,
		description: `Custom prompt set (${path})`,
		sections,
		body,
		sources: [path],
		custom: true,
		path,
	};
}

/** A prompt set written out as a note, to copy a built-in set and edit it as a custom set. */
export function setToNote(set: PromptSet, name: string): string {
	const lines = ['---', `${CUSTOM_SET_PROPERTY}: ${JSON.stringify(name)}`, `${CUSTOM_KIND_PROPERTY}: ${set.kind}`, '---', '',
		`Prompts for "${name}", copied from "${set.name}". Edit the prompts (the list items) and section headings freely.`,
		'Alternative headings for a section follow "|". "(each issue)" marks a section that belongs to each issue of a problem answer; "(optional)" leaves a section out of a new outline. "Body" holds the prompts for paragraphs under any other heading.',
		`To use it, set the property ${PROMPTS_PROPERTY}: "${name}" on a note, or run "New legal essay".`, ''];
	for (const s of set.sections) {
		const names = [s.name, ...s.aliases.filter((a) => a !== s.name.toLowerCase())];
		lines.push(`## ${names.join(' | ')}${s.perIssue ? ' (each issue)' : ''}${s.optional ? ' (optional)' : ''}`, '', ...s.prompts.map((p) => `- ${p}`), '');
	}
	lines.push('## Body', '', ...set.body.map((p) => `- ${p}`), '');
	if (set.sources.length > 0) lines.push(`Based on: ${set.sources.join('; ')}.`, '');
	return lines.join('\n');
}
