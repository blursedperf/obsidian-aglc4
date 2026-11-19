# Refactor plan: Legal Core and a standalone AGLC4 plugin

Phase 0 of the Legal Core refactor. Nothing in the code has changed yet; this plan needs approval first.

Repo: `obsidian-aglc4` (this repository). Plugin id: `aglc-citations` (version 1.9.3, minimum Obsidian 1.7.2, `isDesktopOnly: false`). Test vault: `~/Downloads/testing`. Branch: `refactor/legal-core`.

## 1. Current architecture

**Build and tooling.** npm (with `package-lock.json`), TypeScript, esbuild (`esbuild.config.mjs`, one entry point `src/main.ts` → `main.js` at the repo root, CommonJS, not minified), vitest (15 test files, 515 tests), ESLint with `eslint-plugin-obsidianmd`. The esbuild config has a plugin that removes the three base64 calls from the `docx` library at build time and fails the build if that library code changes. `npm test` also runs `scripts/offline-audit.mjs`, which fails the build if the source, the bundle or the styles could make a network request, run generated code, use base64 or inject HTML. `scripts/word-fidelity.mjs` checks the page preview against PDFs saved from Word.

**Release.** `.github/workflows/release.yml` builds at the repo root on a tag, attests `main.js` and `styles.css`, and drafts a release with `main.js`, `manifest.json` and `styles.css`. Obsidian reads `manifest.json` and `versions.json` **from the repo root** to find updates, so their location is load-bearing.

**Runtime dependencies.** `docx` (Word writer), `fflate` (zip for import and gzip for history). There are no Node APIs anywhere in `src/` (checked: no `fs`, `path`, `Buffer`, `process` or `require`). Word export already uses `Packer.toArrayBuffer()`, which is mobile-safe and equivalent to `toBlob()`.

**Source (8,668 lines).** Only seven files import `obsidian`. The rest is plain TypeScript:

| Area | Files | Depends on Obsidian? |
| --- | --- | --- |
| AGLC4 checker | `aglc/grammar.ts` (1,290), `citation.ts`, `lint.ts`, `document.ts`, `data.ts`, `types.ts` | No |
| Bibliography | `aglc/bibliography.ts` | No |
| Markdown | `export/markdown.ts` (a hand-written parser to a block/inline model, plus smart quotes and superscript ordinals) | No |
| Footnotes | `footnotes.ts` (scan, tidy, renumber, `(n X)` remap, safety check) | No |
| Headings | `layout/headings.ts` (AGLC4 r 1.12.2 numbering, back-matter detection) | No |
| Export | `export/docx.ts` (`prepare()` transforms and the Word writer), `export/html.ts` | No |
| Styles | `layout/metrics.ts` (page and paragraph styles shared by Word and the preview) | No |
| Pagination | `layout/paginate.ts` (pure), `layout/preview.ts` (DOM measurement), `layout/view.ts` | Only `view.ts` |
| Import | `import/docx.ts`, `import/xml.ts` (Word → Markdown) | No |
| Version history | `history/store.ts`, `diff.ts` (pure), `manager.ts`, `view.ts` | Only `manager.ts` and `view.ts` |
| Plugin | `main.ts`, `settings.ts`, `scope.ts`, `example.ts`, `editor/*` | Yes |

**The export pipeline today.** `parseMarkdown()` → `prepare()` → writer. `prepare()` runs, in order: AGLC4 heading numbering, the bibliography, superscript ordinals, then smart quotes. Then `DocxBuilder` or the HTML writer runs, with styles from `metrics.styles()`. The page preview runs the same pipeline.

**What the plugin stores.** Only:
- its settings (`data.json`, through `loadData`/`saveData`);
- the version history (vault folder `.aglc-history`).

## 2. Findings that change the brief

