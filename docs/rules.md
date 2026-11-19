# Rules reference

Every rule the plugin checks. The rule identifier (such as `case-number`) is shown when you hover an underline; use it to look the rule up here, or to turn it off under **Disabled rules** in [settings](settings.md).

**Severity:** E is an error (red), W a warning (orange), S a suggestion (dotted blue). Most rules have a one-click **Fix**; [Checking citations](checking.md) explains how fixes work.

Rule numbers are those of the *Australian Guide to Legal Citation* (4th ed, 2018). "Part I" or a chapter is given where a rule draws on several.

## Footnotes and punctuation

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `closing-stop` | A footnote not ending with a full stop | `… 175 CLR 1` → `… 175 CLR 1.` | E | r 1.1.4 |
| `ref-after-punct` | A footnote number before punctuation or a closing quotation mark | `held[^1].` → `held.[^1]` | E | r 1.1.2 |
| `ref-space` | A space before a footnote number | `held. [^1]` → `held.[^1]` | W | r 1.1.2 |
| `ref-undefined` | A footnote number with no footnote text | `[^7]` with no `[^7]:` | E | |
| `ref-reused` | A footnote referenced more than once (each reference needs its own footnote) | two `[^3]` in the text | W | r 1.4 |
| `def-unused` | Footnote text that nothing in the text refers to | `[^9]: …` never referenced | W | |
| `double-space` | Two spaces in a row | `CLR  1` → `CLR 1` | W | |
| `space-before-punct` | A space before punctuation | `CLR 1 .` → `CLR 1.` | W | |
| `abbrev-stops` | Full stops in abbreviations | `Pty. Ltd.` → `Pty Ltd`; `Dr.` → `Dr` | W | r 1.6.1 |
| `latin-abbrev` | Full stops in Latin abbreviations | `e.g.` → `eg`; `i.e.` → `ie` | E | r 1.6.1 |
| `initials` | Full stops or spaces in initials | `H. L. A. Hart` → `HLA Hart` | W | r 1.6.1 |
| `incomplete` | A citation missing a required element | `(1992) 175 CLR.` (no starting page) | E | |
| `unexpected` | Text after a citation that does not fit its structure | `175 CLR 1 zzz.` | W | |
| `possibly-incomplete` | Text that looks like the start of a citation but is not complete | `Smith, *Principles*.` | S | |

## Signals

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `signal-form` | A signal not in its AGLC4 form | `See e.g.` → `See, eg,` | E | r 1.2 |
| `signal-comma` | A comma after a signal (other than "See, eg,") | `See, *Mabo* …` → `See *Mabo* …` | W | r 1.2 |
| `signal-italics` | An italicised signal | `*See*` → `See` | E | r 1.2 |
| `signal-case` | A signal not capitalised at the start of a sentence, or capitalised after a semicolon | `see *Mabo* …` → `See *Mabo* …` | E | r 1.2 |
| `signal-new-sentence` | A different signal after a semicolon instead of a new sentence | `…; cf *R v Bernasconi* …` → `…. Cf *R v Bernasconi* …` | E | r 1.1.3 |
| `signal-unknown` | A word used as a signal that AGLC4 does not use | `Contra` → `But see`; `Compare` → `Cf` | W | r 1.2 |

