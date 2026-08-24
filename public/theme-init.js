/*
 * Runs before first paint so the correct theme is painted immediately and the
 * page never flashes white then dark.
 *
 * This lives in /public rather than in an inline <script> on purpose: an
 * external same-origin file is allowed by a strict `script-src 'self'` Content
 * Security Policy, whereas an inline script would force us to loosen it.
 */
(function () {
  var root = document.documentElement;

  function resolve() {
    try {
      var stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (e) {
      /* localStorage can throw in private mode - fall through to the OS pref. */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  root.dataset.theme = resolve();
  root.classList.remove('no-js');

  // Astro's client router swaps the document; re-apply before the new page
  // is painted so the theme survives navigation.
  document.addEventListener('astro:after-swap', function () {
    document.documentElement.dataset.theme = resolve();
    document.documentElement.classList.remove('no-js');
  });
})();
