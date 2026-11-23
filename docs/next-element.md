# Next element

While you write a citation in a footnote, the plugin shows what AGLC4 requires next.

## Citing a kind of source

Run **Cite a kind of source** (give it a hotkey) and choose what you are citing. Type to narrow the list, eg `report`, `productivity`, `interim` or `act`. The plugin inserts the AGLC4 form for that kind, with its first placeholder selected:

```
Productivity Commission, *Title* (Inquiry Report No 1, 1 January 2000)
```

Type over the placeholder, then press **Tab** for the next one (**Shift+Tab** goes back). After the last, Tab moves to the end of the citation, ready for a pinpoint or the closing full stop. The placeholders are marked until you fill them in. **Escape**, or moving the cursor elsewhere, stops. With the cursor outside a footnote, a footnote is inserted first. In a footnote that already cites a source, the new one is added after a semicolon, or as a new sentence after a finished citation.

The kinds of source:

| Group | Kinds |
| --- | --- |
| Cases | Reported case; medium neutral citation; unreported case without one |
| Legislation and parliament | Act; *Constitution*; Bill; explanatory memorandum; parliamentary debates (Hansard); parliamentary committee report; submission to an inquiry |
| Government, law reform and inquiry reports | Government report (a department or agency); Productivity Commission inquiry report (final); Productivity Commission draft report; interim report; final report; royal commission report; law reform commission report; issues or discussion paper |
| Books, articles and theses | Journal article; book; chapter in an edited book |
| International materials | Treaty; UN General Assembly resolution |
| Media, internet and other | Newspaper article; web page; speech, media release or paper |
| Later references | Ibid; later reference `(n X)` |

Each is listed with an example of its form. A report is cited with its author (the department, commission or committee), its title in italics, and, in brackets, the type of document and its number, if any, and date: `(Inquiry Report No 95, 30 June 2020)`, `(Draft Report, June 2021)`, `(Interim Report, October 2019)`, `(Final Report, December 2017)`, `(Report No 126, April 2015)`, `(Discussion Paper No 86, October 2018)`. A pinpoint follows without a comma, with the volume first for a report in volumes: `vol 3, 45`. The same kinds are offered in the list that opens at the start of an empty footnote.

## The hint

With the cursor at the end of a citation, a faint hint after the cursor names the next required element, for example `‹Law report series›` after `*Mabo v Queensland [No 2]* (1992) 175`. Turn it off with **Inline hint**.

## The popup

After you finish an element (closing italics, a closing bracket, a comma, a number), a list pops up of what can come next, with the required element first. Choosing one inserts it with its placeholder selected, so you can type straight over it: choosing **Year** inserts ` (Year)` with `Year` selected. When it has several placeholders, Tab moves to the next.

The list only ever adds text at the cursor: it never replaces what you have typed. Turn it off with **Suggest as you type**.

## The command

**Suggest next citation element** opens the same list at any time. At the start of an empty footnote it offers every kind of source in [Citing a kind of source](#citing-a-kind-of-source), each with its form.

## The status bar

The status bar shows the number of problems in the note (`AGLC4 2✕ 1⚠`, or `AGLC4 ✓`) and the next element of the citation at the cursor. Click it to list the problems. Turn it off with **Status bar**.

## Kinds of source

The suggestions follow the structure of each kind of source the plugin knows: reported and unreported cases, medium neutral citations, legislation and Bills, explanatory memoranda, journal articles, books and reports (including government, law reform, Productivity Commission, royal commission and parliamentary committee reports), submissions to inquiries, chapters in edited books, newspaper articles, internet materials, papers, theses and speeches, Hansard, treaties, and Ibid and later references. See [Checking citations](checking.md#what-is-checked) for the elements of each.
