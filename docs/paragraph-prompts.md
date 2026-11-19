# Paragraph prompts

Paragraph prompts guide you through a legal essay or problem answer, one paragraph at a time. Above the paragraph you are writing, a small guide shows what the paragraph should do, and how to build it, sentence by sentence. The sentence you are writing is highlighted, and the guide stays in place while you write the paragraph:

```
## Rule

┃ Rule: the governing principle and its source
┃  1. Rule: the principle in general terms, without the parties' names or facts ("A promise is …").
┃  2. Authority: its source, the Act and section or the leading case, cited in AGLC4 in a footnote.   ← you are here
┃  3. Elements: the elements or test it sets out, in the order you will apply them.
A promise is enforceable only if it is supported by consideration. The leading…
```

When you finish a sentence (a full stop, question mark or exclamation mark, then a space), the next sentence is highlighted. When you start a new paragraph, the guide moves to it, with the guide for the next paragraph of that section.

The guides are about **structure**, never content: they suggest what each sentence does, and sometimes how it could start ("The issue is whether …", "As in …", "Unlike …"), but never what to argue. They are drawn by the editor, not written into the note, so they can never end up in your submission, an export, the page preview or the word count. They are fixed text, chosen by where you are in the note: no AI, nothing sent anywhere ([privacy](privacy.md)).

## When the paragraph needs something else

The guide expects the usual order, but a paragraph often needs something else: a step skipped or repeated, a sentence the guide does not list, or a different kind of paragraph altogether. You can change the guide for the paragraph you are writing:

- **Another sentence of the guide:** click (or tap) a sentence in the guide to make it the one you are writing. The guide keeps counting from there: jump to *Reasoning*, finish that sentence, and *Mini-conclusion* is next.
- **Another kind of sentence:** click **⟳** on the highlighted sentence to show another kind of sentence in its place, and again for the next. Problem answers offer:
  - a second authority;
  - a qualification;
  - statutory interpretation (text, context and purpose);
  - distinguishing a case;
  - an alternative argument;
  - a missing fact;
  - evidence and burden;
  - policy;
  - a transition.

  Essays offer:
  - an example;
  - a second authority;
  - a contrast;
  - a concession;
  - a qualification;
  - a definition;
  - policy;
  - reform;
  - a transition.

  After the last, it comes back to the guide's own sentence. Once you finish that sentence, the guide goes back to its structure. When a paragraph has more sentences than the guide, **⟳** offers these for the next one.
- **Another paragraph guide:** click **‹** or **›** next to the guide's title (with "2 of 3") to see the section's other paragraph guides. For example, the guide expects *Application: the next element*, but you are writing the other side's argument: press **›** for *Application: the other side*.

These choices last while you write that paragraph, and are forgotten when you move to another. They are never saved, and the prompt sets are not changed.

Each has a command, so you can give them hotkeys in **Settings → Hotkeys**:

- **Paragraph guide: next sentence** and **Paragraph guide: previous sentence**;
- **Paragraph guide: another kind of sentence**;
- **Paragraph guide: next paragraph guide** and **Paragraph guide: previous paragraph guide**.

For example, Alt+↓ and Alt+↑ for the sentences, Alt+→ for another kind of sentence, and Alt+Shift+→ and Alt+Shift+← for the paragraph guides.

To see less, set **Guide shows** to **The current sentence** in [settings](settings.md): the guide then shows the paragraph's aim and only the sentence you are writing.

## Turning them on for a note

Prompts show only in notes you choose, so nothing changes in your other notes.

- **For an existing note:** run **Choose paragraph prompts for this note** and pick a kind of essay or answer. This sets the note's property `aglc-prompts` (for example `aglc-prompts: irac`). Choose **No prompts** to remove it.
- **For a new note:** run **New legal essay or problem answer**, pick the kind, and give it a title. The note is created with its outline as plain headings, and the cursor under the first heading, where the first prompt shows. Rename or delete any heading you don't need.

**Show paragraph prompts** in [settings](settings.md) hides the guide in every note at once, without changing the notes.

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

## Which guide shows

The guide follows where you are in the note:

