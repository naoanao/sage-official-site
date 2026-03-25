/**
 * CF Pages Function: Stripe Customer Portal Session
 * ──────────────────────────────────────────────────────────────────────────
 * GET /api/customer-portal?email=user@example.com
 *
 * Creates a Stripe Billing Portal session for the subscriber and redirects
 * them to manage / cancel their subscription — no Flask backend needed.
 *
 * Required CF Pages bindings:
 *   STRIPE_SECRET_KEY   — Stripe secret key (sk_live_...)
 *   SUBSCRIBERS_DB      — D1 database binding
 *
 * Flow:
 *   1. Look up stripe_customer_id from D1 by email
 *   2. POST /v1/billing_portal/sessions  → get URL
 *   3. Redirect 302 → portal URL
 *
 *   If email not found or D1 not bound → redirect to Stripe generic portal
 */

const STRIPE_API = 'https://api.stripe.com/v1';
const RETURN_URL = 'https://sage-official-site.pages.dev/thank-you';

async function stripePost(path, params, secret) {
  const body = new URLSearchParams(params);
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  return res.json();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url   = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  // If no STRIPE_SECRET_KEY bound, tell user to configure
  if (!env.STRIPE_SECRET_KEY) {
    return new Response('STRIPE_SECRET_KEY not configured in CF Pages settings', {
      status: 503,
      headers: corsHeaders,
    });
  }

  let customerId = null;

  // 1. Try to find Stripe customer ID in D1
  if (email && env.SUBSCRIBERS_DB) {
    try {
      const row = await env.SUBSCRIBERS_DB
        .prepare('SELECT stripe_customer_id FROM subscribers WHERE LOWER(email) = ? LIMIT 1')
        .bind(email)
        .first();
      if (row?.stripe_customer_id) {
        customerId = row.stripe_customer_id;
      }
    } catch (_) { /* continue without */ }
  }

  // 2. If still no customer, search Stripe directly by email
  if (!customerId && email) {
    try {
      const searchRes = await fetch(
        `${STRIPE_API}/customers/search?query=email:'${encodeURIComponent(email)}'&limit=1`,
        {
          headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
        }
      );
      const searchData = await searchRes.json();
      if (searchData.data?.[0]?.id) {
        customerId = searchData.data[0].id;
      }
    } catch (_) { /* continue */ }
  }

  // 3. If no customer found — redirect to dashboard's generic portal
  if (!customerId) {
    // Stripe supports email-based portal access at the customer portal URL
    // Users can enter their email at the portal to authenticate
    return Response.redirect(
      `https://billing.stripe.com/p/login/00g14n0Yl6cDgAg000${email ? `?prefilled_email=${encodeURIComponent(email)}` : ''}`,
      302
    );
  }

  // 4. Create portal session for this customer
  try {
    const session = await stripePost(
      '/billing_portal/sessions',
      { customer: customerId, return_url: RETURN_URL },
      env.STRIPE_SECRET_KEY
    );

    if (session.url) {
      return Response.redirect(session.url, 302);
    }

    // Fallback: session creation failed
    return Response.redirect(RETURN_URL, 302);

  } catch (err) {
    return new Response(`Portal session error: ${err.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
