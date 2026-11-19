# Exporting to Word and HTML

## Word

**Export to Word with AGLC4 footnotes** (command, or right-click a note) writes `Note name.docx` next to the note, or into the **Export folder** set in [settings](settings.md). Every footnote becomes a real Word footnote, so Word places it at the bottom of its page and keeps the numbering as you edit in Word.

In the export:

- italics, bold, highlights, headings, lists, tables and block quotations are kept;
- block quotations are indented, a point smaller than the body text, and without quotation marks, as AGLC4 asks of long quotations (r 1.5.1);
- ordinal suffixes are set in superscript, as AGLC4 sets them in editions (3<sup>rd</sup> ed) (r 1.10.1, 6.3.2);
- straight quotes become typographic quotes (‘…’), apostrophes included;
- `<https://…>` keeps its angle brackets and is a working link;
- each footnote number is followed by a space, as Word does;
- headings are numbered and formatted in the AGLC4 style, if you use it ([headings](headings.md));
- a [bibliography](bibliography.md) follows on a new page, if you ask for one;
- the font, sizes, line spacing, page numbers and title come from settings, or from the note's [own style](notes.md#a-notes-own-style);
- each footnote reference gets its own footnote, so a footnote referenced twice is exported twice (and flagged in the editor);
- comments (`%% … %%`) are left out.

The export is your note as written: problems are not fixed silently. If the note has AGLC4 errors, the export notice says how many.

For a PDF with footnotes at the bottom of each page, export to Word and save as PDF from Word or LibreOffice.

## HTML

**Export to HTML with AGLC4 footnotes** writes a standalone web page, `Note name.html`, with the footnotes listed at the end and linked both ways.

## Exporting again

If the Word or HTML file already exists and has changed since the plugin last wrote it (for example, you added a cover page in Word), the plugin asks whether to:

- **Replace it.** The current file is kept in the note's [version history](version-history.md) first, so it can be restored. If it cannot be kept, it is not replaced.
- **Save as a new file**, such as `Note name 2.docx`.

A file the plugin wrote and you have not changed since is simply replaced (its previous copy is kept in the history too). Earlier copies are listed at the end of the note's version history, each with **Restore**.
