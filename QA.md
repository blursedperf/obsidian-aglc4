# Manual QA checklist

Run this before a release that touches either plugin. The automated tests cover the export, checking and the connection between the plugins; this checklist covers what only a person in Obsidian (and Word) can see.

## Setup

1. `npm install`, then `npm test`: every test passes, and so does the offline audit.
2. `npm run dev:vault -- <test vault>`: both plugins are built and linked into the vault. Your settings in the vault (each plugin's `data.json`) are kept.
3. Open the vault in Obsidian, and turn each plugin off and on in **Settings → Community plugins** (or restart Obsidian) to load the new build.
4. Open the developer console (Ctrl+Shift+I, or Cmd+Option+I on a Mac) and keep it open: there should be no red errors at any step.

## 1. AGLC4 Citations alone

Turn **Legal Core (Australia)** off.

- [ ] The status bar shows `AGLC4 ✓`, or a count of problems, in a note with footnotes.
- [ ] **Create example essay** creates the essay. Its practice part is underlined; hovering shows the rule and a **Fix** button; one fix applies once and the box closes.
- [ ] **Fix all automatically fixable problems** fixes the practice part.
- [ ] **Insert footnote** opens the footnote pane; typing `*Mabo v Queensland [No 2]* ` suggests the year; Enter after the closing full stop returns to the text.
- [ ] Leaving a note moves its footnotes to the bottom; `(n X)` still points at the right footnote.
- [ ] **Open page preview** shows A4 pages with footnotes at the bottom and AGLC4 headings.
- [ ] **Show version history** lists versions; restoring one can be undone.
- [ ] Settings show no **Legal Core** prompt, and nothing mentions Legal Core except the **Share citations with Legal Core** setting.
- [ ] Settings from before the refactor are unchanged (for example, a disabled rule you set earlier is still disabled).

## 2. AGLC4 Citations with Legal Core

Turn **Legal Core (Australia)** on.

- [ ] AGLC4 Citations asks once: "Share your citations with Legal Core?".
- [ ] **Share my citations**: a notice says how many authorities were shared from how many notes.
- [ ] **Settings → Legal Core (Australia)**: **Stored authorities** shows the count by kind; **Registered extensions** lists `aglc-citations`.
- [ ] `.legal-core/authorities.json` exists in the vault (hidden from the file list), with the essay's cases, Acts and sources. The practice citations with errors are not there.
- [ ] Correct a practice citation (for example, `(2019) HCA 7` to `[2019] HCA 7`), wait a few seconds: it is added to the store.
- [ ] Turn Legal Core off and on again: the prompt does **not** appear a second time.
- [ ] Turn off **Share citations with Legal Core** in AGLC4's settings, change a citation: the store does not change.
- [ ] With **Don't share** chosen in a fresh vault, nothing is written to the store.
- [ ] Export the example essay to Word with Legal Core on and off: the two files are the same (compare them in Word with **Review → Compare**, or check they look the same).

## 3. Legal Core disabled mid-session

- [ ] With both on, edit a note, then turn Legal Core off while the note is open. No error appears; checking, footnotes and export keep working.
- [ ] Edit citations in a note while Legal Core is off, then turn it on again: within a few seconds the changed notes' citations are in the store (it catches up).
- [ ] Turn Legal Core off and on several times quickly: no errors, and **Registered extensions** lists `aglc-citations` once.
- [ ] Uninstall Legal Core entirely: AGLC4 Citations works as in section 1.

## 4. Exported files in Word

Export the example essay (and a real assignment) to Word and open it in Microsoft Word (and, if you can, Word for the web and LibreOffice).

- [ ] The file opens without a repair prompt.
- [ ] Footnotes are real Word footnotes at the bottom of each page, numbered by Word, each starting with a space after the number.
- [ ] Italics, quotation marks (curly), `<URLs>` and superscript ordinals (3<sup>rd</sup> ed) are as in the note.
- [ ] AGLC4 headings: I in small capitals centred; A italic centred with an upright letter; 1, (a), (i) as AGLC4 sets them.
- [ ] Long quotations are indented and a point smaller.
- [ ] The bibliography starts on a new page, with hanging indents.
- [ ] Page breaks are where the page preview showed them (within a line or so).
- [ ] Editing the file in Word, then exporting again from Obsidian, asks before replacing it.

## 5. Mobile

On a phone or tablet with the vault synced (copy the plugins with `npm run dev:vault -- <vault> --copy` if the vault syncs, since links do not sync).

- [ ] Both plugins load (no error notice).
- [ ] Underlines and hover (long-press) explanations work.
- [ ] **Insert footnote** jumps to the footnote in the note (no pane on phones).
- [ ] Export to Word writes the `.docx` into the vault, and it opens in Word on the phone.
- [ ] With Legal Core on, the share prompt appears once, and the store is written.

## 6. Releasing AGLC4 Citations

- [ ] `npm run build` builds AGLC4 Citations alone, to `main.js` at the repository root.
- [ ] `test/release-contract.test.ts` passes: the root `manifest.json` keeps the id `aglc-citations`, `versions.json` lists the new version, and the release workflow attaches `main.js`, `manifest.json` and `styles.css`.
- [ ] After `npm version <x.y.z>` and pushing the tag, the draft release has exactly those three files; publish it and check Obsidian offers the update in **Community plugins**.
