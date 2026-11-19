# Workflows

Step-by-step guides for the common jobs. Each step links to the page that explains it in full.

## Writing an assignment from scratch

1. **Create the note.** Make a new note for the assignment. If the plugin is limited to assignment notes, run **Turn AGLC4 on for this note** ([notes](notes.md)).
2. **Set its style, if it differs from your usual one.** Add properties such as `aglc-headings: aglc` (numbered AGLC4 headings) or `aglc-line-spacing: 2` ([a note's own style](notes.md#a-notes-own-style)).
3. **Turn on paragraph prompts, if you want them.** Run **Choose paragraph prompts for this note** and pick the kind of answer: IRAC for a problem question, critical analysis or "discuss" for an essay. Or start with **New legal essay or problem answer**, which creates the note with its outline ([paragraph prompts](paragraph-prompts.md)).
4. **Write with plain headings.** Use `##` for the main parts and `###` below them. Don't type the numbers: with AGLC4 headings they are added for you and stay right as you move sections ([headings](headings.md)).
5. **Add footnotes as you go.** At the end of a sentence, run **Insert footnote** (give it a hotkey: see below). Write the citation in the pane that opens; the plugin suggests each next element. Press **Enter** after the closing full stop to go back to your text ([writing footnotes](writing-footnotes.md)).
6. **Cite again with Ibid and (n X).** For the source in the footnote just before, write `Ibid` (with a pinpoint if it changes: `Ibid 45`). For a source cited earlier, use its short title and `(n X)`: `*Mabo* (n 1) 42`. The plugin tells you when one of these is needed, and keeps every `(n X)` pointing at the right footnote as you add and move footnotes.
7. **Fix problems as they appear,** or leave them and run **Fix all automatically fixable problems** at the end. The status bar shows how many remain; click it for a list ([checking](checking.md)).
8. **Check the layout** in the page preview as you go ([page preview](page-preview.md)).

Tip: give **Insert footnote** a hotkey in **Settings → Hotkeys** (for example Ctrl/Cmd+Shift+F). It is the command you will use most.

## Importing a draft from Word

1. Run **Import Word document** and choose the `.docx`, or right-click a `.docx` in the vault and choose **Import as note with AGLC4 footnotes** ([import](import.md)).
2. The note opens with its footnotes at the bottom, in order, ready to be checked. It is marked as an assignment note (property `aglc` ticked).
3. Heading numbers typed in Word are removed. To number the headings again in the AGLC4 style, add `aglc-headings: aglc` to the note's properties, or set **Heading style** in settings ([headings](headings.md)).
4. Run **List AGLC4 problems in this note** to see what needs attention, and **Fix all automatically fixable problems** to fix what can be fixed automatically.

## Submitting

1. **Clear the problems.** The status bar should show `AGLC4 ✓`, or only problems you have decided to keep. The plugin never changes your citations on export: what you see is what is exported.
2. **Add the bibliography,** if the assignment needs one. Either turn on `aglc-bibliography` for the note, which adds it on export, or run **Insert bibliography of cited sources** to put it in the note, where you can add sources you relied on but did not cite ([bibliography](bibliography.md)).
3. **Check the pages** in the page preview: headings, long quotations, footnotes at the bottom of each page ([page preview](page-preview.md)).
4. **Export.** Right-click the note and choose **Export to Word with AGLC4 footnotes** ([export](export.md)). If you then change the Word file (a cover page, a word count), and export again later, the plugin asks before replacing it, and keeps the replaced file in the history.
5. **Keep the submitted version.** Run **Save a named version of this note** and call it, say, "Submitted". Named versions are kept forever, so you can always see exactly what you submitted ([version history](version-history.md)).

## Keeping the plugin out of your other notes

If you also keep lecture notes, readings or a journal in the vault:

1. In settings, under **Notes**, set **Use AGLC4 in** to **Assignment notes only** (or add your assignments folder with **Assignment notes, and notes in these folders**).
2. Accept the offer to mark the notes that already have footnotes, so your current assignments stay on.
3. Other notes now show **AGLC4 off** in the status bar and are left completely alone ([notes](notes.md)).

## Recovering from a mistake

- **Undo** (Ctrl/Cmd+Z) reverses recent changes in an open note, including the plugin's.
- **Version history** goes back further: run **Show version history**, select a version, and **Restore** it, or **Restore as a copy** to compare side by side ([version history](version-history.md)).
- **A deleted note:** run **Restore a deleted note from version history**.
- **An overwritten Word file:** its earlier copies are listed at the end of the note's version history, with **Restore**.
