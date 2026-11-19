/**
 * A line diff (Myers' O(ND) algorithm), for showing what changed between two versions of a note.
 */

export interface DiffLine {
	type: 'same' | 'add' | 'del';
	text: string;
}

/** The lines of `b` compared with `a`: kept, added (in `b` only) and deleted (in `a` only). */
export function diffLines(a: string, b: string): DiffLine[] {
	const x = a.split('\n');
	const y = b.split('\n');
	// Common prefix and suffix are kept as they are, which keeps the search small for typical edits.
	let start = 0;
	while (start < x.length && start < y.length && x[start] === y[start]) start++;
	let endX = x.length;
	let endY = y.length;
	while (endX > start && endY > start && x[endX - 1] === y[endY - 1]) { endX--; endY--; }
	const middle = myers(x.slice(start, endX), y.slice(start, endY));
	return [
		...x.slice(0, start).map((text): DiffLine => ({ type: 'same', text })),
		...middle,
		...x.slice(endX).map((text): DiffLine => ({ type: 'same', text })),
	];
}

function myers(a: string[], b: string[]): DiffLine[] {
	const n = a.length;
	const m = b.length;
	if (n === 0) return b.map((text) => ({ type: 'add', text }));
	if (m === 0) return a.map((text) => ({ type: 'del', text }));
	const max = n + m;
	const v = new Map<number, number>([[1, 0]]);
	const trace: Map<number, number>[] = [];
	outer: for (let d = 0; d <= max; d++) {
		trace.push(new Map(v));
		for (let k = -d; k <= d; k += 2) {
			let px = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? v.get(k + 1)! : v.get(k - 1)! + 1;
			let py = px - k;
			while (px < n && py < m && a[px] === b[py]) { px++; py++; }
			v.set(k, px);
			if (px >= n && py >= m) break outer;
		}
	}
	// Walk back through the trace to recover the edit script.
	const out: DiffLine[] = [];
	let px = n;
	let py = m;
	for (let d = trace.length - 1; d >= 0; d--) {
		const vd = trace[d]!;
		const k = px - py;
		const prevK = k === -d || (k !== d && (vd.get(k - 1) ?? -1) < (vd.get(k + 1) ?? -1)) ? k + 1 : k - 1;
		const prevX = vd.get(prevK) ?? 0;
		const prevY = prevX - prevK;
		while (px > prevX && py > prevY) { out.push({ type: 'same', text: a[px - 1]! }); px--; py--; }
		if (d > 0) {
			if (px === prevX) out.push({ type: 'add', text: b[py - 1]! });
			else out.push({ type: 'del', text: a[px - 1]! });
		}
		px = prevX;
		py = prevY;
	}
	return out.reverse();
}

/** Counts of added and deleted lines. */
export function diffStats(lines: DiffLine[]): { added: number; deleted: number } {
	return {
		added: lines.filter((l) => l.type === 'add').length,
		deleted: lines.filter((l) => l.type === 'del').length,
	};
}
