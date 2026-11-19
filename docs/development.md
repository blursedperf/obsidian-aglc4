# Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check and production build
npm test        # unit tests and the offline audit
npm run lint
```

To try a build in a vault, copy `main.js`, `manifest.json` and `styles.css` to `<vault>/.obsidian/plugins/aglc-citations/` and enable **AGLC4 Citations** under Community plugins.

## Tests

- **Checker:** `test/corpus.ts` holds correct citations (most from the AGLC4 Guide's own examples), which must raise no problems, and mistakes (mostly the Guide's "Not:" forms), each with the rule it must raise. Every fix is checked to remove its problem without adding another.
- **Example essay:** `sample/AGLC4 example essay.md` is the essay **Create example essay** adds. The tests check that it raises no problems except the mistakes it is meant to show, and none once they are fixed.
- **Bibliography:** checked against the example bibliography in AGLC4 r 1.13.
- **Version history:** includes a simulated crash at every step of a save.
- **Docs:** every rule, command and setting in the code must be documented in `docs/`, and links between the docs pages must work. Adding a rule, command or setting without documenting it fails the tests.

## Word fidelity check

`node scripts/word-fidelity.mjs` compares the page preview with Word, page by page, for each note in `test/fidelity/` that has a PDF saved from Word beside it. It needs `chromium` and `pdftotext`. To add a case, export the note to Word with the plugin, save it as PDF from Word as `<name>.word.pdf`, and put the note beside it as `<name>.md`.

## Offline audit

`npm test` also runs `scripts/offline-audit.mjs` over the source and the built bundle, and fails if anything could make a network request, run generated code, encode or decode base64, or inject raw HTML ([privacy](privacy.md)).

## The docs

The user guide is the Markdown in `docs/`. GitHub shows it as it is; it can also be opened as an Obsidian vault for editing. Keep it up to date in the same change as the feature it describes.
