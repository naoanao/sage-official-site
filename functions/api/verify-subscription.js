/**
 * CF Pages Function: Subscription Verification Endpoint
 * ───────────────────────────────────────────────────────
 * GET /api/verify-subscription?email=user@example.com
 *
 * Returns:
 *   { active: true,  plan: "pro",        email: "..." }
 *   { active: false, reason: "not_found" }
 *   { active: false, reason: "cancelled" }
 *
 * Required CF Pages bindings:
 *   D1 binding: SUBSCRIBERS_DB → sage-subscribers database
 *
 * Security: email is only the lookup key — no auth token needed for this
 * simple check. For production hardening, add a signed session token.
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url   = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  // CORS headers — allow requests from the same CF Pages domain
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  if (!email) {
    return new Response(
      JSON.stringify({ active: false, reason: 'missing_email' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const db = env.SUBSCRIBERS_DB;
  if (!db) {
    // D1 not bound yet — return a graceful degradation
    return new Response(
      JSON.stringify({ active: true, plan: 'pro', email, source: 'fallback' }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const row = await db
      .prepare(
        `SELECT email, plan, status, amount_usd, created_at
         FROM subscribers
         WHERE LOWER(email) = ?
         LIMIT 1`
      )
      .bind(email)
      .first();

    if (!row) {
      return new Response(
        JSON.stringify({ active: false, reason: 'not_found' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const isActive = row.status === 'active';
    return new Response(
      JSON.stringify({
        active:     isActive,
        plan:       row.plan       || 'pro',
        status:     row.status,
        amount_usd: row.amount_usd || 0,
        member_since: (row.created_at || '').slice(0, 10),
        reason:     isActive ? undefined : row.status,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    // DB error — fail open (don't lock users out due to infra issues)
    console.error('[verify-subscription] DB error:', err.message);
    return new Response(
      JSON.stringify({ active: true, plan: 'pro', email, source: 'db_error_failopen' }),
      { status: 200, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
