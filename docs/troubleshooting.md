# Troubleshooting and FAQ

## Nothing is underlined

- Check the status bar. **AGLC4 off** means the plugin is not working in this note: click it, or run **Turn AGLC4 on for this note** ([notes](notes.md)).
- Check **Underline problems** is on in [settings](settings.md).
- Only footnotes are checked, not the text of the note.
- The footnote you are typing is not flagged as unfinished until you move on from it.
- A rule you turned off with **Ignore this rule** is listed under **Disabled rules**.

## A correct citation is underlined

Hover the underline to see the rule, and check it in the [rules reference](rules.md) and the AGLC4 rule it cites. If the citation is correct (some sources are unusual), you can leave the underline, or turn the rule off with **Ignore this rule**. Please report it as an issue on GitHub, with the citation, so the checker can be improved.

## A citation is not recognised at all

The plugin knows the common kinds of source ([what is checked](checking.md#what-is-checked)). Others, such as foreign materials, UN documents and looseleaf services, read as prose and are left alone, without underlines.

## The export count of errors does not match the underlines

The export counts errors (red) only. Click the status bar, or run **List AGLC4 problems in this note**, to list them all.

## My headings are numbered twice, or not at all

- Numbers are added only with **Heading style** set to **AGLC4 hierarchy**, or `aglc-headings: aglc` in the note's properties.
- Write plain headings (`## Introduction`). A number you typed with a single space after it (`## I Introduction`) is kept as part of the heading; remove it ([headings](headings.md)).
- Check **AGLC4 level one**: with Automatic, a note that opens with a single `#` heading uses `##` for level I.

## The page preview differs from Word by a line

The preview follows Word's rules closely, but Word can differ by a line where a paragraph ends right at the bottom of a page, and tables and lists are approximate ([page preview](page-preview.md)).

## I exported again and lost my changes in Word

The plugin asks before replacing a Word file you changed, and keeps the replaced file. Open the note's [version history](version-history.md): earlier copies of the export are at the end, with **Restore**.

## I deleted a note by mistake

Run **Restore a deleted note from version history** ([version history](version-history.md)). Obsidian's own trash (**Settings → Files and links → Deleted files**) may also have it.

## The plugin moved my footnotes

With **Keep footnotes at the bottom** on, footnotes are moved to the bottom of a note when you leave it. Only the footnotes move; the plugin checks that nothing else would change before it rewrites a note. Turn the setting off, or turn the plugin off for notes that are not assignments ([notes](notes.md)).

## Does it work on mobile?

The plugin is not desktop-only, so it runs in Obsidian on phones and tablets. On phones, footnotes are written in the note rather than in a pane. Most testing has been on desktop: please report anything that does not work on mobile.

## Does it work with Obsidian Sync, iCloud or Dropbox?

Yes. The version history is kept in a hidden folder of the vault: iCloud, Dropbox and OneDrive sync it with the vault, but Obsidian Sync skips hidden folders, so with Obsidian Sync each device keeps its own history ([version history](version-history.md)).

## Reporting a problem

Open an issue at [github.com/blursedperf/obsidian-aglc4/issues](https://github.com/blursedperf/obsidian-aglc4/issues). For a checking problem, include the footnote text and what you expected. Don't include anything private.
