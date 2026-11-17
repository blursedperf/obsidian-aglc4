# AGLC4 Citations for Obsidian

Write footnoted legal work in Obsidian to the *Australian Guide to Legal Citation* (4th ed). The plugin:

- **keeps footnotes at the bottom of the note**, in reading order and renumbered, and keeps `(n X)` cross-references pointing at the right footnote when footnotes are added or moved;
- **suggests the next required element** of the citation you are typing (inline hint, popup and command);
- **underlines incorrect or incomplete citations** as you write, explains the AGLC4 rule on hover and offers a one-click fix;
- **exports to Word with real footnotes** at the bottom of each page, keeping italics, quotation marks and `<URLs>` exactly as AGLC4 requires. It also exports to HTML.

## Writing footnotes

Use ordinary Obsidian footnotes. Italics are `*…*` (or `_…_`).

```markdown
The High Court rejected terra nullius.[^1] It was applied again later.[^2]

[^1]: *Mabo v Queensland (No 2)* (1992) 175 CLR 1, 42 (Brennan J) ('*Mabo*').
[^2]: Ibid 29.
```

**Insert footnote** (command) puts the footnote number after any punctuation at the cursor (AGLC4 r 1.1.2), adds the footnote at the bottom of the note in the right order, renumbers the footnotes and moves the cursor to the new footnote. **Jump between footnote and its reference** takes you back.

Footnotes are numbered the way Obsidian numbers them: by the order their references appear. `(n 3)` means the third footnote in the note.

## Next element

While the cursor is at the end of a citation in a footnote:

- a faint hint after the cursor shows the next required element, eg `‹Law report series›`;
- after you finish an element (closing italics, a bracket, a comma, a number) a popup lists what can come next, with the required element first. Choosing one inserts it with its placeholder selected, eg ` (Year)` with `Year` selected;
- **Suggest next citation element** opens the same list at any time, including at the start of an empty footnote, where it offers a template for each kind of source;
- the status bar shows the problem count and the next element.

## What is checked

Each footnote is split into its sources (separated by `;`), each source is matched against the AGLC4 structure of its kind, and the text is checked for general style.

| Source | Structure checked |
| --- | --- |
| Reported cases (ch 2) | italic name, (year) or [year] to suit the series, volume, series, starting page, pinpoints, judges, short title |
| Medium neutral citations (r 2.3) | [year], recognised court identifier, number, paragraph pinpoints |
| Unreported cases without MNC | (court, judge, date) |
| Legislation (ch 3) | italic title with year, abbreviated jurisdiction, `s`/`ss`/`pt`/`sch` … pinpoints, short title |
| Journal articles (ch 5) | author, 'title', year, volume(issue), journal (not italic), starting page, pinpoints |
| Books and reports (ch 6, 7) | author, italic title, (publisher, edition, year), pinpoint |
| Chapters in edited books (ch 6) | author, 'title', in editor (ed), italic book title, publication, starting page |
| Newspaper articles (ch 7) | author, 'headline', italic newspaper, (place, date), page or URL |
| Internet materials (ch 7) | author, 'title', (document type, date), `<URL>` |
| Treaties (ch 8) | italic title, opened for signature date, treaty series, entry into force, articles |
| Hansard (ch 7) | jurisdiction, *Parliamentary Debates*, chamber, date, page, speaker |
| Ibid and subsequent references (r 1.4) | `Ibid` form and pinpoint, `(n X)` form and pinpoint |

Across the note: footnote numbers after punctuation (r 1.1.2), a closing full stop (r 1.1.4), "Ibid" only for the single source of the preceding footnote (r 1.4.3), `(n X)` pointing at an earlier footnote that cites the source (r 1.4.1), full citations repeated where "Ibid" or a short reference is needed, footnotes referenced twice, missing or unused footnotes.

General style: single quotation marks, en dashes in spans, no "p"/"pp"/"at" before pinpoints, `[23]` for paragraphs, `s` not "section" or "§", unpunctuated abbreviations (`eg`, `ie`, `Pty Ltd`, `No`, `ed`), "et al", signals in AGLC form (`See, eg,`), "1 January 2020" dates with the month in full, URLs in angle brackets, and terms AGLC4 does not use (supra, op cit, id).

