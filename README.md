# AGLC4 Citations for Obsidian

[![Buy me a coffee](https://img.shields.io/badge/Buy_me_a_coffee-lawfair-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/lawfair)

If it saves you some footnote pain, **[buy me a coffee](https://buymeacoffee.com/lawfair)**...or don't, no presh. If you'd rather chip in a third of a coffee every month, I'm on [Patreon](https://patreon.com/Blursedperf) too.

Write footnoted legal work in Obsidian to the *Australian Guide to Legal Citation* (4th ed). The plugin:

- **underlines incorrect or incomplete citations** as you write, explains the AGLC4 rule on hover and offers a one-click fix;
- **suggests the next required element** of the citation you are typing;
- **keeps footnotes at the bottom of the note**, in reading order and renumbered, and keeps `(n X)` cross-references pointing at the right footnote;
- **exports to Word with real footnotes** at the bottom of each page, with AGLC4 headings and a bibliography, and shows the pages in a **page preview** first;
- **imports Word documents** with their footnotes;
- **keeps a version history** of your notes, so any earlier version, deleted note or overwritten export can be restored;
- **guides each paragraph** of an essay or problem answer, if you want: what it should do and how to build it, sentence by sentence, for IRAC, ILAC, HIRAC or MIRAT problem questions, critical analysis or "discuss" essays, or your own structure, written from Australian law schools' writing guides;
- **can be limited to your assignments**, leaving your other notes alone, with each assignment's own style in its properties.

**Try it straight away:** run **Create example essay** from the command palette. It adds a five-page critical essay to your vault. The essay is correctly cited, with a wide range of sources and all four AGLC4 heading levels. It comes with a tour of what to try, paragraph guides, and some citations with mistakes to fix.

## User guide

The full guide is in [`docs/`](docs/README.md). Start with [Getting started](docs/getting-started.md), or jump to:

- [Workflows](docs/workflows.md): writing an assignment, importing a Word draft, submitting
- [Paragraph prompts](docs/paragraph-prompts.md) · [Writing footnotes](docs/writing-footnotes.md) · [Next element](docs/next-element.md) · [Checking citations](docs/checking.md) · [Rules reference](docs/rules.md)
- [Headings](docs/headings.md) · [Page preview](docs/page-preview.md) · [Exporting](docs/export.md) · [Bibliography](docs/bibliography.md) · [Importing](docs/import.md)
- [Version history](docs/version-history.md) · [Choosing which notes it works in](docs/notes.md)
- [Commands](docs/commands.md) · [Settings](docs/settings.md) · [Troubleshooting and FAQ](docs/troubleshooting.md)

## Private, offline and AI-free

Your writing never leaves your computer.

- **Fully offline.** The plugin makes no network requests of any kind: no servers, no APIs, no downloads, no update checks. It works the same with your internet connection turned off.
- **No AI.** Citations are checked with fixed rules written from the AGLC4 text, not by a language model or any other AI service. Nothing you write is sent anywhere to be analysed, and the same text always gets the same result.
- **No telemetry, no accounts.** There is no tracking, analytics or sign-in.
- **Your files stay where they are.** Exports are written into your vault; Word imports are read on your computer. Nothing is uploaded.
- **Rigorously checked.** A rigorous offline audit checks the plugin, including its bundled libraries, to confirm it makes no network requests.

See [Privacy](docs/privacy.md) for how this is checked, and how to verify that a release was built from this source.

## Development

See [Development](docs/development.md) for building, testing and the Word fidelity check.
