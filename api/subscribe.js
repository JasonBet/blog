/**
 * POST /api/subscribe — newsletter signup.
 *
 * Runs as a Vercel Function (Node.js runtime). Everything in this file
 * executes on the server: the Buttondown API key is read from the
 * environment, is never included in the built site, and is never returned
 * to the browser in any form.
 *
 * Required environment variable (set in the Vercel dashboard, never in git):
 *   BUTTONDOWN_API_KEY
 *
 * Optional:
 *   ALLOWED_ORIGIN  Comma-separated origins allowed to post here.
 *                   Defaults to the deployment's own origin.
 */

const BUTTONDOWN_ENDPOINT = 'https://api.buttondown.com/v1/subscribers';

const MAX_BODY_BYTES = 2_000;
const MAX_EMAIL_LENGTH = 254;

// Deliberately conservative: this is a gate, not a validator. Buttondown does
// the authoritative check, and a confirmation email does the rest.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Best-effort in-memory rate limit. A serverless instance is short-lived and
 * there may be several at once, so this will not stop a determined attacker —
 * it exists to stop one careless script hammering the upstream API. The
 * honeypot field below catches the ordinary spam bot.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing without bound across a warm instance's life.
  if (hits.size > 5_000) hits.clear();

  return recent.length > RATE_LIMIT_MAX;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function allowedOrigins(request) {
  const configured = process.env.ALLOWED_ORIGIN;
  if (configured) return configured.split(',').map((s) => s.trim()).filter(Boolean);
  return [new URL(request.url).origin];
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { message: 'Method not allowed.' });
  }

  // Same-origin only. Blocks the simplest form of cross-site abuse of this
  // endpoint; a missing Origin header (e.g. curl) is treated as untrusted.
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins(request).includes(origin)) {
    return json(403, { message: 'Forbidden.' });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return json(415, { message: 'Expected JSON.' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { message: 'Request too large.' });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { message: 'Malformed request.' });
  }

  // Honeypot: hidden in the form, so anything that fills it in is a bot.
  // Answer as if it succeeded rather than telling the bot it was caught.
  if (typeof payload?.company === 'string' && payload.company.trim() !== '') {
    return json(200, { message: 'Thanks! Check your inbox to confirm.' });
  }

  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return json(400, { message: 'That email address does not look right.' });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return json(429, { message: 'Too many attempts. Try again in a minute.' });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    // Misconfiguration, not the reader's problem — log it, stay vague publicly.
    console.error('BUTTONDOWN_API_KEY is not set; signup is disabled.');
    return json(503, { message: 'Signup is temporarily unavailable.' });
  }

  try {
    const upstream = await fetch(BUTTONDOWN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email_address: email, type: 'regular' }),
      signal: AbortSignal.timeout(8_000),
    });

    if (upstream.ok) {
      return json(200, { message: 'Thanks! Check your inbox to confirm.' });
    }

    // Already subscribed is a success from the reader's point of view.
    if (upstream.status === 409) {
      return json(200, { message: "You're already on the list." });
    }

    if (upstream.status === 400) {
      return json(400, { message: 'That email address was rejected.' });
    }

    // Never forward the upstream body: it can echo request details.
    console.error('Buttondown responded with', upstream.status);
    return json(502, { message: 'Signup is temporarily unavailable.' });
  } catch (error) {
    console.error('Newsletter signup failed:', error?.name ?? 'error');
    return json(502, { message: 'Signup is temporarily unavailable.' });
  }
}