## Ibid and later references

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `ibid-case` | "Ibid" capitalised after a signal, or lower case at the start | `ibid 45.` → `Ibid 45.`; `See Ibid` → `See ibid` | E | r 1.4.3 |
| `ibid-stop` | A full stop after "Ibid" (except at the end of the footnote) | `Ibid., 45.` → `Ibid 45.` | E | r 1.4.3 |
| `ibid-comma` | A comma between "Ibid" and the pinpoint | `Ibid, 45.` → `Ibid 45.` | E | r 1.4.3 |
| `ibid-italics` | An italicised "Ibid" | `*Ibid.*` → `Ibid.` | E | r 1.4.3, 1.8.3 |
| `ibid-first` | "Ibid" in the first footnote | | E | r 1.4.3 |
| `ibid-multiple` | "Ibid" after a footnote citing more than one source | | E | r 1.4.3 |
| `ibid-no-source` | "Ibid" after a footnote that does not look like a citation | | W | r 1.4.3 |
| `ibid-position` | "Ibid" that is not the first source in its footnote | `See *Mabo* …; ibid 4.` | W | r 1.4.3 |
| `ibid-same-pinpoint` | "Ibid" repeating the pinpoint of the footnote before | `Ibid 42.` after `… 42.` → `Ibid.` | W | r 1.4.3 |
| `use-ibid` | The source of the footnote before, cited again in full | repeat of footnote above → `Ibid` | W | r 1.4.3 |
| `repeat-citation` | A source cited in full again, after an earlier full citation | → `*Mabo* (n 1) 42` | W | r 1.4.1 |
| `n-format` | A cross-reference not written "(n X)" | `(fn 3)`, `(n3)` → `(n 3)` | E | r 1.4.1 |
| `n-comma` | A comma between "(n X)" and the pinpoint | `*Mabo* (n 3), 30.` → `*Mabo* (n 3) 30.` | E | r 1.4.1 |
| `n-missing` | "(n X)" pointing at a footnote that does not exist | `(n 40)` in a note with 12 footnotes | E | r 1.4.1 |
| `n-forward` | "(n X)" pointing at a later footnote | `(n 9)` in footnote 4 | E | r 1.4.1 |
| `n-mismatch` | "(n X)" pointing at a footnote that does not seem to cite that source | `*Wik* (n 1)` where footnote 1 is *Mabo* | W | r 1.4.1 |
| `short-title-quotes` | The quotation marks of a short title inside its italics | `(*'Criminal Code'*)` → `('*Criminal Code*')` | W | r 1.4.4 |
| `not-aglc` | Terms AGLC4 does not use | `supra`, `op cit`, `id` | E | r 1.4 |

## Cases

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `case-italics` | A case name not italicised | `Mabo v Queensland [No 2]` → `*Mabo v Queensland [No 2]*` | E | r 2.1.1 |
| `case-v` | Parties separated other than by "v" | `*Smith vs Jones*` → `*Smith v Jones*` | E | r 2.1.11 |
| `case-number` | A decision's number in round brackets | `*Mabo v Queensland (No 2)*` → `[No 2]` | E | r 2.1.13 |
| `case-crown` | The Crown as first party written other than "R" | `*Regina v Reid*` → `*R v Reid*` | E | r 2.1.4 |
| `case-others` | "& Anor", "& Ors" and the like | `*Hot Holdings Pty Ltd v Creasy & Ors*` → `… v Creasy*` | E | r 2.1.1 |
| `case-company` | Corporate status not abbreviated | `Proprietary Limited` → `Pty Ltd`; `(in liquidation)` → `(in liq)` | E | r 2.1.2 |
| `case-state` | The Commonwealth or a State not in its short form | `The Commonwealth of Australia` → `Commonwealth`; `State of New South Wales` → `New South Wales` | E | r 2.1.3 |
| `case-officer` | An Attorney-General or DPP not abbreviated | `Attorney-General (Qld)` → `A-G (Qld)` | E | r 2.1.7 |
| `case-re` | "In re" and the like | `*In re Judiciary and Navigation Acts*` → `*Re …*` | E | r 2.1.8 |
| `case-ex-parte` | "Ex parte" written another way | `ex parte`, `Ex p` → `Ex parte` | E | r 2.1.9 |
| `year-brackets` | Round brackets for a series organised by year, or square for one organised by volume | `*Donoghue v Stevenson* (1932) AC 562` → `[1932]` | E | r 2.2.1 |
| `volume-missing` | A year in round brackets with no volume | `(1992) CLR 1` → `(1992) 175 CLR 1` | E | r 2.2.1 |
| `series-full-stops` | Full stops in a report series abbreviation | `C.L.R.` → `CLR` | W | r 1.6.1 |
| `mnc-brackets` | A medium neutral citation's year in round brackets | `(2020) HCA 3` → `[2020] HCA 3` | E | r 2.3.1 |
| `mnc-pinpoint` | A pinpoint to a medium neutral citation that is not a paragraph | `[2020] HCA 3, 81` → `[2020] HCA 3, [81]` | W | r 2.3.1 |
| `parallel-citation` | A second report of the same case | `… 198 CLR 180; 164 ALR 606` → cite one report | E | r 2.2.7 |
| `per-judge` | "per" before a judge | `(per Gummow J)` → `(Gummow J)` | E | r 2.4.1 |

