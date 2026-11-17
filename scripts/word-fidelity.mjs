#!/usr/bin/env node
/*
 * Word fidelity check for the page preview.
 *
 *   node scripts/word-fidelity.mjs
 *
 * For each test/fidelity/<name>.md with a <name>.word.pdf saved from Microsoft Word (from the plugin's
 * Word export of the same note), lays the note out with the page preview code in headless Chromium and
 * compares every page with Word's: body lines, footnotes that start on the page, and footnote lines.
 *
 * Needs `chromium` (or CHROMIUM=/path/to/browser) and `pdftotext` (poppler) on the PATH. This is a
 * development tool: it is not part of the plugin and not run by `npm test`.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'test', 'fidelity');
const PORT = 9555;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per page of a Word PDF: body lines (12pt and larger), footnotes starting, footnote lines (10pt). */
function wordPages(pdf) {
	const xml = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], { encoding: 'utf8' });
	return xml.split('<page ').slice(1).map((page) => {
		let bodyLines = 0, noteLines = 0;
		const notesStarted = [];
		for (const m of page.matchAll(/<line xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([\s\S]*?)<\/line>/g)) {
			const h = Number(m[2]) - Number(m[1]);
			const words = [...m[3].matchAll(/>([^<]+)<\/word>/g)].map((w) => w[1]);
			const text = words.join(' ');
			if (h < 8 && /^\d+$/.test(text)) notesStarted.push(Number(text)); // superscript footnote number
			else if (Number(m[1]) > 775 && /^\d+$/.test(text)) continue; // page number
			else if (h > 12.4) bodyLines++;
			else if (h > 10) noteLines++;
		}
		return { bodyLines, notesStarted: notesStarted.sort((a, b) => a - b), noteLines };
	});
}

async function main() {
	const out = mkdtempSync(join(tmpdir(), 'aglc4-fidelity-'));
	const browser = process.env.CHROMIUM ?? 'chromium';
	let proc;
	try {
		await esbuild.build({
			entryPoints: [join(DIR, 'entry.ts')], bundle: true, format: 'iife', platform: 'browser',
			outfile: join(out, 'entry.js'), logLevel: 'warning', external: ['obsidian'],
		});
		const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
		writeFileSync(join(out, 'index.html'), `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body><script src="entry.js"></script></body></html>`);

		proc = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(out, 'profile')}`, 'about:blank'], { stdio: 'ignore' });
		let targets;
		for (let i = 0; i < 50 && !targets; i++) {
			try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); }
		}
		if (!targets) throw new Error(`could not start ${browser}`);
		const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
		await new Promise((r) => { ws.onopen = r; });
		let id = 0;
		const pending = new Map();
		ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); };
		const call = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
		await call('Page.enable');
		await call('Page.navigate', { url: `file://${join(out, 'index.html')}` });
		await sleep(1500);

		let failures = 0;
		for (const file of readdirSync(DIR).filter((f) => f.endsWith('.word.pdf'))) {
			const name = file.replace(/\.word\.pdf$/, '');
			const markdown = readFileSync(join(DIR, `${name}.md`), 'utf8');
			const res = await call('Runtime.evaluate', { expression: `runLayout(${JSON.stringify(markdown)})`, awaitPromise: true, returnByValue: true });
			if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? 'layout failed');
			const preview = res.result.result.value;
			const word = wordPages(join(DIR, file));
			console.log(`\n${name}: Word ${word.length} pages, preview ${preview.length} pages`);
			console.log('  page | body lines (Word/preview) | footnotes starting (Word/preview) | footnote lines (Word/preview)');
			for (let i = 0; i < Math.max(word.length, preview.length); i++) {
				const w = word[i] ?? { bodyLines: '-', notesStarted: [], noteLines: '-' };
				const p = preview[i] ?? { bodyLines: '-', notesStarted: [], noteLines: '-' };
				const same = w.bodyLines === p.bodyLines && w.noteLines === p.noteLines && w.notesStarted.join() === p.notesStarted.join();
				if (!same) failures++;
				console.log(`  ${same ? ' ' : '✗'} ${String(i + 1).padStart(2)} | ${String(w.bodyLines).padStart(3)} / ${String(p.bodyLines).padEnd(3)} | ${(w.notesStarted.join(',') || '-').padStart(17)} / ${(p.notesStarted.join(',') || '-').padEnd(17)} | ${String(w.noteLines).padStart(3)} / ${p.noteLines}`);
			}
		}
		console.log(failures === 0 ? '\nEvery page matches Word.' : `\n${failures} page(s) differ from Word.`);
		ws.close();
		process.exitCode = failures === 0 ? 0 : 1;
	} finally {
		proc?.kill();
		await sleep(300);
		rmSync(out, { recursive: true, force: true });
	}
}

main().catch((e) => { console.error(e); process.exit(2); });