1. **There is no citation store.** Citations exist only as footnote text inside notes; nothing is cached or indexed. So the constraint "same citation data format and storage location" holds automatically: the notes stay the source of truth, untouched. The *authority store* is new. AGLC4's "existing citations" for the one-time sync are the citations the checker already recognises in footnotes. The sync reads notes and writes only to the shared store, never to notes.
2. **The Markdown parser is not remark.** It's a hand-written, dependency-free parser. Replacing it with remark/micromark would almost certainly change the export: for example emphasis edge cases, `_` inside words, and Obsidian's `^[inline]` footnotes and `%%comments%%`. It would also add roughly 100–200 KB to both bundles, and give no benefit to the current output. **Proposal:** `md-pipeline` keeps the existing parser and adds the extension registry and ordered transforms around it. A remark-based parser can be added later as an option, if a suite plugin needs syntax the current parser can't express.
3. **"above n" is AGLC3, not AGLC4.** AGLC4 replaced it with `(n X)` (r 1.4.1), which the plugin implements. **Proposal:** the fixtures include an "above n" footnote, to lock in that it is exported exactly as written (today it is neither recognised nor flagged). The `aglc` package does not add "above n" support. Flagging it as AGLC3 would be a checker change and doesn't belong in a behaviour-preserving refactor; I can add it afterwards.
4. **Obsidian lists one plugin per repository, read from the repo root.** Moving AGLC4 to `plugins/aglc4/` must keep `manifest.json` and `versions.json` at the root (Obsidian reads them there) and the release assets the same, or existing users stop receiving updates. **Proposal:** the root `manifest.json` and `versions.json` stay at the root as the published files, and a test fails if they differ from `plugins/aglc4/manifest.json`. The release workflow builds `plugins/aglc4` and attaches the same three files. Legal Core needs **its own repository** to be listed, because the directory maps one id to one repo. It can be developed here and published through a release-only repository later. Nothing is published in this refactor.
5. **"Obsidian-independent" doesn't make the export pipeline generic.** `prepare()` mixes generic steps with AGLC4 ones (heading numbering, bibliography, ordinals, quote style), and `metrics.styles()` holds AGLC4's heading styles. **Proposal:**
   - `docx-engine` owns the document model, the writer, the style schema and templates.
   - `aglc` provides its steps as ordered transforms and its styles as a style set.
   - The AGLC4 pipeline is assembled from those, in today's order, so the output is identical.
6. **Plugin discovery uses undocumented API.** `app.plugins` isn't in Obsidian's public typings, and Obsidian's review bot has flagged API use before. There is also no public event for another plugin being enabled or disabled. **Proposal:**
   - `app.plugins.getPlugin('…')?.api` is the documented lookup, as in the brief and as Dataview does it.
   - Legal Core also announces itself with custom workspace events: `legal-core:ready` on load and `legal-core:unload` on unload.
   - AGLC4 listens for both, so enabling or disabling the core mid-session is handled without polling.
   - `getPlugin` is wrapped in one small, typed function, so it can be replaced if Obsidian objects.

## 3. Target structure (adjusted)

```
/packages
  ldm/               types only: the Legal Document Model (blocks, inlines, footnotes) shared by everything
  md-pipeline/       existing Markdown parser → LDM; footnote scanning, tidying and (n X) remapping;
                     extension registry; ordered transforms (topological sort with cycle detection)
  docx-engine/       LDM → .docx writer; LDM → HTML writer; style schema and template merging;
                     raw-OOXML escape hatch; pagination model (paginate.ts, metrics); .docx → Markdown reader
  aglc/              AGLC4: checker (grammar, lint, citation, document), heading hierarchy, bibliography,
                     AGLC4 transforms (headings, bibliography, ordinals, quotes) and style set;
                     citation → authority-record extraction
  authority-store/   schema (case, legislation, secondary source), storage interface,
                     in-memory and vault-file back ends, subscriptions
  legal-core-api/    public .d.ts types for the Legal Core API (no runtime code)
/plugins
  aglc4/             the existing plugin: UI, editor, settings, history, preview DOM, optional core integration
  legal-core/        the new plugin: hosts the packages, exposes the API, owns the shared authority store
/examples
  case-notes/        a minimal extension showing syntax, a transform and a renderer
/test
  fixtures/          Markdown essays for the golden export tests
  golden/            expected normalised XML from today's export
manifest.json        stays at the root (Obsidian reads it there; kept identical to plugins/aglc4's by a test)
versions.json        stays at the root
```

