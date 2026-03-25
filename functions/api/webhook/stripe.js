/**
 * CF Pages Function: Stripe Webhook Handler (Edge-native)
 * ────────────────────────────────────────────────────────
 * Runs at Cloudflare edge — zero dependency on Flask/ngrok/PC.
 * Handles POST /api/webhook/stripe directly.
 *
 * Required CF Pages bindings (set in Dashboard → Settings → Functions):
 *   D1 binding:  SUBSCRIBERS_DB  → sage-subscribers database
 *   Env var:     STRIPE_WEBHOOK_SECRET
 *   Env var:     MAKE_WEBHOOK_URL
 *   Env var:     TELEGRAM_BOT_TOKEN  (optional)
 *   Env var:     TELEGRAM_CHAT_ID    (optional)
 */

// ── Stripe signature verification (Web Crypto API — no npm needed) ─────────
async function verifyStripeSignature(rawBody, sigHeader, secret) {
  try {
    const parts = sigHeader.split(',');
    const tsPart = parts.find(p => p.startsWith('t='));
    if (!tsPart) return false;
    const timestamp = tsPart.split('=')[1];
    const signatures = parts
      .filter(p => p.startsWith('v1='))
      .map(p => p.slice(3)); // strip "v1="

    const payload = `${timestamp}.${rawBody}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const computed = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time compare
    return signatures.some(s => s.length === computed.length && s === computed);
  } catch {
    return false;
  }
}

// ── Telegram helper ────────────────────────────────────────────────────────
async function notifyTelegram(token, chatId, text) {
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch { /* best-effort */ }
}

// ── Make.com forward ───────────────────────────────────────────────────────
async function forwardToMake(makeUrl, eventType, sessionObj) {
  if (!makeUrl) return;
  try {
    await fetch(makeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: eventType, ...sessionObj }),
    });
  } catch { /* best-effort */ }
}

// ── D1 helpers ─────────────────────────────────────────────────────────────
async function d1Upsert(db, customerId, subscriptionId, email, plan, status, amount, nowIso) {
  if (!db) return;
  await db.prepare(`
    INSERT INTO subscribers
      (stripe_customer_id, stripe_subscription_id, email, plan, status, amount_usd, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stripe_customer_id) DO UPDATE SET
      stripe_subscription_id = excluded.stripe_subscription_id,
      plan                   = excluded.plan,
      status                 = excluded.status,
      amount_usd             = excluded.amount_usd,
      updated_at             = excluded.updated_at
  `).bind(customerId, subscriptionId, email, plan, status, amount, nowIso, nowIso).run();
}

async function d1Cancel(db, customerId, nowIso) {
  if (!db) return;
  await db.prepare(
    `UPDATE subscribers SET status='cancelled', updated_at=? WHERE stripe_customer_id=?`
  ).bind(nowIso, customerId).run();
}

// ── Main handler ───────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  const rawBody   = await request.text();
  const sigHeader = request.headers.get('stripe-signature') || '';
  const secret    = env.STRIPE_WEBHOOK_SECRET || '';
  const nowIso    = new Date().toISOString();

  // Verify signature
  if (secret) {
    const valid = await verifyStripeSignature(rawBody, sigHeader, secret);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const eventType = event.type || '';
  const dataObj   = event?.data?.object || {};

  // ── Route events ─────────────────────────────────────────────────────────
  if (eventType === 'checkout.session.completed') {
    const email          = dataObj?.customer_details?.email || 'unknown';
    const customerId     = dataObj?.customer             || '';
    const subscriptionId = dataObj?.subscription         || '';
    const amount         = Math.floor((dataObj?.amount_total || 0) / 100); // cents → dollars
    const plan           = amount <= 25 ? 'pro' : 'enterprise';

    // 1. Write to D1
    await d1Upsert(
      env.SUBSCRIBERS_DB, customerId, subscriptionId, email, plan, 'active', amount, nowIso
    );

    // 2. Forward to Make.com → welcome email
    await forwardToMake(env.MAKE_WEBHOOK_URL, eventType, dataObj);

    // 3. Telegram notify
    await notifyTelegram(
      env.TELEGRAM_BOT_TOKEN,
      env.TELEGRAM_CHAT_ID,
      `💰 <b>新規サブスク購入！</b>\nプラン: ${plan.toUpperCase()} ($${amount}/月)\nメール: ${email}\n時刻: ${nowIso.slice(0, 16)} UTC`
    );

  } else if (eventType === 'customer.subscription.deleted') {
    const customerId = dataObj?.customer || '';
    await d1Cancel(env.SUBSCRIBERS_DB, customerId, nowIso);
    await notifyTelegram(
      env.TELEGRAM_BOT_TOKEN,
      env.TELEGRAM_CHAT_ID,
      `⚠️ <b>サブスク解約</b>\ncustomer=${customerId}\n${nowIso.slice(0, 16)} UTC`
    );

  } else if (eventType === 'customer.subscription.created') {
    const customerId     = dataObj?.customer    || '';
    const subscriptionId = dataObj?.id          || '';
    const statusVal      = dataObj?.status      || 'active';
    const amount         = Math.floor(((dataObj?.plan?.amount) || 0) / 100);
    const plan           = amount <= 25 ? 'pro' : 'enterprise';
    await d1Upsert(env.SUBSCRIBERS_DB, customerId, subscriptionId, '', plan, statusVal, amount, nowIso);

  } else if (eventType === 'invoice.payment_failed') {
    const email      = dataObj?.customer_email || 'unknown';
    const customerId = dataObj?.customer       || '';
    const amount     = Math.floor((dataObj?.amount_due || 0) / 100);
    await notifyTelegram(
      env.TELEGRAM_BOT_TOKEN,
      env.TELEGRAM_CHAT_ID,
      `❌ <b>支払い失敗</b>\nEmail: ${email} / $${amount}\ncustomer=${customerId}`
    );
  }

  return new Response(JSON.stringify({ received: true, event: eventType }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Only POST is accepted — other methods get 405
export async function onRequest(context) {
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  return new Response('Method Not Allowed', { status: 405 });
}
