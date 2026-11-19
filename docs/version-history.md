# Version history

The plugin keeps a version history of your notes, so any earlier version can be seen and restored, as in Word or Google Docs. It is on by default.

## When a version is saved

- **As you write:** at most once every 2 minutes while you edit (change this with **Minutes between versions**), always with the latest text.
- **When you open or leave a note.**
- **Before every change the plugin makes:** tidying footnotes, fixing all problems, inserting a bibliography, restoring a version, or replacing an exported file. These versions are labelled with what happened, such as "Before tidying footnotes".

A version identical to the one before is not saved twice.

## Seeing and restoring versions

Open the history with **Show version history**, the clock icon in the ribbon, or by right-clicking a note and choosing **Version history**. It shows the active note's versions, newest first, grouped by day, with the number of characters added or removed.

Select a version to see what restoring it would change: lines it would bring back are green, lines it would remove are red. Then:

- **Restore this version** replaces the note's text with that version. Undo (Ctrl/Cmd+Z) reverses it, and the text you had before is saved as a version first.
- **Restore as a copy** opens the version as a new note, such as `Essay (version 2026-11-19 14.05)`, so you can compare or copy from it.
- **Name** gives the version a name.
- **Show full text** shows the version itself rather than the changes.

## Named versions

Run **Save a named version of this note** (or click the tag icon in the history) to name the current version, such as "Submitted draft" or "Before supervisor's comments". Named versions are never removed.

## Deleted and renamed notes

The history follows a note when it is renamed or moved. When a note is deleted, its history is kept: run **Restore a deleted note from version history** and choose it from the list to bring it back as last saved.

## Exported files

Before an exported Word or HTML file is replaced, the file being replaced is saved in the history ([exporting again](export.md#exporting-again)). Earlier copies are listed at the end of the note's history, each with **Restore**.

## How long versions are kept

Every version from the last day is kept, then one per hour for a month, then one per day, forever. Named versions are always kept. Turn on **Keep every version** to keep them all. Versions are compressed: a typical essay's whole history takes a few MB. The history view shows how much space it uses.

## Where it is kept, and what it protects against

The history is kept in your vault, in the hidden folder `.aglc-history` (change it with **History folder**). Each version is checked against a fingerprint when it is read, so a damaged version is refused rather than restored, and every file is written so that a crash part-way through cannot damage versions already saved.

It is on the same disk as your notes, so it protects you from mistakes, bad edits and deleted notes, but not from losing the device. For that, back up or sync your vault folder (iCloud, Dropbox, OneDrive, Time Machine): the history is backed up with it. Obsidian Sync does not sync hidden folders, so with Obsidian Sync the history stays on each device.

By default history is kept for every note. **Keep history of** can limit it to the notes the plugin works in ([notes](notes.md)). Turn it off with **Keep version history**.
