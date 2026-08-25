# Security

A blog is a small attack surface, but it is not zero. This is what the project
does about it and what you need to keep doing.

---

## The one rule about secrets

**Never put a key in `src/`.** Everything under `src/` is compiled into the
HTML and JavaScript sent to browsers. A key there is public the moment you
deploy, and it stays public in the repository's history even after you delete
it.

Secrets go in environment variables, set in the Vercel dashboard
(Project → Settings → Environment Variables). Locally they go in `.env`, which
is git-ignored. `.env.example` documents which variables exist, with no values.

### The naming trap

Astro exposes any variable named `PUBLIC_*` to the browser. That is the whole
meaning of the prefix.

```
BUTTONDOWN_API_KEY=…        server only, safe
PUBLIC_BUTTONDOWN_KEY=…     shipped to every visitor — never do this
```

If it is a secret, it must not start with `PUBLIC_`.

### If a key leaks

Rotate it at the provider immediately. Do not try to fix it by rewriting git
history — assume anything ever pushed has been seen.

---

## How the newsletter keeps its key

The signup form does not talk to Buttondown. It posts to `/api/subscribe`, a
Vercel Function that runs on the server, and *that* talks to Buttondown using
`process.env.BUTTONDOWN_API_KEY`.

The key never appears in the built site. `api/subscribe.js` also:

- rejects anything that is not a `POST` with a JSON body
- requires a same-origin `Origin` header
- caps the body at 2 KB and the address at 254 characters
- validates the address before making any upstream call
- rate-limits per IP, best-effort, within a warm instance
- carries a hidden honeypot field that real people never fill in
- returns generic errors, never the upstream response body, which can echo
  request details back

If the key is missing, signup returns a neutral "temporarily unavailable"
rather than failing in a way that reveals the misconfiguration.

---

## HTTP headers

Set in `vercel.json` and applied to every response.

| Header | Effect |
| --- | --- |
| `Content-Security-Policy` | Only same-origin scripts run; see below. |
| `Strict-Transport-Security` | HTTPS only, for two years, including subdomains. |
| `X-Content-Type-Options: nosniff` | No MIME sniffing. |
| `X-Frame-Options: DENY` | The site cannot be framed. |
| `Referrer-Policy` | Full URLs are never sent to other origins. |
| `Permissions-Policy` | Camera, microphone, geolocation and friends are off. |
| `Cross-Origin-Opener-Policy` | Isolates the browsing context. |

After changing them, check the result at
[securityheaders.com](https://securityheaders.com).

`vercel.json` is validated against a strict schema and permits **no comment
keys** — adding one fails the deployment while `npm run build` still passes
locally. If a push does not seem to take effect, check whether the deployment
actually succeeded before assuming a caching problem.

The same file also sets caching. `/pagefind/*` deliberately revalidates rather
than caching for an hour: `pagefind.js` and `pagefind-entry.json` keep stable
filenames while their contents change every build, and the entry file points at
content-hashed chunks. Caching them leaves readers holding an index that
references files no longer deployed, and search fails silently.

### The Content Security Policy

```
script-src  'self' 'wasm-unsafe-eval' https://giscus.app
worker-src  'self' blob:
style-src   'self' 'unsafe-inline' https://giscus.app
font-src    'self'
frame-src   https://giscus.app https://www.youtube-nocookie.com https://player.vimeo.com
connect-src 'self' https://giscus.app
img-src     'self' data: https:
default-src 'self'
```

Three of those tokens are load-bearing and easy to mistake for clutter:

- **`'wasm-unsafe-eval'`** — Pagefind compiles a WebAssembly module to run the
  search index. Without it search hangs forever on "Searching…". It permits
  WebAssembly compilation only, not `eval()`.
- **`worker-src 'self' blob:`** — Pagefind's search worker. Without it the
  worker times out and falls back to the slower main thread.
- **`https://giscus.app` in `style-src`** — the comment widget's own
  stylesheet. Without it comments render unstyled.

`font-src 'self'` also forces a build setting: `vite.build.assetsInlineLimit: 0`
in `astro.config.mjs` stops Vite inlining KaTeX's fonts as `data:` URIs, which
this directive would otherwise block — silently rendering maths in fallback
fonts.

`script-src 'self'` means **no inline scripts anywhere**. That constraint is
load-bearing, and there are two places it shapes the code:

1. `public/theme-init.js` is a real file rather than an inline script, so the
   theme can be applied before first paint without loosening the policy.
2. Every component `<script>` imports from `src/lib/client.ts`. Astro inlines a
   component script that has no imports, and an inline script would be blocked
   — the import forces it out into a separate file.

If you add a component with a `<script>` block, import something in it. If you
forget, the build still succeeds and the feature silently stops working in
production. To check:

`npm run build` runs an automated check (`scripts/check-csp.mjs`) that fails
the build if any inline script, inline event handler, or `data:` font URI made
it into the output. Run it alone with:

```bash
npm run check:csp
```

Inline event handlers (`onclick=`, `onsubmit=`) are blocked by the same
directive as inline scripts, so they count too.

**Local testing cannot catch any of this.** `astro dev` and `astro preview` do
not apply `vercel.json` headers, so anything the policy blocks works perfectly
on localhost and fails only once deployed. Check the browser console on the
real site after touching client JS, the policy, or asset handling.

`'unsafe-inline'` is present for **styles only**. Syntax highlighting emits
per-token `style` attributes, which CSP governs under `style-src`. Inline
styles cannot execute code, so this is a much smaller concession than the
script equivalent.

---

## Third-party code

The site loads no tag manager, no third-party fonts, and no CDN scripts.

Vercel Web Analytics is enabled. It is cookieless and collects no personally
identifying information, and Vercel serves its script from a same-origin path
(`/_vercel/insights/script.js`) rather than a third-party domain — which is why
it works under `script-src 'self'` without loosening the policy. To remove it,
drop `webAnalytics` from the adapter options in `astro.config.mjs`.

Fonts are self-hosted from `node_modules`. Search runs entirely in the browser
against a static index.

Exactly two third parties can ever load, and only if you opt in:

- **giscus**, if you enable comments. It runs in an iframe on its own origin
  and readers authenticate with GitHub directly — this site never sees a token.
- **YouTube / Vimeo**, if a post embeds a video. These are click-to-load: the
  page shows a static poster, and no request reaches the video host until the
  reader presses play. Embeds are sandboxed and YouTube is served through
  `youtube-nocookie.com`.

---

## Content handling

Posts are yours, but two habits are worth keeping:

- **Frontmatter is validated** by a schema in `src/content.config.ts`. A bad
  field fails the build rather than rendering something unexpected.
- **`innerHTML` appears exactly once**, in the search page, applied to
  Pagefind's excerpt. Pagefind generates that string itself from your own
  content and only inserts `<mark>` tags. If you ever render text from an
  outside source, use `textContent`.

---

## Dependencies

```bash
npm audit           # check for known vulnerabilities
npm outdated        # see what has moved
npm update          # apply compatible updates
```

Worth doing every month or two. Consider enabling Dependabot on the GitHub
repository so security updates arrive as pull requests.

---

## What this does not do

Being honest about the boundaries:

- The rate limit on `/api/subscribe` is per warm serverless instance, so a
  distributed flood can get past it. It exists to stop accidental hammering,
  not a determined attacker. If that becomes a real problem, move the counter
  into Vercel KV or put Vercel's WAF in front of the route.
- There is no authentication anywhere, because there is nothing to log in to.
- Comment moderation happens in GitHub Discussions, not here.

---

## Reporting something

If you find a problem with a site built from this repository, email the address
in the footer.
