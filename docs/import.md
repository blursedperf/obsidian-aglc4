# Importing Word documents

**Import Word document** (command) opens a `.docx` file from your computer and turns it into a note in the current folder. A `.docx` already in the vault can be imported by right-clicking it and choosing **Import as note with AGLC4 footnotes**. An existing note is never replaced: the import is given a new name if needed.

## What comes across

- **Footnotes** become Markdown footnotes at the bottom of the note, numbered in reading order, with their italics, so they can be checked straight away. Endnotes become footnotes too.
- **Formatting:** italics and bold (set directly, or by a character or paragraph style), strikethrough, highlights, headings, bulleted and numbered lists, indented block quotations, tables and links.
- **Citations from Zotero or EndNote**, and cross-references, keep the text Word shows.
- **Tracked changes:** insertions are accepted and deletions left out.
- **Heading numbers**, typed or from Word's automatic numbering, are removed so the headings stay plain. Turn on [AGLC4 headings](headings.md) to number them again.

Images, embedded objects and equations are left out, and the import notice says so. It also says how many footnotes came across and how many AGLC4 problems the note has.

The imported note is marked as an assignment note (property `aglc` ticked), so the plugin works in it even when it is limited to assignment notes ([notes](notes.md)).

Your Word file is not changed, and nothing is uploaded: the document is read on your computer.
