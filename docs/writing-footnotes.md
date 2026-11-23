# Writing footnotes

The plugin uses ordinary Obsidian footnotes, so your notes stay plain Markdown that any app can read. Italics are `*…*` (or `_…_`).

```markdown
The High Court rejected terra nullius.[^1] It was applied again later.[^2]

[^1]: *Mabo v Queensland [No 2]* (1992) 175 CLR 1, 42 (Brennan J) ('*Mabo*').
[^2]: Ibid 29.
```

## Inserting a footnote

Run **Insert footnote** with the cursor where the footnote belongs. The plugin:

- puts the footnote number after any punctuation at the cursor, as AGLC4 requires (r 1.1.2): `held.[^3]`, not `held[^3].`;
- adds the footnote at the bottom of the note, in reading order, and renumbers the footnotes;
- takes you to the new footnote so you can write it, without losing your place in the text.

Where you write the footnote depends on **Write new footnotes in** ([settings](settings.md)):

- **A pane below the note** (the default on desktop). A second pane opens under the note, showing the same note at the new footnote, with the cursor in it. The text you were writing stays where it was in the main pane. The pane is reused for later footnotes. Both panes show the same note, so underlines, hints and suggestions work in the pane too.
- **The note.** The cursor jumps to the new footnote at the bottom of the note. This is always used on phones.

Give **Insert footnote** a hotkey in **Settings → Hotkeys**: it is the command you will use most.

To choose what the footnote cites as you insert it, turn on **Choose a kind of source for new footnotes**. **Insert footnote** then opens the list of kinds of source (a case, an Act, a government or Productivity Commission report, a journal article …). Choose one, and its AGLC4 form is put in the new footnote, with Tab between its placeholders ([citing a kind of source](next-element.md#citing-a-kind-of-source)). Press Escape to leave the footnote empty and write it yourself. Without the setting, **Cite a kind of source** does the same at any time.

## Going back to the text

When you have finished a footnote:

- press **Enter** after its closing full stop, or
- press **Escape** anywhere in it, or
- run **Return from footnote to its reference**,

and the cursor goes back to just after the footnote's number in the text (from the pane, back to the main pane). With **Close the footnote pane when done** on (the default), finishing with Enter also closes the pane; Escape goes back without closing it. The next **Insert footnote** opens it again.

Turn this off with **Return after a footnote**. Escape is left alone when Vim key bindings are on. **Jump between footnote and its reference** moves between the two within one editor.

## Footnote numbers

Footnotes are numbered the way Obsidian numbers them: in the order their references appear in the text. `(n 3)` means the third footnote in the note. In the editor, labels like `[^3]` or `[^mabo]` are just names; the plugin relabels them 1, 2, 3 … to match ([keeping footnotes in order](#keeping-footnotes-in-order)).

## Keeping footnotes in order

With **Keep footnotes at the bottom** on, when you leave a note the plugin moves every footnote definition to the bottom of the note in reading order, and (with **Renumber footnotes**) relabels them 1, 2, 3 …. **Move footnotes to the bottom and renumber** does the same at any time.

Only the footnotes are moved and relabelled: the rest of the note is untouched. Before the plugin rewrites a note it checks that the text outside the footnotes, and the text of every footnote, would be unchanged; if not, it leaves the note as it is. A note that is not open is only tidied once its text is safely in the [version history](version-history.md).

A [bibliography](bibliography.md) at the end of the note stays after the footnotes. **Convert inline footnotes** also turns `^[inline]` footnotes into numbered ones.

## Cross-references: (n X)

A later reference to a source uses its short title (or the author's surname) and the footnote where it was first cited in full: `*Mabo* (n 1) 42`. With **Keep cross-references in sync** on, when footnotes are added, removed or reordered, each `(n X)` is updated to keep pointing at the same footnote.

The checker also tells you when a cross-reference points at a footnote that does not exist, at a later footnote, or at a footnote that does not seem to cite that source ([rules](rules.md#ibid-and-later-references)).

## Ibid

"Ibid" refers to the single source in the footnote immediately before. Write `Ibid` alone for the same pinpoint, or `Ibid 45` for a new one. The checker flags Ibid used after a footnote with several sources, as the first footnote, or after a footnote that is not a citation, and suggests Ibid where you have repeated the previous footnote's citation in full.
