# Choosing which notes it works in

By default the plugin works in every note. If your vault also holds lecture notes, readings or a journal, you can keep the plugin to your assignments.

## Use AGLC4 in

In [settings](settings.md), under **Notes**, set **Use AGLC4 in** to:

- **All notes** (the default);
- **Assignment notes only**: notes with the property `aglc` ticked; or
- **Assignment notes, and notes in these folders**: those, plus every note in the folders you list under **Folders** (for example `Law/Assignments`), including the folders inside them.

When you switch away from all notes, the plugin offers to mark the notes that already have footnotes as assignment notes, so your current assignments stay on.

## Marking a note

- Run **Turn AGLC4 on for this note** (or **Turn AGLC4 off for this note**).
- Click **AGLC4 off** in the status bar to turn the note on.
- Tick or untick the note's `aglc` property in the Properties panel.

The `aglc` property always wins: a note with `aglc` unticked is off even with **All notes**, and a note with it ticked is on wherever it is. Imported Word documents and the example essay are marked automatically.

## What "off" means

In a note the plugin does not work in, nothing is checked, underlined, suggested or numbered, Enter and Escape behave normally, and nothing is changed automatically: footnotes are not moved or renumbered, and `(n X)` is not updated. The status bar shows **AGLC4 off**.

Commands you run there yourself, such as export or **Insert footnote**, still work. Version history is kept for every note unless **Keep history of** is set to the notes AGLC4 is used in.

## A note's own style

A note's properties can set its style, overriding the settings for that note only, in export, the page preview and the editor:

| Property | Sets | Values |
| --- | --- | --- |
| `aglc-headings` | Heading style | `aglc` (AGLC4 hierarchy) or `plain` |
| `aglc-level-one` | AGLC4 level one | `auto`, `h1` or `h2` |
| `aglc-bibliography` | Add a bibliography | `true` or `false` |
| `aglc-font` | Font | a font name |
| `aglc-font-size` | Body text size | points |
| `aglc-footnote-size` | Footnote text size | points |
| `aglc-line-spacing` | Line spacing | `1`, `1.5` or `2` |
| `aglc-page-numbers` | Page numbers | `true` or `false` |
| `aglc-title` | Title from file name | `true` or `false` |
| `aglc-keep-footnotes-together` | Keep footnotes on one page | `true` or `false` |
| `aglc-prompts` | [Paragraph prompts](paragraph-prompts.md) for the note | `irac`, `ilac`, `hirac`, `mirat`, `critical`, `discuss`, or the name of your own set |

```yaml
---
aglc: true
aglc-headings: aglc
aglc-bibliography: true
aglc-line-spacing: 2
---
```

A value the plugin does not understand (such as `aglc-line-spacing: 3`) is ignored, and the setting is used instead.
