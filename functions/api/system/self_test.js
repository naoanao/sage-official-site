/**
 * CF Pages Function: Cloud Self-Test
 * GET /api/system/self_test?tier=all|1|2
 *
 * Returns a report in the same shape the SageOS frontend expects:
 *   { report: { tier1: { tests, summary, overall_status, ran_at }, tier2: {...} } }
 *
 * Tier 1 — CF Edge health (D1, env vars)
 * Tier 2 — External API reachability (Stripe, Groq, Notion)
 */

const now = () => new Date().toISOString();

function makeResult(name, status, message = '') {
  return { name, status, message };
}

function summarize(tests) {
  const pass = tests.filter(t => t.status === 'PASS').length;
  const fail = tests.filter(t => t.status === 'FAIL').length;
  const skip = tests.filter(t => t.status === 'SKIP').length;
  return {
    pass, fail, skip,
    overall_status: fail > 0 ? 'FAIL' : skip > 0 ? 'DEGRADE' : 'PASS',
  };
}

async function runTier1(env) {
  const tests = [];

  // D1 binding
  if (env.SUBSCRIBERS_DB) {
    try {
      await env.SUBSCRIBERS_DB.prepare('SELECT 1').first();
      tests.push(makeResult('D1 Database', 'PASS', 'sage-subscribers reachable'));
    } catch (e) {
      tests.push(makeResult('D1 Database', 'FAIL', e.message));
    }
  } else {
    tests.push(makeResult('D1 Database', 'FAIL', 'SUBSCRIBERS_DB binding not configured'));
  }

  // Required secrets
  const secrets = [
    ['STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY],
    ['STRIPE_WEBHOOK_SECRET', env.STRIPE_WEBHOOK_SECRET],
    ['GROQ_API_KEY', env.GROQ_API_KEY],
  ];
  for (const [name, val] of secrets) {
    tests.push(makeResult(
      `Env: ${name}`,
      val ? 'PASS' : 'FAIL',
      val ? 'configured' : 'missing'
    ));
  }

  const summary = summarize(tests);
  return { tests, summary, overall_status: summary.overall_status, ran_at: now() };
}

async function runTier2(env) {
  const tests = [];

  // Stripe reachability
  if (env.STRIPE_SECRET_KEY) {
    try {
      const r = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      tests.push(makeResult('Stripe API', r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}`));
    } catch (e) {
      tests.push(makeResult('Stripe API', 'FAIL', e.message));
    }
  } else {
    tests.push(makeResult('Stripe API', 'SKIP', 'STRIPE_SECRET_KEY not set'));
  }

  // Groq reachability
  if (env.GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      });
      tests.push(makeResult('Groq API', r.ok ? 'PASS' : 'FAIL', `HTTP ${r.status}`));
    } catch (e) {
      tests.push(makeResult('Groq API', 'FAIL', e.message));
    }
  } else {
    tests.push(makeResult('Groq API', 'SKIP', 'GROQ_API_KEY not set'));
  }

  // Make.com webhook
  if (env.MAKE_WEBHOOK_URL) {
    tests.push(makeResult('Make.com Webhook', 'PASS', 'URL configured'));
  } else {
    tests.push(makeResult('Make.com Webhook', 'SKIP', 'MAKE_WEBHOOK_URL not set'));
  }

  const summary = summarize(tests);
  return { tests, summary, overall_status: summary.overall_status, ran_at: now() };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const tier = new URL(request.url).searchParams.get('tier') || 'all';

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  try {
    const report = {};
    if (tier === 'all' || tier === '1') report.tier1 = await runTier1(env);
    if (tier === 'all' || tier === '2') report.tier2 = await runTier2(env);

    return new Response(JSON.stringify({ ok: true, report }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: cors });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}
