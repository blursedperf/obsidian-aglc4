# Development

This repository holds two Obsidian plugins and the packages they are built from, as npm workspaces:

```
packages/
  ldm/              the Legal Document Model: the types a note is parsed into (types only)
  md-pipeline/      Markdown parsing, footnote scanning and tidying, extension syntax, ordered transforms
  docx-engine/      the Word and HTML writers, pagination, the Word reader, templates
  aglc/             AGLC4: the checker, headings, bibliography, typography, styles, export and import
  authority-store/  the shared store of cases, legislation and secondary sources
  legal-core-api/   the Legal Core API's types (@legal-core/api)
plugins/
  aglc4/            AGLC4 Citations: the plugin's source. Its release files are at the repository root.
  legal-core/       Legal Core (Australia): source, manifest.json, API.md
examples/
  case-notes/       an example plugin built on Legal Core
```

**AGLC4 Citations' release files stay at the repository root** (`manifest.json`, `versions.json`, `styles.css`, and the built `main.js`), where Obsidian's community directory and the release workflow read them. `test/release-contract.test.ts` fails if that changes.

**Both plugins are standalone.** Each bundles every package it uses, and the build fails if a bundle would load anything at run time but what Obsidian provides. AGLC4 Citations uses Legal Core only through `import type` (enforced by lint), so it works without it.

```bash
npm install
npm run build              # type-check and build AGLC4 Citations (what the release workflow runs)
npm run build:all          # type-check and build both plugins
npm run dev                # rebuild both plugins on every change
npm run dev:vault -- <vault> [--watch] [--copy] [--hot]
                           # build both and link them into a test vault
npm test                   # unit, golden and contract tests, and the offline audit
npm run lint
```

`npm run dev:vault` links each plugin's built files (`main.js`, `manifest.json`, `styles.css`) into `<vault>/.obsidian/plugins/<id>/`, one by one, so each plugin's settings (`data.json`) stay in the vault. With `--watch` it rebuilds on every change; reload the plugin in Obsidian to load a rebuild. `--hot` also marks the plugins for the community Hot Reload plugin, which reloads a plugin when its files change; it may not notice changes made through links, so if it does not reload, reload by hand or use `--copy --hot` with `npm run dev:vault` after each change. Use `--copy` for a vault that syncs to another device, since links do not sync. Then work through [`QA.md`](../QA.md).

## Tests

- **Checker:** `test/corpus.ts` holds correct citations (most from the AGLC4 Guide's own examples), which must raise no problems, and mistakes (mostly the Guide's "Not:" forms), each with the rule it must raise. Every fix is checked to remove its problem without adding another.
- **Example essay:** `sample/AGLC4 example essay.md` is the essay **Create example essay** adds. The tests check that it raises no problems except the mistakes it is meant to show, and none once they are fixed.
- **Bibliography:** checked against the example bibliography in AGLC4 r 1.13.
- **Version history:** includes a simulated crash at every step of a save.
- **Docs:** every rule, command and setting in the code must be documented in `docs/`, and links between the docs pages must work. Adding a rule, command or setting without documenting it fails the tests.
- **Golden exports:** `test/fixtures` holds notes covering every kind of citation and layout; `test/golden` holds their Word XML and HTML from before the Legal Core refactor. Any change to the export fails `test/golden.test.ts`. Regenerate only when the output is meant to change: `UPDATE_GOLDEN=1 npx vitest run test/golden.test.ts`.
- **Settings:** `test/golden/settings-defaults.json` holds every setting key and default from 1.9.3; removing or changing one fails the tests, so existing users' settings keep loading.
- **Legal Core:** the API, the authority store, extension ordering, templates, the example extension, and AGLC4 Citations' connection (with Legal Core absent, present, and disabled mid-session; the export must match the goldens in every case).
- **Release contract:** `test/release-contract.test.ts`, as above.

## Word fidelity check

`node scripts/word-fidelity.mjs` compares the page preview with Word, page by page, for each note in `test/fidelity/` that has a PDF saved from Word beside it. It needs `chromium` and `pdftotext`. To add a case, export the note to Word with the plugin, save it as PDF from Word as `<name>.word.pdf`, and put the note beside it as `<name>.md`.

## Offline audit

`npm test` also runs `scripts/offline-audit.mjs` over the source and the built bundle, and fails if anything could make a network request, run generated code, encode or decode base64, or inject raw HTML ([privacy](privacy.md)).

## The docs

The user guide is the Markdown in `docs/`. GitHub shows it as it is; it can also be opened as an Obsidian vault for editing. Keep it up to date in the same change as the feature it describes.
