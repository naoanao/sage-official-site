/**
 * CF Pages Function: /api/chat
 * Sage AI chat — calls Groq API directly (no Flask / no PC required)
 *
 * POST /api/chat
 * Body: { message: string, email?: string }
 *
 * Rate limits (per day, resets at UTC midnight):
 *   Pro:        100 chat requests / day
 *   Enterprise: 500 chat requests / day
 *
 * Required CF Pages env vars:
 *   GROQ_API_KEY
 * Required CF Pages D1 binding:
 *   SUBSCRIBERS_DB → sage-subscribers
 */

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

// ── Plan limits ───────────────────────────────────────────────────────────────
const LIMITS = {
  pro:        { chat: 100 },
  enterprise: { chat: 500 },
};

// ── CORS headers ──────────────────────────────────────────────────────────────
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── System prompt builder ──────────────────────────────────────────────────────
function buildSystemPrompt(identity) {
  const base = `You are Sage AI — an autonomous AI assistant specialized in helping solopreneurs build income streams, automate their business, and grow on social media.

You are direct, practical, and results-focused. You give specific, actionable advice with real numbers and examples. You understand tools like Notion, Cloudflare Workers, Groq, Bluesky, Instagram, Stripe, Gumroad, and Make.com.

When the user asks about their current phase or topic, tailor your advice accordingly. Keep responses concise (under 300 words) unless a detailed breakdown is needed.`;

  if (!identity || (!identity.role && !identity.niche && !identity.tone)) {
    return base;
  }

  const personalLines = [];
  if (identity.role)         personalLines.push(`- The user's role / persona: ${identity.role}`);
  if (identity.niche)        personalLines.push(`- Their niche / topic: ${identity.niche}`);
  if (identity.tone)         personalLines.push(`- Preferred tone / voice: ${identity.tone}`);
  if (identity.visual_style) personalLines.push(`- Visual style: ${identity.visual_style}`);

  return `${base}

IMPORTANT — This user has a specific identity profile. Tailor ALL advice, examples, and content suggestions to fit their profile:
${personalLines.join('\n')}

Always frame examples, income ideas, content topics, and strategies around their niche. Do not use generic examples when their profile gives you specific context.`;
}

// ── Groq call with retry (handles 429 rate-limit + 5xx errors) ────────────────
async function callGroqWithRetry(apiKey, messages, maxTokens = 600, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      // Groq rate limit — respect retry-after header
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
        const wait = Math.min(retryAfter, 30) * 1000 * (attempt + 1);
        await new Promise(r => setTimeout(r, wait));
        lastError = new Error(`Groq rate limited (attempt ${attempt + 1})`);
        continue;
      }

      // Groq server error — retry with backoff
      if (res.status >= 500) {
        const wait = 1500 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, wait));
        lastError = new Error(`Groq server error ${res.status} (attempt ${attempt + 1})`);
        continue;
      }

      return res; // success
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Groq API unavailable after retries');
}

// ── Rate limit check + increment ──────────────────────────────────────────────
async function checkAndIncrementUsage(db, email, plan) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const limit = (LIMITS[plan] || LIMITS.pro).chat;

  // Upsert: insert or increment
  await db.prepare(`
    INSERT INTO usage_logs (email, date, chat_count)
    VALUES (?, ?, 0)
    ON CONFLICT (email, date) DO NOTHING
  `).bind(email, today).run();

  const row = await db.prepare(`
    SELECT chat_count FROM usage_logs WHERE email = ? AND date = ?
  `).bind(email, today).first();

  const current = row?.chat_count || 0;

  if (current >= limit) {
    return { allowed: false, used: current, limit, resetAt: today + 'T00:00:00Z (tomorrow UTC)' };
  }

  // Increment
  await db.prepare(`
    UPDATE usage_logs SET chat_count = chat_count + 1, updated_at = datetime('now')
    WHERE email = ? AND date = ?
  `).bind(email, today).run();

  return { allowed: true, used: current + 1, limit };
}

// ── Subscriber lookup ─────────────────────────────────────────────────────────
async function getSubscriber(db, email) {
  if (!db || !email) return null;
  try {
    return await db.prepare(`
      SELECT plan, status FROM subscribers WHERE LOWER(email) = ? LIMIT 1
    `).bind(email.toLowerCase()).first();
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const userMessage = (body.message || body.content || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const identity = body.identity || {};

    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'No message provided' }), {
        status: 400, headers: cors,
      });
    }

    const groqKey = env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(JSON.stringify({
        response: 'Sage AI is running in demo mode. GROQ_API_KEY not configured.',
      }), { headers: cors });
    }

    // ── Rate limiting (only when email + DB are available) ───────────────────
    const db = env.SUBSCRIBERS_DB;
    if (db && email) {
      const sub = await getSubscriber(db, email);
      const plan = sub?.plan || 'pro';

      // Only rate-limit active subscribers (not fallback / error states)
      if (sub?.status === 'active' || sub?.status === 'trialing') {
        const usage = await checkAndIncrementUsage(db, email, plan);

        if (!usage.allowed) {
          return new Response(JSON.stringify({
            error: 'daily_limit_reached',
            message: `You've used all ${usage.limit} chat messages for today. Resets at UTC midnight.`,
            used: usage.used,
            limit: usage.limit,
            upgrade_url: 'https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04',
          }), { status: 429, headers: cors });
        }

        // Attach usage info to response headers
        cors['X-RateLimit-Limit'] = String(usage.limit);
        cors['X-RateLimit-Remaining'] = String(usage.limit - usage.used);
      }
    }

    // ── Call Groq with retry ──────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(identity);
    const groqRes = await callGroqWithRetry(groqKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], 600);

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || 'Sage AI encountered an issue. Please try again.';

    return new Response(JSON.stringify({ response: reply }), { headers: cors });

  } catch (err) {
    console.error('[chat] error:', err.message);
    return new Response(JSON.stringify({
      error: 'Chat unavailable',
      detail: String(err),
    }), { status: 500, headers: cors });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
