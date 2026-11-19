# Bibliography

The plugin builds a bibliography of every source cited in a note's footnotes, in the form AGLC4 requires (r 1.13).

## Two ways to add one

- **On export.** Turn on **Add a bibliography** in [settings](settings.md), or `aglc-bibliography: true` in a note's properties. Word and HTML exports and the page preview then end with the bibliography, on a new page. The note itself is not changed.
- **In the note.** Run **Insert bibliography of cited sources**. The bibliography is added at the end of the note, after the footnotes, as ordinary text you can edit. Use this when you need to add sources you relied on but did not cite (AGLC4 asks for every source relied on), or to correct an entry.

Run **Insert bibliography of cited sources** again to bring it up to date with the footnotes. It asks first, because entries you added or edited by hand will be replaced; Undo restores them, and the earlier text is kept in the [version history](version-history.md). Tidying and adding footnotes keep the bibliography last.

## What it looks like

```markdown
## Bibliography

### A Articles/Books/Reports

Bartlett, Richard, 'The Proprietary Nature of Native Title' (1998) 6(2) *Australian Property Law Journal* 77

Strelein, Lisa, *Compromised Jurisprudence: Native Title Cases since Mabo* (Aboriginal Studies Press, 2nd ed, 2009)

### B Cases

*Mabo v Queensland [No 2]* (1992) 175 CLR 1
```

The rules it follows (AGLC4 r 1.13):

- **Sections:** A Articles/Books/Reports, B Cases, C Legislation, D Treaties, E Other. Empty sections are left out and the rest relettered.
- **Entries:** each source cited as in its first full footnote, with the first author's name inverted (`Foster, Michelle`; `Hathaway, James C and Audrey Macklin`), no closing full stop, and no pinpoints, judges, signals or short titles.
- **Order:** alphabetical by the first author's surname, then first name, then the later authors (a work with fewer authors first), then the title ignoring "The". An institution sorts by its name, and a source with no author by its title.
- **Once each:** a source is listed once however often it is cited. Ibid and `(n X)` references are left out.
- **Where sources go:** journal articles, books, chapters, reports, newspaper articles, theses and papers under A; speeches, media releases, web pages and Hansard under E. AGLC4 lets you adjust the sections, which you can do once the bibliography is in the note.

The tests check the result against the example bibliography in AGLC4 r 1.13, entry for entry.

## A bibliography you write yourself

A heading "Bibliography", "References" or "Reference list" in the note is treated as the note's bibliography:

- it is exported on a new page, with each entry's lines after the first indented (a hanging indent);
- it and the headings after it are not numbered as parts of the essay, and with AGLC4 headings its sections keep their letters;
- no generated bibliography is added as well.

## Check before you submit

- **Sources you did not cite** are not included: add them in the note.
- **Surnames of more than one word** (such as Spanish surnames): only the last word of a person's name is taken as the surname, so `Rodrigo Cetina Presuel` becomes `Presuel, Rodrigo Cetina`. Correct these in the note.
- **Institutions as authors** are recognised by words such as Department, Commission, Council or University, and are not inverted. An institution named otherwise may be inverted like a person.
