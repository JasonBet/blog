#!/usr/bin/env node
/**
 * Build the Pagefind search index, then make sure it reaches whatever
 * directory actually gets deployed.
 *
 * Why this is not just `pagefind --site dist`:
 *
 * With the Vercel adapter installed, `astro build` copies `dist/` into
 * `.vercel/output/static/` as its final step, and Vercel serves *that*
 * directory. Pagefind runs afterwards and writes into `dist/pagefind`, which
 * by then has already been copied — so the index never ships and every search
 * 404s in production while working perfectly with `npm run preview`.
 *
 * So: index `dist` (which keeps local preview working), then mirror the
 * result into the adapter's output if that directory exists.
 */
import { spawnSync } from 'node:child_process';
import { cp, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST_INDEX = fileURLToPath(new URL('../dist/pagefind/', import.meta.url));
const ADAPTER_STATIC = fileURLToPath(
  new URL('../.vercel/output/static/', import.meta.url),
);
const ADAPTER_INDEX = fileURLToPath(
  new URL('../.vercel/output/static/pagefind/', import.meta.url),
);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error('');
  console.error(message);
  process.exit(1);
}

// 1. Build the index against the plain Astro output.
//    `shell: true` so this resolves the .cmd shim on Windows as well as the
//    plain binary elsewhere.
const result = spawnSync('npx pagefind --site dist', {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
});

if (result.error) {
  fail(`Could not run Pagefind: ${result.error.message}`);
}
if (result.status !== 0) {
  fail(`Pagefind exited with ${result.status}; search would be broken.`);
}
if (!(await exists(DIST_INDEX))) {
  fail('Pagefind reported success but wrote no index; search would be broken.');
}

// 2. Mirror it into the adapter's output, which is what Vercel serves.
if (await exists(ADAPTER_STATIC)) {
  await rm(ADAPTER_INDEX, { recursive: true, force: true });
  await cp(DIST_INDEX, ADAPTER_INDEX, { recursive: true });
  console.log('Copied the search index into .vercel/output/static/pagefind');
} else {
  // No adapter output (plain static build) — dist is what gets deployed.
  console.log('No adapter output found; dist/pagefind is the deployed index.');
}
