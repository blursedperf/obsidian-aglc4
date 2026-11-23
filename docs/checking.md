# Checking citations

As you write, the plugin checks every footnote against AGLC4 and underlines what is wrong or incomplete.

## Underlines

- **Red:** an error, such as a missing volume number or a year in the wrong brackets.
- **Orange:** a warning: probably wrong, such as "section" written out, or a matter of style.
- **Dotted blue:** a suggestion, such as prose that looks like an unfinished citation. Turn these off with **Show suggestions**.

Hover an underline for the explanation and the AGLC4 rule number. Where the plugin knows the correction, the box has a **Fix** button. **Ignore this rule** turns the rule off everywhere (undo this under **Disabled rules** in [settings](settings.md)).

The footnote you are typing is not flagged as unfinished until you move on from it.

## Fixing problems

- **Fix**, in the hover box, fixes one problem.
- **Fix all automatically fixable problems** fixes every problem in the note that has a fix. It saves a [version](version-history.md) first, and Undo reverses it.
- **List AGLC4 problems in this note**, or clicking the status bar, lists the problems with their lines; choose one to jump to it.

Nothing is fixed without you asking: [export](export.md) writes your citations as they are, and the export notice says how many errors remain.

## What is checked

The rules were checked against the text of the *Australian Guide to Legal Citation* (4th ed, 2018). The test suite includes over 150 of the Guide's own examples, which must pass, and its "Not:" forms, which must be flagged. Every rule is listed in the [rules reference](rules.md).

Each footnote is split into its sources (separated by `;`, or by a full stop where a new sentence begins). Each source is matched against the AGLC4 structure of its kind, and the text is checked for general style.

| Source | Structure checked |
| --- | --- |
| Reported cases (r 2.1–2.2) | italic name; parties' names (`[No 2]` in square brackets, "R" for the Crown, `Pty Ltd`/`Ltd`/`Co`/`Inc`/`(in liq)`, `Commonwealth` and state names without "The"/"State of", `A-G` and `DPP`, `Re`, `Ex parte`, no "& Ors"); (year) or [year] to suit the series; volume; series; starting page or unique reference (`¶93-198`); pinpoints (page, paragraph, both, footnotes `n 6`/`nn 7–8`); judges (`(Kirby J, dissenting)`, `(Kitto J, Webb J agreeing at 591)`, `(Hudson AJ for the Court)`, `(Commissioner Buss)`); notes such as `(emphasis added)` and `(Court of Appeal)`; short title; the name may be omitted when it is in the text; no parallel citations |
| Medium neutral citations (r 2.3.1) | [year], recognised court identifier, number, paragraph pinpoints |
| Unreported cases and proceedings (r 2.3.2–2.3.3) | (court, judges, date) or (court, proceeding number, commenced date) |
| Legislation (ch 3) | italic title with year (Bills not italicised), abbreviated jurisdiction, pinpoints (`s 5(1)`, `ss 92(1), (4)`, `pt 2 div 3`, `sch 1 item 3`, `reg 7.1.04`, `s 20-110`; no "and" before the last), definitions, short title; later references by short title with `(n X)`; the *Australian Constitution*; parallel Acts in order (Commonwealth, then alphabetical) |
| Explanatory memoranda, statements and notes (r 3.7) | document, Bill (not italicised), jurisdiction, page and paragraph pinpoints |
| Journal articles (ch 5) | author, 'title', year (or span), volume and issue (`28(1)`, `66(1–2)`, `133 (January)`, `[1987] (Winter)`), full journal title in italics (no leading "The", "and" not "&", not abbreviated, subtitle omitted), starting page, `(forthcoming)` or `(advance)`, pinpoints |
| Books and reports (ch 6, 7.1) | author, editor or none (for a report, the department, commission or committee, such as "Royal Commission into …", or a committee and its parliament), italic title, (publisher, edition, year) with no "The" or corporate status in the publisher, or (report details, date), such as `(Inquiry Report No 95, 30 June 2020)`, `(Draft Report, June 2021)`, `(Interim Report, October 2019)` or `(Report No 126, April 2015)`; pinpoint without a comma (page, paragraph, `ch 5`, `vol 2`, `vol 3, 45`), `<URL>`, short title |
| Submissions to inquiries (ch 7) | author, `Submission No 12 to` the committee or body (and its parliament), italic title of the inquiry, (date), pinpoint, `<URL>`, short title |
| Chapters in edited books (r 6.6) | author, 'title', in editor (ed), italic book title, publication, starting page |
| Newspaper articles (r 7.11) | author or "Editorial", 'headline', section, italic newspaper, (place, date), page or URL |
| Internet materials (r 7.15) | author, 'document title', *website title* (italic), (Web Page, date), `<URL>` (required), short title |
| Papers, theses, speeches and releases (r 7.2–7.4) | author, 'title' (theses too), (type, details, date) without ordinal numbers for conferences and lectures, pinpoint, optional `<URL>` |
| Hansard (r 7.5.1) | jurisdiction, *Parliamentary Debates*, chamber, date, page, speaker (first and last names, no "Senator", "MP", "the Hon", "QC") |
| Treaties (ch 8) | italic title, opened for signature or signed, treaty series (`1577 UNTS 3`, `[2010] ATS 5`, `CETS No 207`), entry into force, articles (`art III s 9`) |
| Ibid and later references (r 1.4) | `Ibid` form, pinpoints and judge; `(n X)` form (including "(n3)") and pinpoint; "Smith, *Short Title* (n X)" for an author of several works; "Birks (ed) (n 6)" |

**Across the note:** footnote numbers after punctuation and closing quotation marks (r 1.1.2), a closing full stop (r 1.1.4), "Ibid" only for the single source of the preceding footnote and without repeating an unchanged pinpoint (r 1.4.3, 2.2.5), "(n X)" rather than "Ibid" where the earlier footnote had a pinpoint and this one has none, `(n X)` pointing at an earlier footnote that cites the source (r 1.4.1), full citations repeated where "Ibid" or a short reference is needed, footnotes referenced twice, and missing or unused footnotes.

**General style:**

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

**Left alone:** explanatory text in a footnote, and "Section" at the start of a sentence. A semicolon inside an italicised title (*Re Wakim; Ex parte McNally*) does not split the footnote into two sources. A citation followed by commentary, such as `…, 30, where the Court held …`, is accepted.

## What it cannot check

AGLC4 is a long and detailed guide. The plugin checks the structure and style that can be checked mechanically. It cannot know:

- whether a case name, author or title is correct, or whether the right parts of a case name were kept (r 2.1);
- whether a report series is authorised (it does check bracket style for common series);
- sources outside the kinds listed above: foreign materials, UN documents, looseleaf services, interviews and the rest of Part IV. These read as prose and are not flagged.

Where the plugin cites a rule it gives the AGLC4 rule number, or the chapter when a check draws on several rules. Check the Guide when in doubt.