**Changes from the brief, and why:**
- **`ldm` is its own types-only package.** Both `md-pipeline` (which produces the model) and `docx-engine` (which consumes it) need it. Putting the model in `docx-engine` would make the parser depend on the Word writer.
- **The HTML writer and the `.docx` reader go into `docx-engine`.** They share the model and the style handling.
- **Pagination goes into `docx-engine`.** The preview must use the same styles as the writer. The DOM measuring (`preview.ts`) and the view stay in the AGLC4 plugin.
- **Version history stays in the AGLC4 plugin.** It's Obsidian-specific. It could become a package later if the suite wants shared history.
- **Root `manifest.json` and `versions.json` stay.** See finding 4.

**Workspaces.** npm workspaces, using the existing lockfile and tooling. The packages are TypeScript source with no build step of their own. Each plugin's esbuild bundles what it imports, and vitest runs the packages directly. Each package has an `index.ts` that defines its public surface, and ESLint will forbid importing a package's internals from outside it.

## 4. File map

| Current | Target |
| --- | --- |
| `export/markdown.ts`: model types | `packages/ldm` |
| `export/markdown.ts`: parser, `parseInline`, `walkBlocks`, `plainText` | `packages/md-pipeline` |
| `export/markdown.ts`: `smartenQuotes`, `superscriptOrdinals` | `packages/aglc` (AGLC4 transforms) |
| `footnotes.ts` | `packages/md-pipeline` (its bibliography test comes from `aglc` through a hook) |
| `export/docx.ts`: `DocxBuilder`, `exportDocx` | `packages/docx-engine` |
| `export/docx.ts`: `prepare()` steps | `packages/aglc` (as transforms) and `md-pipeline` (runner) |
| `export/html.ts` | `packages/docx-engine` |
| `layout/metrics.ts`: page geometry, line metrics, style schema | `packages/docx-engine` |
| `layout/metrics.ts`: AGLC4 heading styles | `packages/aglc` (style set) |
| `layout/paginate.ts` | `packages/docx-engine` |
| `layout/headings.ts` | `packages/aglc` |
| `import/docx.ts`, `import/xml.ts` | `packages/docx-engine` (reader) |
| `aglc/*`, `aglc/bibliography.ts` | `packages/aglc` |
| `layout/preview.ts`, `layout/view.ts` | `plugins/aglc4` |
| `history/*`, `editor/*`, `main.ts`, `settings.ts`, `scope.ts`, `example.ts` | `plugins/aglc4` |
| `test/*` | beside the package each tests; the plugin-level tests in `plugins/aglc4/test` |
| `esbuild.config.mjs` (with the base64 removal) | a shared `scripts/build-plugin.mjs` used by both plugins |
| `scripts/offline-audit.mjs` | scans `packages/*`, `plugins/*` and both bundles |

## 5. Legal Core API (version 1)

As in the brief, typed in `packages/legal-core-api` and documented in `plugins/legal-core/API.md`:

- `version`, `satisfies(range)`. The range check is a small built-in caret and tilde matcher, with no semver dependency.
- `registerExtension({ id, syntax?, transforms?: [{ id, fn, after?: string[] }], renderers? })` returns an `unregister()` function. Transforms run in dependency order, and a cycle or a missing dependency is an error naming the extensions involved.
- `authorities`: `get(id)`, `query(filter)`, `upsert(record)` and `subscribe(fn) → unsubscribe`. Each record has a `source` (the plugin that wrote it) and a stable id, derived from the citation's normalised identifying parts: case name, year and report, or the title of an Act with its year and jurisdiction.
- `exportDocx(markdown | TFile, options) → Promise<Uint8Array>`.
- `templates`: `register(id, docxBytes)`, `select(id)`, `list()`. The styles, numbering and headers and footers of a reference `.docx` are merged into the export.

**Authority store location (proposal).** A vault file, `.legal-core/authorities.json`, rather than Legal Core's `data.json`, so it travels with the vault. It's written atomically (write to a temporary file, then rename), using the same method as the version history.

## 6. Phases and how each is checked

