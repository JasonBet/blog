#!/usr/bin/env node
/**
 * Fail the build on anything the deployed Content Security Policy would block.
 *
 * This exists because CSP breakage is invisible locally: `astro dev` and
 * `astro preview` do not apply the headers in `vercel.json`, so an inline
 * script works perfectly on localhost and is silently blocked in production.
 * Every CSP bug this project has had reached the live site first.
 *
 * Checks the built HTML for:
 *   1. inline <script> blocks          — script-src 'self' forbids them
 *   2. inline event handler attributes — blocked by the same directive
 *   3. data: URIs for fonts            — font-src 'self' forbids them
 *
 * Run automatically as part of `npm run build`.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

/** A <script> tag with no src attribute — i.e. one with an inline body. */
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi;

/**
 * An on*= handler in *attribute position*: preceded by whitespace inside a
 * tag. Matching bare `onload=` would also hit `el.onload = fn` in bundled JS,
 * which is ordinary JavaScript and not a CSP concern.
 */
const INLINE_HANDLER = /<[a-z][^>]*?\s(on[a-z]+)\s*=\s*["']/gi;

const DATA_FONT = /url\(\s*["']?data:(?:font|application\/font)/gi;

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

async function cssFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await cssFiles(path)));
    else if (entry.name.endsWith('.css')) out.push(path);
  }
  return out;
}

const problems = [];

for (const file of await htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  const where = relative(ROOT, file);

  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const body = match[0].replace(/<\/?script[^>]*>/gi, '').trim();
    if (body === '') continue; // an empty tag executes nothing
    problems.push(`${where}: inline <script> — ${body.slice(0, 70)}…`);
  }

  for (const match of html.matchAll(INLINE_HANDLER)) {
    problems.push(`${where}: inline handler ${match[1]}=`);
  }
}

for (const file of await cssFiles(DIST)) {
  const css = await readFile(file, 'utf8');
  if (DATA_FONT.test(css)) {
    problems.push(`${relative(ROOT, file)}: data: font URI — font-src 'self' blocks this`);
  }
}

if (problems.length > 0) {
  console.error('\nContent Security Policy check failed:\n');
  // Collapse the usual case of one problem repeated across every page.
  const counts = new Map();
  for (const p of problems) {
    const key = p.replace(/^[^:]+:/, '(various):');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [problem, count] of counts) {
    console.error(`  ${problem}${count > 1 ? `   [${count} files]` : ''}`);
  }
  console.error(
    '\nThese work locally and are blocked in production. See SECURITY.md.\n',
  );
  process.exit(1);
}

console.log('CSP check passed: no inline scripts, handlers, or data: fonts.');
