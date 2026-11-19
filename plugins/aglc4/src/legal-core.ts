/**
 * Optional integration with Legal Core (Australia). AGLC4 Citations works the same without it: this only
 * shares the authorities its notes cite with Legal Core's authority store, so other legal plugins see the
 * same sources. Export always uses AGLC4's own engine, so its output never depends on Legal Core.
 *
 * Only the API's types are imported (they compile to nothing): there is no run-time dependency on Legal
 * Core, and the build fails if one is added.
 */
import type { LegalCoreApi } from '@legal-core/api';
import { AGLC4_SOURCE, noteAuthorities } from '@legal-core/aglc';

/** The Legal Core API versions this plugin works with. */
export const LEGAL_CORE_RANGE = '^1.0';
export const LEGAL_CORE_ID = 'au-legal-core';

/** The API, if `candidate` is a Legal Core API this plugin can use; otherwise null. */
export function compatibleApi(candidate: unknown): LegalCoreApi | null {
	const api = candidate as Partial<LegalCoreApi> | null | undefined;
	if (!api || typeof api !== 'object' || typeof api.satisfies !== 'function' || typeof api.registerExtension !== 'function' || !api.authorities) return null;
	try {
		return api.satisfies(LEGAL_CORE_RANGE) ? (api as LegalCoreApi) : null;
	} catch {
		return null;
	}
}

export interface LegalCoreLinkHost {
	/** Whether to share citations (the "Share citations with Legal Core" setting). */
	sharing(): boolean;
	/** Called once each time a compatible Legal Core is connected. */
	onConnected(api: LegalCoreApi): void;
	/** A problem worth logging, but never worth interrupting the user for. */
	warn(message: string, error: unknown): void;
}

/** The connection to Legal Core: absent, connected, or gone again. */
export class LegalCoreLink {
	private current: LegalCoreApi | null = null;
	private unregister: (() => void) | null = null;

	constructor(private host: LegalCoreLinkHost) {}

	get api(): LegalCoreApi | null {
		return this.current;
	}

	/**
	 * Connect to a Legal Core API, if it is one this plugin can use. Calling it again with the same API does
	 * nothing; with a new one (Legal Core reloaded), it reconnects. Returns whether it is connected.
	 */
	connect(candidate: unknown): boolean {
		const api = compatibleApi(candidate);
		if (!api) return this.current !== null;
		if (api === this.current) return true;
		this.disconnect();
		try {
			this.unregister = api.registerExtension({ id: AGLC4_SOURCE });
		} catch (e) {
			this.host.warn('Could not register with Legal Core', e);
			return false;
		}
		this.current = api;
		this.host.onConnected(api);
		return true;
	}

	/** Legal Core was disabled, or this plugin is unloading: stop using it. */
	disconnect() {
		try {
			this.unregister?.();
		} catch {
			// Legal Core has already gone, and its registry with it.
		}
		this.unregister = null;
		this.current = null;
	}

	/**
	 * Share the authorities a note cites with Legal Core. Does nothing when Legal Core is not connected or
	 * sharing is off. Only adds or updates records: it never removes one, and never changes the note.
	 * Returns how many authorities were shared.
	 */
	async shareNote(path: string, markdown: string): Promise<number> {
		const api = this.current;
		if (!api || !this.host.sharing()) return 0;
		let shared = 0;
		for (const input of noteAuthorities(markdown, path)) {
			if (this.current !== api) break;
			try {
				await api.authorities.upsert(input);
				shared++;
			} catch (e) {
				this.host.warn(`Could not share an authority from ${path} with Legal Core`, e);
				break;
			}
		}
		return shared;
	}
}
