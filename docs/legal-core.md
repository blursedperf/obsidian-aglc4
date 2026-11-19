# Legal Core

AGLC4 Citations works on its own. If you also install **Legal Core (Australia)**, the shared foundation of a suite of legal-writing plugins, AGLC4 Citations can share the sources your notes cite with it, so the other legal plugins you use see the same cases, legislation and sources.

## What changes with Legal Core installed

- **Sharing your citations.** The first time AGLC4 Citations finds Legal Core, it asks whether to share your citations. If you agree, it shares those in the notes it works in ([notes](notes.md)), and after that the citations of each note as you change it.
- **What is shared:** each source cited in full and correctly (not "Ibid" or later references), without pinpoints, with the note that cites it. A citation with an AGLC4 error is shared once you correct it.
- **Your notes are only read, never changed.** Sharing only adds to or updates Legal Core's store; it never removes anything, and your notes stay the source of truth.
- **Nothing else changes.** Checking, footnotes, the page preview and export work exactly as before: exports always use AGLC4 Citations' own engine, so they are the same with or without Legal Core.

## Without Legal Core

Nothing is shared and nothing is different. If Legal Core is disabled while you work, AGLC4 Citations stops sharing and carries on as usual. When it is enabled again, AGLC4 Citations reconnects and catches up on the notes that changed in the meantime.

## Turning sharing off

Turn off **Share citations with Legal Core** in [settings](settings.md). What was already shared stays in Legal Core's store.
