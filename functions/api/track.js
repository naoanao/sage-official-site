/**
 * CF Pages Function: /api/track
 * Lightweight funnel event receiver — fire & forget from frontend
 *
 * POST /api/track
 * Body: { event, email?, session_id?, metadata? }
 *
 * Events:
 *   modal_view      — upgrade modal shown (pre-auth)
 *   payment_click   — Stripe payment link clicked
 *   dashboard_visit — subscriber opened dashboard
 *   generate_done   — content generation completed
 *   publish_done    — post published to Bluesky/Instagram
 *
 * Returns 200 immediately (client doesn't wait for DB write result)
 */

const ALLOWED_EVENTS = new Set([
  'modal_view',
  'payment_click',
  'dashboard_visit',
  'generate_done',
  'publish_done',
]);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  // Always return 200 immediately — tracking must never block UX
  const respond = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    const body = await request.json().catch(() => ({}));
    const event = (body.event || '').trim();

    if (!ALLOWED_EVENTS.has(event)) return respond();

    const email      = (body.email      || '').trim().toLowerCase() || null;
    const session_id = (body.session_id || '').trim()               || null;
    const metadata   = body.metadata ? JSON.stringify(body.metadata) : null;

    // Write to D1 — intentionally not awaited on error (fire & forget)
    if (env.DB) {
      await env.DB.prepare(
        `INSERT INTO funnel_events (event, email, session_id, metadata)
         VALUES (?, ?, ?, ?)`
      ).bind(event, email, session_id, metadata).run().catch(() => {});
    }
  } catch (_) {
    // Silently ignore — tracking must never break the app
  }

  return respond();
}
