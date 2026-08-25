# Project notes

A personal blog built with Astro 7. Repo `JasonBet/blog`, deployed at
https://jasonbetsargon-blog.vercel.app. Human-facing docs:
[README.md](./README.md), [WRITING.md](./WRITING.md),
[SECURITY.md](./SECURITY.md).

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Verify with `npm run build` (which also rebuilds the search index) and
`npm run check` for types. `npm run preview` serves the built site.

## The CSP is load-bearing, and it does not exist locally

`vercel.json` sets a strict Content Security Policy. **`astro dev` and
`astro preview` do not apply those headers**, so anything the policy blocks
works perfectly on localhost and breaks only on the deployed site. Every CSP
bug this project has had was found that way, after being declared working.

A green `npm run build` says nothing about whether the site functions under
the policy. Headers being *present* and the site *working under them* are
different claims — check the second one, on the real deployment.

Things the policy forbids that are easy to reintroduce:

- **No inline `<script>`.** Astro inlines a component script that has no
  imports, so every component `<script>` must import from `src/lib/client.ts`
  (`onReady`, `claim`).
- **No inline event handlers.** `onclick=`, `onsubmit=` and friends are
  blocked exactly like inline scripts. Attach listeners in a bundled script.
- **No `data:` URIs for fonts.** `vite.build.assetsInlineLimit: 0` in
  `astro.config.mjs` exists solely so KaTeX's fonts are emitted as real files.
  Without it, Vite inlines the small ones, `font-src 'self'` blocks them, and
  maths silently renders in fallback fonts with no error anywhere.

Non-obvious tokens in the policy — each is required, do not "tidy" them away:

| Token | Required by |
| --- | --- |
| `'wasm-unsafe-eval'` in `script-src` | Pagefind compiles a WASM module. Without it, search hangs on "Searching…" forever. |
| `worker-src 'self' blob:` | Pagefind's search worker; otherwise it times out and falls back. |
| `https://giscus.app` in `style-src` | The comment widget's theme stylesheet. Without it comments render unstyled. |

After changing client JS, the CSP, or asset handling:

```
npm run build
grep -rnE '<script type="module">|onclick=|onsubmit=' dist/    # must print nothing
```

Anything that changes what the deployed directory contains (adapters, build
steps, asset handling) needs checking against the **deployed** output, not just
`dist/`. Those are now two different directories.

then load the **deployed** site in a real browser and check the console. A
headless run with `--virtual-time-budget` is not reliable here: Pagefind's
worker races the virtual clock, so search intermittently reports success or
hangs regardless of whether it actually works. Drive a real browser and wait
on an actual condition (the status text changing) instead.

## Vercel specifics

- **`/api/*` is invoked with Node's `(req, res)`**, not Web `Request` /
  `Response`. `api/subscribe.js` has a small adapter that normalises either
  convention — keep it. Written Web-style alone, every call returns
  `500 FUNCTION_INVOCATION_FAILED`, and nothing local catches it because the
  function never runs during `astro build`.
- **Environment variables are baked in at build time.** Adding or changing one
  in the dashboard does not affect the running deployment; it needs a
  redeploy. Pushing a commit is the usual way to trigger that.
- **`site` comes from `VERCEL_PROJECT_PRODUCTION_URL` at build time**, so
  renaming the project needs a redeploy before canonical URLs, RSS and the
  sitemap follow. Set `SITE_URL` to pin a real custom domain.
- **`@astrojs/vercel` is installed** (Vercel's own PR added it to enable Web
  Analytics). `vercel.json` headers still apply with it — verified against the
  live deployment, so do not assume the Build Output API drops them.
- **The adapter breaks the search index unless the build accounts for it.**
  `astro build` copies `dist/` into `.vercel/output/static/` as its final step,
  and Vercel serves that directory. Pagefind runs afterwards and writes into
  `dist/pagefind`, which has already been copied — so the index never ships and
  every search 404s in production while `npm run preview` works perfectly.
  `scripts/build-search.mjs` indexes `dist` and then mirrors the result into
  the adapter output. Keep that mirroring step, and keep its hard failure when
  Pagefind produces nothing.
- **Web Analytics is same-origin.** Vercel serves it from
  `/_vercel/insights/script.js`, not a third-party domain, which is why it
  works under `script-src 'self'`. If it ever moves to `va.vercel-scripts.com`,
  the policy needs that host.

## Other conventions

- **Secrets never live under `src/`.** Everything there ships to the browser,
  and Astro exposes any `PUBLIC_*` variable by design. Server-only values are
  read from `process.env` inside `api/`.
- **Dates are handled in UTC.** `pubDate: 2026-01-01` parses to midnight UTC;
  formatting in local time renders the previous day west of Greenwich. Use
  `timeZone: 'UTC'` and `getUTCFullYear()`.
- **Config objects read by guards use explicit interfaces, not `as const`.**
  `COMMENTS` and `NEWSLETTER` are typed via `interface`, because `as const`
  narrows a filled-in value to a string literal and then TypeScript rejects
  `x !== ''` as an impossible comparison.
- **Adding a topic** is one entry in `TOPICS` in `src/consts.ts`. The schema
  enum, the topic pages and the accent colour all derive from it.
- **Commit as `jasonbetsargon@gmail.com`.** The repo-local git config is
  already set to it; do not override with `git -c user.email=...`. The global
  config is a different address, and commits authored with it are not linked
  to the GitHub account.

## Astro 7 specifics

- The default Markdown processor (Sätteri) does not run remark/rehype plugins,
  so `astro.config.mjs` uses `processor: unified({ ... })` from
  `@astrojs/markdown-remark` for KaTeX and heading anchors.
- `rehype-slug` must run **before** `rehype-autolink-headings`, and the
  anchor's `content` must be an empty `<span>` with the `#` supplied by CSS. A
  text node there ends up inside `headings[].text` and pollutes the table of
  contents.
- Astro's built-in `security.csp` is unusable here: it is incompatible with
  both `<ClientRouter />` and Shiki.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
