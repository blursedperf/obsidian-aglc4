#!/usr/bin/env node
/*
 * Build both plugins and link them into a test vault, so the vault always runs the latest build.
 *
 *   node scripts/dev-vault.mjs <vault>           build once and link
 *   node scripts/dev-vault.mjs <vault> --watch   rebuild on every change (then reload the plugin in
 *                                                Obsidian, or use the Hot Reload plugin with --hot)
 *   node scripts/dev-vault.mjs <vault> --copy    copy the files instead of linking them
 *   node scripts/dev-vault.mjs <vault> --hot     also mark the plugins for the Hot Reload plugin (which may
 *                                                not notice changes made through links)
 *   npm run dev:vault -- <vault> [--watch]
 *
 * Only the built files (main.js, manifest.json, styles.css) are linked, each on its own. The plugin
 * folders themselves stay in the vault, so each plugin's settings (data.json) stay there too and are
 * never written into the repository.
 */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAll, watchAll } from "./build-plugin.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Each plugin: where its release files are in the repository. */
const PLUGINS = [
	{ id: "aglc4", name: "AGLC4 Citations", entry: "plugins/aglc4/src/main.ts", outfile: "main.js", files: ["main.js", "manifest.json", "styles.css"], dir: "." },
	{ id: "legal-core", name: "Legal Core", entry: "plugins/legal-core/src/main.ts", outfile: "plugins/legal-core/main.js", files: ["main.js", "manifest.json"], dir: "plugins/legal-core" },
];

function usage(message) {
	if (message) console.error(message);
	console.error("Usage: node scripts/dev-vault.mjs <vault> [--watch] [--copy] [--hot]");
	process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [vaultArg] = args.filter((a) => !a.startsWith("--"));
for (const f of flags) if (!["--watch", "--copy", "--hot"].includes(f)) usage(`Unknown option ${f}.`);
if (!vaultArg) usage("Give the path of the test vault.");
const vault = resolve(vaultArg);
if (!existsSync(join(vault, ".obsidian"))) usage(`${vault} is not an Obsidian vault (it has no .obsidian folder).`);

function link(plugin) {
	const manifest = JSON.parse(readFileSync(join(ROOT, plugin.dir, "manifest.json"), "utf8"));
	const target = join(vault, ".obsidian", "plugins", manifest.id);
	mkdirSync(target, { recursive: true });
	for (const file of plugin.files) {
		const source = join(ROOT, plugin.dir, file);
		if (!existsSync(source)) throw new Error(`${relative(ROOT, source)} is missing: build first.`);
		const dest = join(target, file);
		if (existsSync(dest) || isLink(dest)) rmSync(dest, { force: true });
		if (flags.has("--copy")) copyFileSync(source, dest);
		else symlinkSync(source, dest);
	}
	if (flags.has("--hot")) writeFileSync(join(target, ".hotreload"), "");
	console.log(`${plugin.name}: ${flags.has("--copy") ? "copied" : "linked"} ${plugin.files.join(", ")} into ${target}`);
}

function isLink(path) {
	try {
		return lstatSync(path).isSymbolicLink();
	} catch {
		return false;
	}
}

if (flags.has("--watch")) {
	// The first build must finish before the files can be linked.
	await buildAll(PLUGINS);
	for (const p of PLUGINS) link(p);
	if (flags.has("--copy")) console.log("Note: with --copy, rebuilt files are not copied again; use links to see each rebuild.");
	console.log("Watching for changes. Reload a plugin in Obsidian to load a rebuild.");
	await watchAll(PLUGINS);
} else {
	await buildAll(PLUGINS);
	for (const p of PLUGINS) link(p);
	console.log("Reload the plugins in Obsidian (turn them off and on in Community plugins, or restart Obsidian).");
	process.exit(0);
}