## Legislation

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `leg-italics` | The title of an Act not italicised | `Native Title Act 1993 (Cth)` → `*Native Title Act 1993* (Cth)` | E | r 3.1.1 |
| `leg-year-italics` | The year outside the italics | `*Native Title Act* 1993` → `*Native Title Act 1993*` | E | r 3.1.2 |
| `leg-jurisdiction` | A jurisdiction not abbreviated | `(Commonwealth)` → `(Cth)` | E | r 3.1.3 |
| `jurisdiction-dots` | Full stops in a jurisdiction | `(N.S.W.)` → `(NSW)` | E | r 3.1.3 |
| `leg-jurisdiction-space` | No space before the jurisdiction | `*… Act 1993*(Cth)` → `*… Act 1993* (Cth)` | W | r 3.1.3 |
| `leg-jurisdiction-unknown` | A jurisdiction AGLC4 does not abbreviate that way | `(N.S.Wales)` | W | r 3.1.3 |
| `section-word` | "section" written out | `section 223` → `s 223` | W | r 3.1.4 |
| `section-symbol` | The § symbol | `§ 223` → `s 223` | E | r 3.1.4 |
| `pinpoint-space` | No space between a designation and its number | `s5(1)` → `s 5(1)` | W | r 3.1.4 |
| `subsection-space` | A space before a subsection | `s 2 (3)` → `s 2(3)` | W | r 3.1.4 |
| `leg-and` | "and" between pinpoints | `ss 5, 7 and 9` → `ss 5, 7, 9` | W | r 3.1.5 |
| `leg-short-n` | A later reference by short title without "(n X)" | `*Property Act* s 6` → `*Property Act* (n 4) s 6` | E | r 3.5 |
| `leg-order` | Parallel Acts not in AGLC4 order (Commonwealth, then alphabetical) | NSW before Cth | W | r 3.3 |
| `bill-italics` | An italicised Bill | `*Carbon Pollution Reduction Scheme Bill 2009*` → not italic | E | r 3.2 |
| `explanatory-italics` | An italicised Bill in a citation of explanatory material | `Explanatory Memorandum, *Fair Work Bill 2009* (Cth)` → not italic | W | r 3.7 |

## Journal articles and authors

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `title-quotes` | An article or chapter title not in single quotation marks | `"The Title"` → `'The Title'` | E | r 5.2, 6.6.1 |
| `title-case` | A title not in title case | `'The title of the article'` → `'The Title of the Article'` | W | r 1.7 |
| `journal-italics` | A journal title not italicised | `Melbourne University Law Review` → `*Melbourne University Law Review*` | E | r 5.5 |
| `journal-abbreviation` | An abbreviated journal title | `*MULR*` → `*Melbourne University Law Review*` | W | r 5.5 |
| `journal-the` | "The" at the start of a journal title | `*The Australian Law Journal*` → `*Australian Law Journal*` | E | r 5.5 |
| `journal-ampersand` | "&" in a journal title | `*Yale Journal of Law & the Humanities*` → `… Law and the Humanities*` | W | r 5.5 |
| `journal-subtitle` | A journal's subtitle | `*Copyright Reporter: Journal of …*` → `*Copyright Reporter*` | S | r 5.5 |
| `journal-issue` | A volume with no issue number (if the journal has issues) | `(2017) 40 *…*` → `(2017) 40(3) *…*` | S | r 5.4 |
| `author-and` | "&" between authors | `Jane Smith & Ali Khan` → `Jane Smith and Ali Khan` | W | r 4.1.2 |
| `et-al` | A full stop after "et al" | `et al.` → `et al` | E | r 4.1.2 |
| `et-al-four` | Four or more authors named | → `Jane Smith et al` | W | r 4.1.2 |

