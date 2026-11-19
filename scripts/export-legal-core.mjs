#!/usr/bin/env node
/*
 * Generate the Legal Core (Australia) repository, blursedperf/obsidian-legal-core, from this one.
 *
 *   node scripts/export-legal-core.mjs <path to a clone of obsidian-legal-core>
 *
 * Obsidian's community directory lists one plugin per repository, read from the repository root, so Legal
 * Core is released from a repository of its own. Its source is developed here, with AGLC4 Citations and
 * the packages they share; this script writes everything Legal Core needs into the other repository:
 * the plugin at its root (manifest.json, versions.json, src/), the packages it bundles, the case-notes
 * example, its tests and goldens, and the build, audit and release workflow. Then commit and push there.
 *
 * Everything in the target except .git, node_modules, package-lock.json and versions.json is replaced, so
 * nothing edited there by hand survives: change Legal Core here, and export again. versions.json there is
 * kept (it lists every released version) and gains the current version.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] ? resolve(process.argv[2]) : null;
if (!target) {
	console.error("Usage: node scripts/export-legal-core.mjs <path to a clone of obsidian-legal-core>");
	process.exit(1);
}
if (resolve(target) === resolve(ROOT)) throw new Error("The target must be another repository.");
mkdirSync(target, { recursive: true });

const KEEP = new Set([".git", "node_modules", "package-lock.json", "versions.json"]);
for (const name of readdirSync(target)) if (!KEEP.has(name)) rmSync(join(target, name), { recursive: true, force: true });

const from = (...p) => join(ROOT, ...p);
const to = (...p) => join(target, ...p);
const copy = (src, dest) => cpSync(from(src), to(dest), { recursive: true });
const read = (p) => readFileSync(from(p), "utf8");
const write = (p, text) => { mkdirSync(dirname(to(p)), { recursive: true }); writeFileSync(to(p), text); };
const json = (value) => `${JSON.stringify(value, null, "\t")}\n`;

const GENERATED = "Generated from blursedperf/obsidian-aglc4 by scripts/export-legal-core.mjs: change it there, not here.";

// --- the plugin, at the root
const manifest = JSON.parse(read("plugins/legal-core/manifest.json"));
write("manifest.json", json(manifest));
copy("plugins/legal-core/src", "src");
copy("plugins/legal-core/API.md", "API.md");
const versions = existsSync(to("versions.json")) ? JSON.parse(readFileSync(to("versions.json"), "utf8")) : {};
versions[manifest.version] ??= manifest.minAppVersion;
write("versions.json", json(versions));

// --- the packages it bundles, and the example for plugin authors
const PACKAGES = ["ldm", "md-pipeline", "docx-engine", "aglc", "authority-store", "legal-core-api"];
for (const p of PACKAGES) {
	copy(`packages/${p}/src`, `packages/${p}/src`);
	copy(`packages/${p}/package.json`, `packages/${p}/package.json`);
}
copy("examples/case-notes", "examples/case-notes");

// --- tests: Legal Core's own, and the goldens that prove its engine exports exactly as AGLC4's does
for (const f of ["legal-core.test.ts", "golden.test.ts", "obsidian-stub.ts"]) {
	write(`test/${f}`, read(`test/${f}`).replaceAll("../plugins/legal-core/src/", "../src/"));
}
copy("test/fixtures", "test/fixtures");
copy("test/golden", "test/golden");
rmSync(to("test/golden/settings-defaults.json"), { force: true });

// --- build, audit, configuration
copy("scripts/build-plugin.mjs", "scripts/build-plugin.mjs");
copy("scripts/offline-audit.mjs", "scripts/offline-audit.mjs");
copy("version-bump.mjs", "version-bump.mjs");
copy("vitest.config.ts", "vitest.config.ts");
copy("LICENSE", "LICENSE");
copy(".gitignore", ".gitignore");
copy(".github/workflows/release.yml", ".github/workflows/release.yml");
copy(".github/workflows/lint.yml", ".github/workflows/lint.yml");

write("esbuild.config.mjs", `/**
 * Builds Legal Core to main.js (see scripts/build-plugin.mjs). "production" builds once; otherwise it watches.
 * ${GENERATED}
 */
import process from 'process';
import { buildAll, watchAll } from './scripts/build-plugin.mjs';

const PLUGINS = [{ id: 'legal-core', name: 'Legal Core', entry: 'src/main.ts', outfile: 'main.js' }];

if (process.argv[2] === 'production') {
	await buildAll(PLUGINS);
	process.exit(0);
} else {
	await watchAll(PLUGINS);
}
`);

const tsconfig = JSON.parse(read("tsconfig.json"));
tsconfig.include = ["packages/*/src/**/*.ts", "src/**/*.ts", "examples/*/src/**/*.ts"];
write("tsconfig.json", json(tsconfig));

write("eslint.config.mts", read("eslint.config.mts")
	.replace("'tsconfig.aglc4.json',\n", "")
	.replaceAll("files: ['packages/*/src/**/*.ts', 'plugins/*/src/**/*.ts', 'examples/*/src/**/*.ts'],", "files: ['packages/*/src/**/*.ts', 'src/**/*.ts', 'examples/*/src/**/*.ts'],")
	.replace(/\n\t\{\n\t\t\/\/ AGLC4 Citations is standalone\.[\s\S]*?\n\t\},\n(?=\);)/, "\n"));

const rootPkg = JSON.parse(read("package.json"));
const corePkg = JSON.parse(read("plugins/legal-core/package.json"));
write("package.json", json({
	name: "obsidian-legal-core",
	version: manifest.version,
	description: manifest.description,
	main: "main.js",
	type: "module",
	workspaces: ["packages/*", "examples/*"],
	scripts: {
		dev: "node esbuild.config.mjs",
		build: "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
		test: "vitest run && node scripts/offline-audit.mjs",
		version: "node version-bump.mjs && git add manifest.json versions.json",
		lint: "eslint .",
	},
	keywords: ["obsidian", "plugin", "law", "legal", "australia", "aglc4", "authorities"],
	author: rootPkg.author,
	license: rootPkg.license,
	devDependencies: rootPkg.devDependencies,
	dependencies: corePkg.dependencies,
}));

write("README.md", `${read("plugins/legal-core/README.md")
	.replace("[API.md](API.md)", "[API.md](API.md)")
	.replace("[`examples/case-notes`](../../examples/case-notes)", "[`examples/case-notes`](examples/case-notes)")}
## Development

Legal Core is developed in [blursedperf/obsidian-aglc4](https://github.com/blursedperf/obsidian-aglc4), together with AGLC4 Citations and the packages they share, and this repository is generated from it (\`scripts/export-legal-core.mjs\`). Make changes there; this repository is for releasing Legal Core.

\`\`\`bash
npm install
npm run build   # type-check and build main.js
npm test        # tests, golden exports and the offline audit
npm run lint
\`\`\`
`);
write("API.md", read("plugins/legal-core/API.md")
	.replace("[`examples/case-notes`](../../examples/case-notes/src/main.ts)", "[`examples/case-notes`](examples/case-notes/src/main.ts)"));

console.log(`Exported Legal Core ${manifest.version} to ${target}.`);