| Phase | Deliverable | Gate |
| --- | --- | --- |
| 1 | `test/fixtures/*.md`; `test/golden/<fixture>/{document,footnotes,styles,numbering}.xml`; a golden test | Goldens generated from **today's** code and committed before any move |
| 2 | Workspaces; code moved into the packages; AGLC4 builds from `plugins/aglc4` | All 515 existing tests, the docs tests and the goldens pass with **byte-identical** XML; the offline audit passes; bundle size before and after reported |
| 3 | `plugins/legal-core` (manifest, settings tab, API, authority store); `examples/case-notes` | API unit tests (transform ordering, cycles, `satisfies`, store with subscriptions); the example extension's output tested |
| 4 | AGLC4 detects the core (on load and on layout ready, plus the `ready`/`unload` events); falls back silently | Goldens pass with the core absent, present, and disabled mid-session (simulated with the test stand-in); the sync never writes to notes |
| 5 | `scripts/dev-vault.mjs` (builds both and symlinks them into `~/Downloads/testing/.obsidian/plugins/`); `QA.md`; READMEs | A manual QA list for you to run |

**Golden normalisation.** The four compared files turned out to be deterministic: two exports of the same note produce byte-identical `document.xml`, `footnotes.xml`, `styles.xml` and `numbering.xml`; only `docProps/core.xml` carries timestamps, and it isn't compared. So normalisation is pretty-printing alone, with no ID stripping needed. Any future difference is therefore real.

**Fixtures.** Each fixture is one essay covering one topic, so a failure points at its cause:
- citations: cases, legislation, journal articles, books and reports;
- pinpoints;
- Ibid, alone and with a different pinpoint;
- `(n X)`, and "above n" (exported as written);
- a footnote citing two sources;
- short titles;
- the bibliography: both the generated one and one written in the note;
- AGLC4 and plain headings, long quotations, and a table and a list;
- per-note style properties.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Existing users stop getting updates if the manifest moves | Root `manifest.json` and `versions.json` stay where they are; a test keeps them in sync; the release workflow keeps attaching the same three files |
| Settings change | AGLC4's settings code moves unchanged; no key is renamed, so no migration is needed. A test loads a `data.json` from 1.9.3 and checks every value survives |
| The export changes subtly while the transform order is untangled | Goldens are written before any code moves; the transforms are registered in today's order, and the goldens must stay byte-identical |
| Bundle size | Each plugin bundles only what it imports. AGLC4 should stay about 807 KB; I'll report before and after. Legal Core bundles the engine too (about 600 KB expected). The two plugins can't share code at run time other than through the API objects, so this duplication is inherent |
| The base64 removal stops applying | Moved into the shared build script, which still fails the build if the library changes; the offline audit scans both bundles |
| The review bot flags `app.plugins` | Discovery isolated in one typed function, with workspace events as the lifecycle signal (finding 6) |
| Two copies of the engine disagree (AGLC4's bundled copy and the core's) | AGLC4 always exports with its own bundled engine, core or not. The core only supplies the authority store and extension registry, so output can't depend on which version of the core is installed. The goldens pass in both modes |
| Mobile | No Node APIs in any package (enforced by an ESLint rule); `Packer.toArrayBuffer()` kept (mobile-safe, equivalent to `toBlob()`); vault binary APIs and `Uint8Array` throughout |
| Docs tests and the offline audit read `src/` paths | Updated in Phase 2 to the new paths; the docs completeness tests keep working |

## Standalone guarantee (enforced)

AGLC4 Citations must work without Legal Core. Two automatic guards enforce it:

- **Build:** the AGLC4 build fails if `main.js` would load any module at run time other than what Obsidian provides (`obsidian`, `@codemirror/state`, `@codemirror/view`). Every package must be bundled in, and Legal Core can never become a run-time dependency. This runs in the release workflow too, which builds without running the tests.
- **Lint:** AGLC4's source may never import the Legal Core plugin, and may import `@legal-core/api` only with `import type`, which compiles to nothing.

## 8. Decisions (approved)

1. **Legal Core's id:** `au-legal-core`, named "Legal Core (Australia)". The API lookup is `getPlugin('au-legal-core')`.
2. **Authority store:** a vault file, `.legal-core/authorities.json`, written atomically.
3. **Markdown parser:** the existing parser, kept in `md-pipeline`; remark or micromark may be added later as an option.
4. **AGLC4's export with the core present:** always AGLC4's bundled engine. The core supplies only the authority store and the extension registry.
5. **"above n":** locked in as exported as written. A rule flagging it as AGLC3 is a separate change after the refactor.
