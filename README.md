# AGLC4 Citations for Obsidian

If you like it, [shout me a third of a coffee](https://patreon.com/Blursedperf)...or don't, no presh.

Write footnoted legal work in Obsidian to the *Australian Guide to Legal Citation* (4th ed). The plugin:

- **keeps footnotes at the bottom of the note**, in reading order and renumbered, and keeps `(n X)` cross-references pointing at the right footnote when footnotes are added or moved;
- **suggests the next required element** of the citation you are typing (inline hint, popup and command);
- **underlines incorrect or incomplete citations** as you write, explains the AGLC4 rule on hover and offers a one-click fix;
- **exports to Word with real footnotes** at the bottom of each page, keeping italics, quotation marks and `<URLs>` exactly as AGLC4 requires. It also exports to HTML.

**Try it straight away:** run **Create example essay** (command palette, or the button at the top of the plugin's settings). It adds a short, correctly cited essay to your vault, with a tour of what to try in a comment at the top and a final part of citations with mistakes to fix. Nothing is replaced: each run creates a new note.

## Private, offline and AI-free

Your writing never leaves your computer.

- **Fully offline.** The plugin makes no network requests of any kind: no servers, no APIs, no downloads, no update checks. It works the same with your internet connection turned off.
- **No AI.** Citations are checked with fixed rules written from the AGLC4 text, not by a language model or any other AI service. Nothing you write is sent anywhere to be analysed, and the same text always gets the same result.
- **No telemetry, no accounts.** There is no tracking, analytics or sign-in. The plugin stores only its settings, in your vault's `.obsidian` folder.
- **Your files stay where they are.** Word and HTML exports are written into your vault; Word imports are read from your computer and turned into a note in your vault. Nothing is uploaded.
- **Rigorously checked.** A rigorous offline audit checks the plugin, including its bundled libraries, to confirm it makes no network requests.

The developer tools in `scripts/` (such as the Word fidelity check, which drives a local Chromium) are not part of the plugin and are not shipped in a release.

## Which notes it works in

By default the plugin works in every note. To keep it out of notes that are not assignments, set **Use AGLC4 in** (settings, under Notes) to:

- **Assignment notes only**: notes with the property `aglc` ticked; or
- **Assignment notes, and notes in these folders**: those, plus every note in the folders you list (eg `Law/Assignments`), including the folders inside them.

Mark a note as an assignment with **Turn AGLC4 on for this note**, by clicking **AGLC4 off** in the status bar, or by ticking its `aglc` property. Imported Word documents are marked automatically. When you switch to assignment notes only, the plugin offers to mark the notes that already have footnotes, so your current assignments stay on. With all notes, untick a note's `aglc` property (or use **Turn AGLC4 off for this note**) to leave it out.

In a note the plugin does not work in, nothing is checked, underlined, suggested or numbered, and nothing is changed automatically: footnotes are not moved or renumbered when you leave it, and `(n X)` is not updated. The status bar shows **AGLC4 off**. Commands you run there yourself, such as export, still work. Version history is kept for every note unless **Keep history of** is set to the notes AGLC4 is used in.

**A note's own style.** A note's properties can set its style, overriding the settings for that note only, in export, the page preview and the editor:

| Property | Sets | Values |
| --- | --- | --- |
| `aglc-headings` | Heading style | `aglc` (AGLC4 hierarchy) or `plain` |
| `aglc-level-one` | AGLC4 level one | `auto`, `h1` or `h2` |
| `aglc-bibliography` | Add a bibliography | `true` or `false` |
| `aglc-font` | Font | a font name |
| `aglc-font-size` | Body text size | points |
| `aglc-footnote-size` | Footnote text size | points |
| `aglc-line-spacing` | Line spacing | `1`, `1.5` or `2` |
| `aglc-page-numbers` | Page numbers | `true` or `false` |
| `aglc-title` | Title from file name | `true` or `false` |
| `aglc-keep-footnotes-together` | Keep footnotes on one page | `true` or `false` |

```yaml
---
aglc: true
aglc-headings: aglc
aglc-bibliography: true
aglc-line-spacing: 2
---
```

## Writing footnotes

Use ordinary Obsidian footnotes. Italics are `*…*` (or `_…_`).

```markdown
The High Court rejected terra nullius.[^1] It was applied again later.[^2]

[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 42 (Brennan J) ('*Mabo*').
[^2]: Ibid 29.
```

**Insert footnote** (command) puts the footnote number after any punctuation at the cursor (AGLC4 r 1.1.2), adds the footnote at the bottom of the note in the right order and renumbers the footnotes. You then write the footnote without losing your place:

- **In a footnote pane** (the default on desktop): a pane opens below the note showing the same note at the new footnote, with the cursor in it. The text you were writing stays where it was. The pane is reused for later footnotes, and Obsidian keeps both panes in step, so underlines, hints and suggestions work there too.
- **In the note**: the cursor jumps to the new footnote at the bottom. Choose this under **Write new footnotes in**; it is always used on phones.

When you finish a footnote, press **Enter** after its closing full stop, or **Escape** anywhere in it, to go back to just after its reference in the text (from the pane, back to the main pane). **Return from footnote to its reference** does the same as a command. Turn this off with **Return after a footnote**. With **Close the footnote pane when done** (on by default), finishing a footnote with Enter in the pane also closes the pane; Escape returns without closing it, and the next **Insert footnote** opens it again. Escape is left alone when Vim key bindings are on. **Jump between footnote and its reference** moves within one editor.

Footnotes are numbered the way Obsidian numbers them: by the order their references appear. `(n 3)` means the third footnote in the note.

## Next element

While the cursor is at the end of a citation in a footnote:

- a faint hint after the cursor shows the next required element, eg `‹Law report series›`;
- after you finish an element (closing italics, a bracket, a comma, a number) a popup lists what can come next, with the required element first. Choosing one inserts it with its placeholder selected, eg ` (Year)` with `Year` selected;
- **Suggest next citation element** opens the same list at any time, including at the start of an empty footnote, where it offers a template for each kind of source;
- the status bar shows the problem count and the next element.

## What is checked

The rules are checked against the text of the *Australian Guide to Legal Citation* (4th ed, 2018), and the test suite includes over 150 of the Guide's own examples (which must pass) and its "Not:" forms (which must be flagged).

Each footnote is split into its sources (separated by `;`, or by a full stop where a new sentence begins), each source is matched against the AGLC4 structure of its kind, and the text is checked for general style.

| Source | Structure checked |
| --- | --- |
| Reported cases (r 2.1–2.2) | italic name; parties' names (`[No 2]` in square brackets, "R" for the Crown, `Pty Ltd`/`Ltd`/`Co`/`Inc`/`(in liq)`, `Commonwealth` and state names without "The"/"State of", `A-G` and `DPP`, `Re`, `Ex parte`, no "& Ors"); (year) or [year] to suit the series; volume; series; starting page or unique reference (`¶93-198`); pinpoints (page, paragraph, both, footnotes `n 6`/`nn 7–8`); judges (`(Kirby J, dissenting)`, `(Kitto J, Webb J agreeing at 591)`, `(Hudson AJ for the Court)`, `(Commissioner Buss)`); notes such as `(emphasis added)` and `(Court of Appeal)`; short title; the name may be omitted when it is in the text; no parallel citations |
| Medium neutral citations (r 2.3.1) | [year], recognised court identifier, number, paragraph pinpoints |
| Unreported cases and proceedings (r 2.3.2–2.3.3) | (court, judges, date) or (court, proceeding number, commenced date) |
| Legislation (ch 3) | italic title with year (Bills not italicised), abbreviated jurisdiction, pinpoints (`s 5(1)`, `ss 92(1), (4)`, `pt 2 div 3`, `sch 1 item 3`, `reg 7.1.04`, `s 20-110`; no "and" before the last), definitions, short title; later references by short title with `(n X)`; the *Australian Constitution*; parallel Acts in order (Commonwealth, then alphabetical) |
| Explanatory memoranda, statements and notes (r 3.7) | document, Bill (not italicised), jurisdiction, page and paragraph pinpoints |
| Journal articles (ch 5) | author, 'title', year (or span), volume and issue (`28(1)`, `66(1–2)`, `133 (January)`, `[1987] (Winter)`), full journal title in italics (no leading "The", "and" not "&", not abbreviated, subtitle omitted), starting page, `(forthcoming)` or `(advance)`, pinpoints |
| Books and reports (ch 6, 7.1) | author, editor or none, italic title, (publisher, edition, year) with no "The" or corporate status in the publisher, or (report details, date), pinpoint without a comma (page, paragraph, `ch 5`, `vol 2`), `<URL>`, short title |
| Chapters in edited books (r 6.6) | author, 'title', in editor (ed), italic book title, publication, starting page |
| Newspaper articles (r 7.11) | author or "Editorial", 'headline', section, italic newspaper, (place, date), page or URL |
| Internet materials (r 7.15) | author, 'document title', *website title* (italic), (Web Page, date), `<URL>` (required), short title |
| Papers, theses, speeches and releases (r 7.2–7.4) | author, 'title' (theses too), (type, details, date) without ordinal numbers for conferences and lectures, pinpoint, optional `<URL>` |
| Hansard (r 7.5.1) | jurisdiction, *Parliamentary Debates*, chamber, date, page, speaker (first and last names, no "Senator", "MP", "the Hon", "QC") |
| Treaties (ch 8) | italic title, opened for signature or signed, treaty series (`1577 UNTS 3`, `[2010] ATS 5`, `CETS No 207`), entry into force, articles (`art III s 9`) |
| Ibid and subsequent references (r 1.4) | `Ibid` form, pinpoints and judge; `(n X)` form (including "(n3)") and pinpoint; "Smith, *Short Title* (n X)" for an author of several works; "Birks (ed) (n 6)" |

Across the note: footnote numbers after punctuation and closing quotation marks (r 1.1.2), a closing full stop (r 1.1.4), "Ibid" only for the single source of the preceding footnote and without repeating an unchanged pinpoint (r 1.4.3, 2.2.5), "(n X)" rather than "Ibid" where the earlier footnote had a pinpoint and this one has none, `(n X)` pointing at an earlier footnote that cites the source (r 1.4.1), full citations repeated where "Ibid" or a short reference is needed, footnotes referenced twice, missing or unused footnotes.

General style:
- signals: only AGLC4's (See, See, eg,, See also, See especially, See generally, Cf, But see), no comma after them except "See, eg,", capitalised at the start of a sentence, and a different signal starting a new sentence rather than following a semicolon (r 1.1.3, 1.2);
- pinpoints: no "p", "pg", "at" or "para" (r 1.1.6); spans with an en dash and only the digits needed (`121–7`, but `11–14`, `215–19` and `2001–08`), paragraph spans in full (`[56]–[59]`) (r 1.1.7, 1.10.1, 1.11.4);
- quotations: single quotation marks (double within), ellipses as `…` with a space either side, none at the start of a quotation and no full stop after one (r 1.5);
- punctuation: no full stops in abbreviations or initials (`eg`, `Pty Ltd`, `Dr`, `HLA Hart`) (r 1.6.1);
- title case for titles of secondary sources, including each part of a hyphenated word (r 1.7);
- foreign words: *et al*, *inter alia*, *prima facie* and the like not italicised; *stare decisis*, *quantum meruit* and the like italicised (r 1.8.3);
- dates: "1 January 2020", no ordinals, month in full, no comma after the day of the week (r 1.11.1);
- legislation: `s` not "section" or "§", a space after the designation (`s 5`) but none before a subsection (`s 5(1)`) (r 3.1.4);
- authors: "and" not "&", "et al" (no full stop) for four or more authors (r 4.1.2);
- URLs in angle brackets; no "per" before judges; no supra, op cit, id.

Underlines are red for errors, orange for warnings, and dotted blue for suggestions (such as prose that looks like an unfinished citation). Hover an underline for the explanation, a **Fix** button, and **Ignore this rule**. **Fix all automatically fixable problems** applies every fix in the note, and **List AGLC4 problems in this note** (or clicking the status bar) lists them with jump-to.

Explanatory text in a footnote is left alone, as is "Section" at the start of a sentence. A semicolon inside an italicised title (*Re Wakim; Ex parte McNally*) does not split the footnote into two sources. A citation followed by commentary, such as `…, 30, where the Court held …`, is accepted.

The footnote being typed is not flagged as unfinished until you move on from it.

## Export

**Export to Word with AGLC4 footnotes** (command, or right-click a note) writes `Note name.docx` next to the note, or into the export folder set in settings. Every footnote marker becomes a real Word footnote, so Word places it at the bottom of the page and keeps the numbering. In the export:

- italics, bold, highlights, headings, lists, tables and block quotations are kept; block quotations are indented, a point smaller than the body text and without quotation marks, as AGLC4 asks of long quotations (r 1.5.1);
- ordinal suffixes are set in superscript, as AGLC4 sets them in editions and ordinals (3<sup>rd</sup> ed) (r 1.10.1, 6.3.2);
- straight quotes become typographic quotes (‘…’), apostrophes included;
- `<https://…>` keeps its angle brackets and is a working link;
- each footnote reference gets its own footnote, so a footnote referenced twice is exported twice (and flagged in the editor);
- the font, body and footnote sizes, line spacing and page numbers come from settings.

**Bibliography.** Turn on **Add a bibliography** in settings to end the export (and the page preview) with a bibliography of every source cited in the footnotes, on a new page, in the form AGLC4 requires (r 1.13):

- sections A Articles/Books/Reports, B Cases, C Legislation, D Treaties and E Other, leaving out empty sections and relettering the rest;
- each source cited as in its first full footnote, with the first author's name inverted (`Foster, Michelle`; `Hathaway, James C and Audrey Macklin`), no closing full stop, and no pinpoints, judges or short titles;
- in alphabetical order by the first author's surname and first name, then the later authors (a work with fewer authors first), then the title ignoring "The"; institutions by their name and sources without an author by their title;
- each source listed once, however often it is cited, and Ibid and `(n X)` references left out.

**Insert bibliography of cited sources** (command) puts the same bibliography into the note as ordinary text, at the end after the footnotes, so you can edit it: add sources you relied on but did not cite (AGLC4 asks for every source relied on), or correct a surname of more than one word (only the last word of a person's name is taken as the surname). Run it again to bring it up to date; it asks before replacing the bibliography already in the note, and Undo restores it. Tidying footnotes and adding new ones keep the bibliography last, after the footnotes.

A bibliography written in the note, under a heading "Bibliography", "References" or "Reference list", is exported on a new page with hanging indents, and no other bibliography is added. It and the headings after it are not numbered as parts of the essay; with AGLC4 headings, its sections keep their letters ("A Articles/Books/Reports").

**Export to HTML** writes a standalone page with the footnotes listed at the end. For a PDF with footnotes at the bottom of each page, export to Word and save as PDF from Word or LibreOffice.

The exported text is your note as written: problems are not fixed silently. If the note has AGLC4 errors, the export notice says how many.

## Importing Word documents

**Import Word document** (command) opens a `.docx` file and turns it into a note in the current folder. A `.docx` file already in the vault can be imported by right-clicking it (**Import as note with AGLC4 footnotes**).

- Footnotes become Markdown footnotes at the bottom of the note, numbered in reading order, with their italics, so they can be checked straight away. Endnotes become footnotes too.
- Italics and bold are kept, whether set directly or by a character or paragraph style, as are strikethrough, highlights, headings, bulleted and numbered lists, indented block quotations, tables and links.
- Citations inserted by Zotero or EndNote, and cross-references, keep the text Word shows.
- Tracked insertions are accepted and deletions left out. Images, embedded objects and equations are left out, and the import notice says so.
- Heading numbers (typed, or Word's automatic numbering) are removed so headings stay plain; turn on AGLC4 headings to number them again.

The notice after an import says how many footnotes came across and how many AGLC4 problems the note has.

## AGLC4 headings

Set **Heading style** to **AGLC4 hierarchy** to number and format headings as AGLC4 sets out:

| Level | Number | Style |
| --- | --- | --- |
| One | I, II, III (upright) | large and small capitals, centred |
| Two | A, B, C (upright) | italics, centred |
| Three | 1, 2, 3 (upright) | italics, left-aligned |
| Four | (a), (b), (c) (italic) | italics, left-aligned |
| Five | (i), (ii), (iii) (italic) | italics, left-aligned |

Write plain headings (`## Introduction`): the numbers are added in the Word and HTML exports and the page preview, and shown faintly in the editor, so they stay right as sections are added and moved. **AGLC4 level one** chooses which Markdown heading is level I. Automatic uses `##` when the note opens with a single `#` heading, which becomes a centred title, and `#` otherwise. A number typed at the start of a heading followed by a tab, two spaces or a non-breaking space ("I&nbsp;&nbsp;Introduction") is removed so it is not doubled. Headings below level five are italic and unnumbered.

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

## Version history and protection against data loss

The plugin keeps a version history of your notes, so any earlier version can be seen and restored, as in Word or Google Docs. It is on by default.

- **Saved as you write.** A version is saved at most every 2 minutes while you write (with the latest text), and whenever you open or leave a note. Versions identical to the last are not saved twice.
- **Saved before every change the plugin makes.** Before it tidies footnotes, fixes all problems, inserts a bibliography or restores a version, the text as it was is saved first, labelled with what happened ("Before tidying footnotes").
- **Exports never lost.** Exporting again does not silently replace a Word or HTML file you have changed since (for example, edited in Word): you are asked whether to replace it or save a new file. A file that is replaced is kept in the history first, and if it cannot be kept, it is not replaced.
- **Background changes are made safely.** Tidying a note that is not open (when you leave it) only happens once its text is in the history, and every tidy is checked before it is written: the text outside footnotes and the text of every footnote must be unchanged, or the note is left as it is.
- **Deleted and renamed notes.** The history follows a note when it is renamed or moved. When a note is deleted, its history is kept: **Restore a deleted note from version history** brings it back.
- **Kept for as long as you like.** Every version from the last day is kept, then one per hour for a month, then one per day, forever. Named versions are always kept, and **Keep every version** keeps everything. Versions are compressed: a typical essay's whole history takes a few MB.

**Show version history** (command, the clock icon, or right-click a note) opens the history of the active note: its versions by day, and for the version you select, what restoring it would change. **Restore this version** replaces the note's text (Undo reverses it, and the text before is kept in the history); **Restore as a copy** opens it as a new note. **Save a named version of this note** (or the tag icon) marks a version, such as "Submitted draft". Earlier copies of the note's Word and HTML exports are listed there too, and can be restored.

The history is kept in the vault, in the hidden folder `.aglc-history` (configurable). Each version is checked against a fingerprint when it is read, and every file is written so that a crash part-way through cannot damage the versions already saved. It is on the same disk as your notes, so it protects you from mistakes, bad edits and deletions, not from losing the device: for that, back up or sync the vault folder (iCloud, Dropbox, OneDrive, Time Machine), which backs up the history with it. Obsidian Sync does not sync hidden folders, so with Obsidian Sync the history stays on each device.

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
Footnotes: where to write new footnotes (pane or note), return after a footnote, close the footnote pane when done, move footnotes to the bottom when leaving a note, renumber, convert `^[inline]` footnotes, keep `(n X)` in sync.
Headings: as written or AGLC4 hierarchy, and which heading is level I.
Export and page preview: folder, font, sizes, line spacing, typographic quotes, page numbers, title.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check and production build
npm test        # unit tests and the offline audit
npm run lint
```

`node scripts/word-fidelity.mjs` compares the page preview with Word, page by page, for each note in `test/fidelity/` that has a PDF saved from Word beside it. It needs `chromium` and `pdftotext`. To add a case, export the note to Word with the plugin, save it as PDF from Word as `<name>.word.pdf`, and put the note beside it as `<name>.md`.

The plugin makes no network requests; `npm test` runs `scripts/offline-audit.mjs` over the source and the bundle to check this. `sample/AGLC4 example essay.md` is the example essay that **Create example essay** adds; the tests check that it raises no problems apart from the mistakes it is meant to show, and none once they are fixed.

To try it in a vault, copy `main.js`, `manifest.json` and `styles.css` to `<vault>/.obsidian/plugins/aglc-citations/` and enable **AGLC4 Citations** in Community plugins.