Underlines are red for errors, orange for warnings, and dotted blue for suggestions (such as prose that looks like an unfinished citation). Hover an underline for the explanation, a **Fix** button, and **Ignore this rule**. **Fix all automatically fixable problems** applies every fix in the note, and **List AGLC4 problems in this note** (or clicking the status bar) lists them with jump-to.

Explanatory text in a footnote is left alone. A citation followed by commentary, such as `…, 30, where the Court held …`, is accepted.

The footnote being typed is not flagged as unfinished until you move on from it.

## Export

**Export to Word with AGLC4 footnotes** (command, or right-click a note) writes `Note name.docx` next to the note, or into the export folder set in settings. Every footnote marker becomes a real Word footnote, so Word places it at the bottom of the page and keeps the numbering. In the export:

- italics, bold, highlights, headings, lists, tables and block quotations are kept; block quotations are indented without quotation marks, as AGLC4 asks of long quotations;
- straight quotes become typographic quotes (‘…’), apostrophes included;
- `<https://…>` keeps its angle brackets and is a working link;
- each footnote reference gets its own footnote, so a footnote referenced twice is exported twice (and flagged in the editor);
- the font, body and footnote sizes, line spacing and page numbers come from settings.

**Export to HTML** writes a standalone page with the footnotes listed at the end. For a PDF with footnotes at the bottom of each page, export to Word and save as PDF from Word or LibreOffice.

The exported text is your note as written: problems are not fixed silently. If the note has AGLC4 errors, the export notice says how many.

## Page preview

**Open page preview** (command, or the book icon in the ribbon) shows the active note as Word will paginate it: A4 pages with each footnote at the bottom of the page that cites it. It follows the note you are editing and updates as you type.

The preview uses the same fonts, sizes and spacing as the Word export and follows Word's rules:

- a line goes on a page only if it fits completely, with the footnote separator and the footnotes it cites;
- a long footnote starts on the page of its reference and continues at the bottom of the next page;
- a paragraph split across pages leaves at least two lines on each side (widow and orphan control);
- headings stay with the paragraph that follows them;
- the space between paragraphs is the larger of the space after one and the space before the next.

These rules were checked against PDFs saved from Word (Word for the web): on the test documents in `test/fidelity/`, every page has the same body lines and footnotes as Word's. Line breaks within paragraphs also matched Word word for word. Where Times New Roman is not installed (as on most Linux systems) the preview uses Liberation Serif, which has the same character widths.

The preview is a guide, not a guarantee. Word can differ by a line where a paragraph ends within a point or so of the bottom of a page. Tables, lists and code blocks are laid out more approximately than ordinary paragraphs. Pages are drawn black on white whatever the theme.

## Limits

AGLC4 is a long and detailed guide. The plugin checks the structure and style that can be checked mechanically. Some things it cannot know:

- whether a case name, author or title is correct, or whether the right parts of a case name were kept (r 2.1);
- whether a report series is authorised. It does check bracket style for common series;
- sources outside the kinds listed above: foreign materials, UN documents, looseleaf services, interviews and the rest of Part IV. These read as prose and are not flagged;
- no bibliography is generated.

Where the plugin cites a rule it gives the AGLC4 rule number, or the chapter when a check draws on several rules. Check the Guide when in doubt.

## Settings

Checking: underlines on or off, dotted suggestions, disabled rules.
Next element: inline hint, popup while typing, status bar.
Footnotes: move footnotes to the bottom when leaving a note, renumber, convert `^[inline]` footnotes, keep `(n X)` in sync.
Export: folder, font, sizes, line spacing, typographic quotes, page numbers, title.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check and production build
npm test        # unit tests and the offline audit
npm run lint
```

`node scripts/word-fidelity.mjs` compares the page preview with Word, page by page, for each note in `test/fidelity/` that has a PDF saved from Word beside it. It needs `chromium` and `pdftotext`. To add a case, export the note to Word with the plugin, save it as PDF from Word as `<name>.word.pdf`, and put the note beside it as `<name>.md`.

The plugin makes no network requests; `npm test` runs `scripts/offline-audit.mjs` over the source and the bundle to check this. `sample/` has a correctly cited essay and a note of common mistakes to try it on.

To try it in a vault, copy `main.js`, `manifest.json` and `styles.css` to `<vault>/.obsidian/plugins/aglc4/` and enable **AGLC4 Citations** in Community plugins.