## Books and reports

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `edition` | An edition not written "2nd ed" | `3rd edition` → `3rd ed` | E | r 6.3.2 |
| `editor-abbrev` | An editor not written "(ed)" or "(eds)" | `(Ed.)` → `(ed)` | E | r 4.1.3 |
| `publication-comma` | No comma between publisher and year | `(Federation Press 2018)` → `(Federation Press, 2018)` | W | r 6.3 |
| `publisher-the` | "The" at the start of a publisher's name | `(The Federation Press, 2012)` → `(Federation Press, 2012)` | W | r 6.3.1 |
| `publisher-corporate` | Corporate status in a publisher's name | `(Lawbook Co, 2016)` → `(Lawbook, 2016)` | W | r 6.3.1 |
| `book-pinpoint-comma` | A comma before a book's pinpoint | `(Clarendon Press, 1986), 247` → `(Clarendon Press, 1986) 247` | E | r 6.4 |

## Other sources

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `thesis-title` | An italicised thesis title | `*A Thesis Title* (PhD Thesis, …)` → `'A Thesis Title' (PhD Thesis, …)` | E | r 7.2.5 |
| `conference-ordinal` | The ordinal number of a conference or lecture | `23rd International Trade Law Conference` → `International Trade Law Conference` | W | r 7.2.4 |
| `hansard-italics` | "Parliamentary Debates" not italicised | `Parliamentary Debates` → `*Parliamentary Debates*` | E | r 7.5.1 |
| `hansard-speaker` | Titles in a speaker's name | `(Senator the Hon George Brandis QC)` → `(George Brandis)` | W | r 7.5.1 |
| `site-italics` | A website title not italicised | `Codes of Conduct (Web Page)` → `*Codes of Conduct* (Web Page)` | W | r 7.15 |
| `url-brackets` | A URL without angle brackets in a citation | `https://example.org` → `<https://example.org>` | E | r 7.15 |
| `bare-url` | A bare URL elsewhere in a footnote | `https://example.org` → `<https://example.org>` | E | r 7.15 |

## Pinpoints and spans

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `at-pinpoint` | "at" before a pinpoint | `175 CLR 1 at 42` → `175 CLR 1, 42` | E | r 1.1.6 |
| `page-abbrev` | "p" or "pp" before a page | `, p 42` → `, 42` | E | r 1.1.6 |
| `para-pinpoint` | "para" before a paragraph | `, para 42` → `, [42]` | W | r 1.1.6 |
| `en-dash` | A hyphen in a span of numbers | `42-3` → `42–3` | W | r 1.6.3 |
| `span-digits` | More digits than needed in the second number of a span | `121–127` → `121–7`; `26–29` → `26–9` | W | r 1.1.7 |
| `para-span` | A paragraph span in one pair of brackets | `[50–9]` → `[50]–[59]` | E | r 1.1.7 |

## Quotations, dates and foreign words

| Rule | Flags | Not → but | Sev | AGLC4 |
| --- | --- | --- | --- | --- |
| `double-quotes` | Double quotation marks (other than within a quotation) | `"word"` → `'word'` | W | r 1.5.1 |
| `ellipsis-dots` | An ellipsis written as dots | `. . .` → `…` | W | r 1.5.3 |
| `ellipsis-space` | No space on each side of an ellipsis | `examinable…at` → `examinable … at` | W | r 1.5.3 |
| `ellipsis-leader` | A quotation starting with an ellipsis | `'… the business'` → `'the business'` | W | r 1.5.3 |
| `ellipsis-stop` | A full stop after an ellipsis | `…'.` at the end of a sentence in a quotation → `…'` | W | r 1.5.3 |
| `date-order` | A date not written day month year | `May 1, 2020` → `1 May 2020` | E | r 1.11.1 |
| `date-ordinal` | An ordinal in a date | `1st May 2020` → `1 May 2020` | E | r 1.11.1 |
| `month-abbrev` | An abbreviated month | `1 Jan 2020` → `1 January 2020` | E | r 1.11.1 |
| `weekday-comma` | A comma after the day of the week | `Thursday, 6 March 1987` → `Thursday 6 March 1987` | W | r 1.11.1 |
| `latin-not-italic` | An italicised Latin term that AGLC4 sets in roman | `*ratio decidendi*` → `ratio decidendi` | W | r 1.8.3 |
| `latin-italic` | A Latin term that AGLC4 italicises, not italicised | `stare decisis` → `*stare decisis*` | W | r 1.8.3 |
