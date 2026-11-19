# Headings

AGLC4 sets out a hierarchy of numbered headings (r 1.12.2). Set **Heading style** to **AGLC4 hierarchy** in [settings](settings.md), or give one note `aglc-headings: aglc` in its properties ([a note's own style](notes.md#a-notes-own-style)), to use it:

| Level | Number | Style |
| --- | --- | --- |
| One | I, II, III (upright) | large and small capitals, centred |
| Two | A, B, C (upright) | italics, centred |
| Three | 1, 2, 3 (upright) | italics, left-aligned |
| Four | (a), (b), (c) (italic) | italics, left-aligned |
| Five | (i), (ii), (iii) (italic) | italics, left-aligned |

## Write plain headings

Write `## Introduction`, not `## I Introduction`. The numbers are added in the Word and HTML exports and the page preview, and shown faintly in the editor, so they stay right as you add, delete and move sections.

A number typed at the start of a heading and followed by a tab, two spaces or a non-breaking space (`I  Introduction`) is removed, so it is not doubled. A single space is not enough: `## A New Approach` is a heading, not "A" and "New Approach". Headings below level five are italic and unnumbered.

## Which heading is level one

**AGLC4 level one** chooses which Markdown heading is level I:

- **Automatic** (the default): `##` when the note opens with a single `#` heading, which then becomes a centred title; otherwise `#`.
- **# headings**: `#` is level I.
- **## headings**: `##` is level I, and `#` is the title.

For example, with Automatic:

```markdown
# Native Title after Mabo        ← the title
## Introduction                  ← I
## The Content of Native Title   ← II
### Recognition                  ← A
### Extinguishment               ← B
```

## The bibliography heading

A heading "Bibliography", "References" or "Reference list" starts the back matter: it and the headings after it are not numbered as parts of the essay, and its sections keep their letters ("A Articles/Books/Reports"). See [Bibliography](bibliography.md).
