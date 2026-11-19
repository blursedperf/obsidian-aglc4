/**
 * Existing users' settings must keep working: every key saved by the plugin before the Legal Core
 * refactor must still exist, with the same default. test/golden/settings-defaults.json is the
 * snapshot from before the refactor (1.9.3).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_SETTINGS } from '../plugins/aglc4/src/settings';

const SNAPSHOT = new URL('golden/settings-defaults.json', import.meta.url);

describe('settings compatibility', () => {
	it('keeps every setting key and default from before the refactor', () => {
		if (process.env.UPDATE_GOLDEN === '1') writeFileSync(SNAPSHOT, `${JSON.stringify(DEFAULT_SETTINGS, null, '\t')}\n`);
		expect(existsSync(SNAPSHOT), 'missing settings snapshot').toBe(true);
		const before = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as Record<string, unknown>;
		const now = DEFAULT_SETTINGS as unknown as Record<string, unknown>;
		for (const [key, value] of Object.entries(before)) expect([key, now[key]]).toEqual([key, value]);
	});
});
