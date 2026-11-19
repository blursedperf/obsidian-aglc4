# Page preview

**Open page preview** (command, or the book icon in the ribbon) shows the active note as Word will paginate it: A4 pages with each footnote at the bottom of the page that cites it. It follows the note you are editing and updates as you type. Use the toolbar to zoom in and out, fit the page to the pane, or refresh.

The preview uses the same fonts, sizes, line spacing and heading style as the [Word export](export.md), including a note's [own style](notes.md#a-notes-own-style) and its [bibliography](bibliography.md), and follows Word's rules:

- a line goes on a page only if it fits completely, with the footnote separator and the footnotes it cites;
- a footnote starts on the page of its reference. With **Keep footnotes on one page** on (the default), a short footnote (up to two lines) that does not fit moves to the next page with the line citing it; a longer one, or any footnote with the setting off, continues at the bottom of the next page;
- a paragraph split across pages leaves at least two lines on each side (widow and orphan control);
- headings stay with the paragraph that follows them;
- the space between paragraphs is the larger of the space after one and the space before the next.

## How accurate it is

These rules were checked against PDFs saved from Word: on the test documents in the repository, every page has the same body lines and footnotes as Word's, and line breaks within paragraphs matched Word word for word. Where Times New Roman is not installed (as on most Linux systems), the preview uses Liberation Serif, which has the same character widths.

The preview is a guide, not a guarantee. Word can differ by a line where a paragraph ends within a point or so of the bottom of a page. Tables, lists and code blocks are laid out more approximately than ordinary paragraphs. Pages are drawn black on white whatever your theme.
