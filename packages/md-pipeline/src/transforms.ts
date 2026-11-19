/**
 * Ordered transforms: steps that change a parsed document before it is rendered. Each names the steps it
 * must run after; they run in an order that respects those dependencies, and otherwise in the order given.
 */
import type { MdDocument } from '@legal-core/ldm';

export interface Transform<C = unknown> {
	/** Unique among the transforms run together. */
	id: string;
	/** Ids of transforms that must run before this one. */
	after?: string[];
	run(doc: MdDocument, ctx: C): void;
}

export class TransformOrderError extends Error {}

/**
 * The transforms in an order that respects their dependencies, keeping the given order where it is free
 * (a stable topological sort). Throws on a duplicate id, a dependency on an unknown transform, or a cycle,
 * naming the transforms involved.
 */
export function orderTransforms<C>(transforms: readonly Transform<C>[]): Transform<C>[] {
	const byId = new Map<string, Transform<C>>();
	for (const t of transforms) {
		if (byId.has(t.id)) throw new TransformOrderError(`Two transforms have the id "${t.id}".`);
		byId.set(t.id, t);
	}
	for (const t of transforms) {
		for (const dep of t.after ?? []) {
			if (!byId.has(dep)) throw new TransformOrderError(`Transform "${t.id}" runs after "${dep}", which is not registered.`);
		}
	}
	const out: Transform<C>[] = [];
	const done = new Set<string>();
	const visiting: string[] = [];
	const visit = (t: Transform<C>) => {
		if (done.has(t.id)) return;
		const at = visiting.indexOf(t.id);
		if (at >= 0) throw new TransformOrderError(`Transforms depend on each other in a cycle: ${[...visiting.slice(at), t.id].join(' → ')}.`);
		visiting.push(t.id);
		for (const dep of t.after ?? []) visit(byId.get(dep)!);
		visiting.pop();
		done.add(t.id);
		out.push(t);
	};
	for (const t of transforms) visit(t);
	return out;
}

/** Run the transforms on the document, in dependency order. */
export function runTransforms<C>(doc: MdDocument, transforms: readonly Transform<C>[], ctx: C): MdDocument {
	for (const t of orderTransforms(transforms)) t.run(doc, ctx);
	return doc;
}
