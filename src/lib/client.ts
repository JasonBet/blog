/**
 * Helpers shared by every client-side component script.
 *
 * Importing from here also has a build-time effect worth knowing about:
 * Astro inlines a component `<script>` that has no imports, and an inline
 * script is forbidden by this site's `script-src 'self'` Content Security
 * Policy. A script that imports something is always emitted as a separate
 * file instead, which is what we want. See SECURITY.md.
 */

/**
 * Run `fn` now, and again after every client-side navigation.
 *
 * Astro's `<ClientRouter />` swaps the document without a full page load, so
 * anything that binds to DOM nodes has to re-run on `astro:page-load`.
 * Handlers are expected to be idempotent — guard with a `data-bound` flag.
 */
export function onReady(fn: () => void): void {
  fn();
  document.addEventListener('astro:page-load', fn);
}

/**
 * Marks `element` as handled and reports whether it had already been claimed,
 * so repeated `onReady` runs do not attach duplicate listeners.
 */
export function claim(element: HTMLElement): boolean {
  if (element.dataset.bound === 'true') return false;
  element.dataset.bound = 'true';
  return true;
}
