# Getting started

## Install

In Obsidian, open **Settings → Community plugins**, choose **Browse**, search for **AGLC4 Citations**, then **Install** and **Enable**.

To install by hand (for example, a test version), copy `main.js`, `manifest.json` and `styles.css` from a [release](https://github.com/blursedperf/obsidian-aglc4/releases) to `<your vault>/.obsidian/plugins/aglc-citations/`, then enable **AGLC4 Citations** under Community plugins.

## Create the example essay

Open the command palette (Ctrl/Cmd+P) and run **Create example essay**, or use the button under **Getting started** at the top of the plugin's settings. The plugin adds a short essay, *Native Title after Mabo*, to your vault and opens it. Nothing is replaced: each run makes a new note, and you can delete it whenever you like.

The essay is correctly cited, except for its last part, which has citations with mistakes for you to fix. A comment at the top lists what to try; you see it while editing, but it is hidden in Reading view and never exported.

## A five-minute tour

Try these in the example essay:

1. **See a mistake explained.** Scroll to *Practice: Citations to Fix*. Hover a red or orange underline in its footnotes: the box explains the problem, gives the AGLC4 rule, and offers a **Fix** button. See [Checking citations](checking.md).
2. **Fix everything at once.** Run **Fix all automatically fixable problems**. Each mistake in the practice part is corrected. Undo (Ctrl/Cmd+Z) puts them back if you want to try them one by one.
3. **Write a footnote.** Put the cursor at the end of a sentence and run **Insert footnote**. A pane opens below at the new footnote. Type `*Mabo v Queensland [No 2]*` and a space: the plugin suggests the year, the report series and so on. Finish with a full stop and press **Enter** to go back to where you were writing. See [Writing footnotes](writing-footnotes.md) and [Next element](next-element.md).
4. **See the pages.** Click the book icon in the ribbon (or run **Open page preview**). The essay is shown as Word will print it: A4 pages, AGLC4 headings, and each footnote at the bottom of its page. See [Page preview](page-preview.md).
5. **Export to Word.** Right-click the note and choose **Export to Word with AGLC4 footnotes**. Open the `.docx`: the footnotes are real Word footnotes, and a bibliography follows on a new page. See [Exporting](export.md) and [Bibliography](bibliography.md).
6. **Go back in time.** Change a sentence, then click the clock icon (or run **Show version history**). Select an earlier version to see what changed, and **Restore** it. See [Version history](version-history.md).

## Next steps

- [Workflows](workflows.md) walks through writing an assignment from start to submission.
- If you keep other notes in the same vault, see [Choosing which notes it works in](notes.md) to keep the plugin to your assignments.
- [Settings](settings.md) lists everything you can change, such as the font, line spacing and heading style.