- **Under a section's heading** (Issue, Rule, Application, Introduction, Counter-arguments, Conclusion …), the guides for that section's paragraphs, in order; the last repeats. Headings are recognised in any form: numbered (`A. Rule`, `(a) Application`), in bold, or with text after a colon (`Application: the offer`). Common alternatives are recognised too, such as "Law", "Relevant law" or "Analysis". For example, under **Application**:
  1. *One element applied to the facts:* topic sentence (the element), facts ("Here, …"), comparison with the closest case ("As in …" / "Unlike …"), reasoning, mini-conclusion ("It is therefore likely that …").
  2. *The next element:* the same, with a topic sentence linked to the last.
  3. *The other side:* the other party's best argument ("X may argue that …"), its support, your response, and how strong it is.
- **Under any other heading:**
  - in an essay, the heading is one of its parts: its first paragraph opens the part (its claim, how it advances your thesis, the points it covers), and the rest are body paragraphs built on **PEEL**: Point (the topic sentence), Evidence (authority, in a footnote), Explanation (analysis, not description), further support if needed, and a Link back to your thesis;
  - in a problem answer, the heading is an issue, and its paragraphs follow IRAC in order, for an issue written without sub-headings.
- **Before the first heading** (or under the note's title): the introduction (in an essay, the issue and your thesis, then the roadmap) or the overview, then body paragraphs.
- **In HIRAC**, while you write an issue's heading: how to put it as a short question.
- **Never** in footnotes, code, comments, properties, lists, quotations or tables.

## Your own prompt sets

To follow your subject's or lecturer's structure, make your own set:

1. Run **Copy a prompt set to edit as your own**, pick the set closest to what you need, and name it. A note called `Prompts - <name>` opens, with every section and prompt of the set.
2. Edit it. Each `##` heading is a section. Each list item is the guide for one paragraph of the section (the first, second, … paragraph; the last repeats), and the items indented under it are its sentences, in order:

   ```markdown
   ---
   aglc-prompt-set: "Contracts IPAC"
   aglc-prompt-kind: problem
   ---

   ## Issue (each issue)

   - Issue: the question the facts raise
   	- Facts: the key facts.
   	- Question: the issue, as a question.

   ## Principle | Law | Rule (each issue)

   - Principle: the law and its source
   	- Principle: the rule in general terms.
   	- Authority: the Act and section, or the case.

   ## Body

   - The guide for paragraphs under any other heading
   	- Point: …
   ```

   - **Sentences** are written "Role: what it says"; the role is shown in italics.
   - **Alternative headings** for a section follow `|`. The first is the one used in a new outline.
   - **(each issue)** marks a section that belongs to each issue of a problem answer.
   - **(optional)** leaves a section out of a new outline.
   - **Body** holds the guides for paragraphs under any other heading, and **Issue heading** the guide for an issue's heading (as in HIRAC).
   - **Alternatives** lists the other kinds of sentence that **⟳** cycles through, one list item each. Without it, a set uses the usual ones for an essay or a problem answer.
   - `aglc-prompt-kind` is `essay` or `problem`.
   - Sets made with 1.11.0 still work: their list items become paragraph guides without sentences.
3. Use it: run **Choose paragraph prompts for this note** or **New legal essay or problem answer**: your set is listed with the built-in ones. Its property value is its name, for example `aglc-prompts: "Contracts IPAC"`.

Changes to the set's note apply as soon as you save. A set can live in any folder. Text other than headings and list items is ignored, so you can keep notes about the set in it.

## Sources

The built-in guides are written from the advice of these Australian law schools' writing guides:

- Southern Cross University, Learning Zone, *IRAC: Structuring legal analysis* (quick guide): IRAC and ILAC; framing the issue as a question, stating the rule with AGLC4 citations, "In this case …", "Similar to …" / "Unlike …", stating the likely outcome.
- Monash University Library, *Legal problem solving*: specific issues ("not *Will the plaintiff win?*"), rules as general principles broken into elements, application as the longest part, with both sides and their strength, and hedged conclusions; MIRAT.
- ANU Academic Skills, *Writing in Law*: HIRAC; legal essays that take a position, address counter-arguments and rely on primary authority.
- UTS Faculty of Law, *Guide to Written Communication* (2023): introductions (the issue, your position, the main points, definitions and scope), topic sentences and one point per paragraph, concluding sentences, conclusions with no new argument that match the introduction, what "critically analyse" and "discuss" ask, and planning problem questions.
- Tudor and Falconer, *A Guide to Writing for Law School* (La Trobe University; CAUL open textbook): planning, structure and the meaning of "discuss".
