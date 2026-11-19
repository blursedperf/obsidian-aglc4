import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings';
import { noteEnabled, noteSettings, parseFolders } from '../src/scope';

const s = (scope: 'all' | 'marked' | 'marked-folders', scopeFolders = '') => ({ scope, scopeFolders });

describe('which notes the plugin works in', () => {
	it('all notes, unless a note is turned off', () => {
		expect(noteEnabled(s('all'), 'Shopping.md', null)).toBe(true);
		expect(noteEnabled(s('all'), 'Shopping.md', { aglc: false })).toBe(false);
	});
	it('assignment notes only', () => {
		expect(noteEnabled(s('marked'), 'Shopping.md', null)).toBe(false);
		expect(noteEnabled(s('marked'), 'Shopping.md', { tags: ['x'] })).toBe(false);
		expect(noteEnabled(s('marked'), 'Essay.md', { aglc: true })).toBe(true);
		// Properties typed by hand, as text.
		expect(noteEnabled(s('marked'), 'Essay.md', { aglc: 'yes' })).toBe(true);
		expect(noteEnabled(s('marked'), 'Essay.md', { aglc: 'false' })).toBe(false);
	});
	it('assignment notes and notes in folders, including subfolders', () => {
		const set = s('marked-folders', 'Law/Assignments\n/Moot/');
		expect(noteEnabled(set, 'Law/Assignments/Essay.md', null)).toBe(true);
		expect(noteEnabled(set, 'Law/Assignments/2026/Essay.md', null)).toBe(true);
		expect(noteEnabled(set, 'Moot/Submissions.md', null)).toBe(true);
		expect(noteEnabled(set, 'Law/Assignments2/Essay.md', null)).toBe(false);
		expect(noteEnabled(set, 'Law/Notes.md', null)).toBe(false);
		// A note in a folder can still be turned off, and one outside turned on.
		expect(noteEnabled(set, 'Law/Assignments/Scratch.md', { aglc: false })).toBe(false);
		expect(noteEnabled(set, 'Elsewhere.md', { aglc: true })).toBe(true);
		expect(parseFolders(' a/b/ , c\n\n')).toEqual(['a/b', 'c']);
	});
});

describe("a note's own style", () => {
	it('overrides the settings for that note only', () => {
		const n = noteSettings(DEFAULT_SETTINGS, { 'aglc-headings': 'aglc', 'aglc-bibliography': true, 'aglc-line-spacing': 2, 'aglc-font': 'Garamond', 'aglc-font-size': '11.5' });
		expect(n.headingScheme).toBe('aglc');
		expect(n.bibliography).toBe(true);
		expect(n.lineSpacing).toBe(2);
		expect(n.font).toBe('Garamond');
		expect(n.fontSize).toBe(11.5);
		expect(DEFAULT_SETTINGS.headingScheme).toBe('plain');
	});
	it('ignores values it does not understand, and notes without properties', () => {
		const n = noteSettings(DEFAULT_SETTINGS, { 'aglc-headings': 'fancy', 'aglc-line-spacing': 3, 'aglc-font-size': 'big', 'aglc-bibliography': 'perhaps' });
		expect(n).toEqual(DEFAULT_SETTINGS);
		expect(noteSettings(DEFAULT_SETTINGS, null)).toBe(DEFAULT_SETTINGS);
	});
});
