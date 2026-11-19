# Paragraph prompts

Paragraph prompts are short reminders of what each part of a legal essay or problem answer should do. They appear faintly at an empty paragraph, where you are about to write, and disappear as you type.

```
## Rule

State the rule as a general principle, without the parties' facts, with its source: …
```

Prompts are guidance on **structure**, never content. They are drawn by the editor, not written into the note, so they can never end up in your submission, an export, the page preview or the word count. They are fixed text, chosen by where you are in the note: no AI, nothing sent anywhere ([privacy](privacy.md)).

## Turning them on for a note

Prompts show only in notes you choose, so nothing changes in your other notes.

- **For an existing note:** run **Choose paragraph prompts for this note** and pick a kind of essay or answer. This sets the note's property `aglc-prompts` (for example `aglc-prompts: irac`). Choose **No prompts** to remove it.
- **For a new note:** run **New legal essay or problem answer**, pick the kind, and give it a title. The note is created with its outline as plain headings, and the cursor under the first heading, where the first prompt shows. Rename or delete any heading you don't need.

**Show paragraph prompts** in [settings](settings.md) hides them in every note at once, without changing the notes.

## The kinds of essay and answer

| Property value | Kind | Structure |
| --- | --- | --- |
| `irac` | Problem question: IRAC | For each issue: Issue, Rule, Application, Conclusion; then an overall conclusion |
| `ilac` | Problem question: ILAC | The same, with "Law" for "Rule" |
| `hirac` | Problem question: HIRAC | IRAC, with a short heading for each issue, as a question |
| `mirat` | Problem question: MIRAT | Material facts, Issues, Rules, Arguments, Tentative conclusion |
| `critical` | Essay: critical analysis | Introduction with your thesis; points that support it; counter-arguments and your response; conclusion |
| `discuss` | Essay: "discuss" question | Introduction; each side of the question; evaluation; a conclusion that answers the question as asked |

Law schools and lecturers differ: **your lecturer's instructions come first.** If your subject uses another method (IPAC, CLEO, or a structure of its own), make a [custom set](#your-own-prompt-sets).

## Where each prompt comes from

The prompts follow where you are in the note:

- **Under a section's heading** (Issue, Rule, Application, Introduction, Counter-arguments, Conclusion …), the prompts for that section. Headings are recognised in any form: numbered (`A. Rule`, `(a) Application`), in bold, or with text after a colon (`Application: the offer`). Common alternatives are recognised too, such as "Law", "Relevant law" or "Analysis".
- **Each paragraph moves to the next prompt** for its section, and the last one repeats. Under Application, for example: apply each element to the facts; then compare with the cases; then the other party's best argument; then end with the point the paragraph establishes.
- **Under any other heading:**
  - in an essay, the heading is one of your points, and its paragraphs cycle through a body paragraph's parts: topic sentence, authority, analysis, link back to your thesis (the PEEL pattern: Point, Evidence, Explanation, Link);
  - in a problem answer, the heading is an issue, and its paragraphs follow IRAC in order, for an issue written without sub-headings.
- **Before the first heading** (or under the note's title): the introduction or overview, then body paragraphs.
- **Never** in footnotes, code, comments or properties, or on a line that has text.

## Your own prompt sets

To follow your subject's or lecturer's structure, make your own set:

1. Run **Copy a prompt set to edit as your own**, pick the set closest to what you need, and name it. A note called `Prompts - <name>` opens, with every section and prompt of the set.
2. Edit it. Each `##` heading is a section, and its list items are its prompts, in order:

   ```markdown
   ---
   aglc-prompt-set: "Contracts IPAC"
   aglc-prompt-kind: problem
   ---

   ## Issue (each issue)

   - State the issue as a question.

   ## Principle | Law | Rule (each issue)

   - State the principle, with its authority.

   ## Body

   - The prompts for paragraphs under any other heading.
   ```

   - **Alternative headings** for a section follow `|`. The first is the one used in a new outline.
   - **(each issue)** marks a section that belongs to each issue of a problem answer.
   - **(optional)** leaves a section out of a new outline.
   - **Body** holds the prompts for paragraphs under any other heading.
   - `aglc-prompt-kind` is `essay` or `problem`.
3. Use it: run **Choose paragraph prompts for this note** or **New legal essay or problem answer**: your set is listed with the built-in ones. Its property value is its name, for example `aglc-prompts: "Contracts IPAC"`.

Changes to the set's note apply as soon as you save. A set can live in any folder. Text other than headings and list items is ignored, so you can keep notes about the set in it.

## Sources

The built-in prompts are written from the advice of these Australian law schools' writing guides:

- Southern Cross University, Learning Zone, *IRAC: Structuring legal analysis* (quick guide): IRAC and ILAC; framing the issue as a question, stating the rule with AGLC4 citations, "In this case …", "Similar to …" / "Unlike …", stating the likely outcome.
- Monash University Library, *Legal problem solving*: specific issues ("not *Will the plaintiff win?*"), rules as general principles broken into elements, application as the longest part, with both sides and their strength, and hedged conclusions; MIRAT.
- ANU Academic Skills, *Writing in Law*: HIRAC; legal essays that take a position, address counter-arguments and rely on primary authority.
- UTS Faculty of Law, *Guide to Written Communication* (2023): introductions (the issue, your position, the main points, definitions and scope), topic sentences and one point per paragraph, concluding sentences, conclusions with no new argument that match the introduction, what "critically analyse" and "discuss" ask, and planning problem questions.
- Tudor and Falconer, *A Guide to Writing for Law School* (La Trobe University; CAUL open textbook): planning, structure and the meaning of "discuss".
