/**
 * CF Pages Function: /api/generate
 * Cloud-native content generation — Groq API (no Flask / no PC required)
 *
 * POST /api/generate
 * Body: { topic: string, email?: string, market?: string, language?: string }
 *
 * Rate limits (per day, resets at UTC midnight):
 *   Pro:        20 generate requests / day
 *   Enterprise: 100 generate requests / day
 *
 * Required CF Pages env vars:
 *   GROQ_API_KEY
 * Required CF Pages D1 binding:
 *   SUBSCRIBERS_DB → sage-subscribers
 */

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

// ── Plan limits ───────────────────────────────────────────────────────────────
const LIMITS = {
  pro:        { generate: 20 },
  enterprise: { generate: 100 },
};

// ── CORS headers ──────────────────────────────────────────────────────────────
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── Groq call with retry (handles 429 + 5xx) ──────────────────────────────────
async function callGroqWithRetry(apiKey, systemPrompt, userPrompt, maxTokens = 2000, maxRetries = 3) {
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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.75,
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

      // Groq server error — retry with exponential backoff
      if (res.status >= 500) {
        const wait = 1500 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, wait));
        lastError = new Error(`Groq server error ${res.status} (attempt ${attempt + 1})`);
        continue;
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';

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
  const limit = (LIMITS[plan] || LIMITS.pro).generate;

  await db.prepare(`
    INSERT INTO usage_logs (email, date, generate_count)
    VALUES (?, ?, 0)
    ON CONFLICT (email, date) DO NOTHING
  `).bind(email, today).run();

  const row = await db.prepare(`
    SELECT generate_count FROM usage_logs WHERE email = ? AND date = ?
  `).bind(email, today).first();

  const current = row?.generate_count || 0;

  if (current >= limit) {
    return { allowed: false, used: current, limit };
  }

  await db.prepare(`
    UPDATE usage_logs SET generate_count = generate_count + 1, updated_at = datetime('now')
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
    const topic    = body.topic  || 'AI automation for solopreneurs';
    const email    = (body.email || '').trim().toLowerCase();
    const identity = body.identity || {};

    // Build personalized market description from identity, falling back to body.market
    const identityMarket = identity.niche
      ? `${identity.niche}${identity.role ? ` (${identity.role})` : ''} audience`
      : (body.market || 'English-speaking solopreneurs');
    const market = identityMarket;

    // Build identity context string for prompts
    const identityContext = (identity.role || identity.niche || identity.tone)
      ? [
          identity.role         ? `Creator persona: ${identity.role}` : '',
          identity.niche        ? `Niche / topic: ${identity.niche}` : '',
          identity.tone         ? `Tone & voice: ${identity.tone}` : '',
          identity.visual_style ? `Visual style: ${identity.visual_style}` : '',
        ].filter(Boolean).join('\n')
      : '';

    const groqKey = env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(JSON.stringify({
        error: 'GROQ_API_KEY not set', qa_status: 'FAIL',
      }), { status: 503, headers: cors });
    }

    // ── Rate limiting ────────────────────────────────────────────────────────
    const db = env.SUBSCRIBERS_DB;
    if (db && email) {
      const sub = await getSubscriber(db, email);
      const plan = sub?.plan || 'pro';

      if (sub?.status === 'active' || sub?.status === 'trialing') {
        const usage = await checkAndIncrementUsage(db, email, plan);

        if (!usage.allowed) {
          return new Response(JSON.stringify({
            error: 'daily_limit_reached',
            message: `You've used all ${usage.limit} content generations for today. Resets at UTC midnight.`,
            used: usage.used,
            limit: usage.limit,
            upgrade_url: 'https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04',
            qa_status: 'RATE_LIMITED',
          }), { status: 429, headers: cors });
        }

        cors['X-RateLimit-Limit']     = String(usage.limit);
        cors['X-RateLimit-Remaining'] = String(usage.limit - usage.used);
      }
    }

    // ── Generate blog sections + SNS captions in parallel ────────────────────
    const identityBlock = identityContext
      ? `\n\nCREATOR PROFILE — tailor all content to fit this person:\n${identityContext}`
      : '';

    const [sectionsRaw, captionsRaw] = await Promise.all([
      callGroqWithRetry(
        groqKey,
        `You are an expert content writer. Write clear, practical, well-structured blog content in English.${identityBlock}`,
        `Write a 3-section blog post about: "${topic}"
Target audience: ${market}
${identityContext ? `\nWrite as if published by someone with this profile:\n${identityContext}\n` : ''}
Format as JSON array:
[
  {"title": "...", "content": "... (200-300 words, practical, specific numbers)"},
  {"title": "...", "content": "..."},
  {"title": "...", "content": "..."}
]

Output JSON only, no explanation.`,
        2000
      ),
      callGroqWithRetry(
        groqKey,
        `You are an expert social media writer.${identityBlock}`,
        `Write 3 social media captions about: "${topic}"
${identityContext ? `Written from the perspective of:\n${identityContext}\n` : ''}Each caption: 200-280 chars, start with emoji, end with 3 hashtags, practical and engaging.

Format as JSON array of strings.
Output JSON only.`,
        600
      ),
    ]);

    // ── Parse sections ────────────────────────────────────────────────────────
    let sections = [];
    try {
      const match = sectionsRaw.match(/\[[\s\S]*\]/);
      if (match) sections = JSON.parse(match[0]);
    } catch (_) {
      sections = [{ title: topic, content: sectionsRaw }];
    }

    // ── Parse captions ────────────────────────────────────────────────────────
    let captions = [];
    try {
      const match = captionsRaw.match(/\[[\s\S]*\]/);
      if (match) captions = JSON.parse(match[0]);
    } catch (_) {
      captions = [captionsRaw];
    }

    // ── Image URLs via Pollinations (free, no API key) ────────────────────────
    const images = {};
    sections.forEach((s, i) => {
      const seed = 100 + i * 101;
      const prompt = encodeURIComponent(`${s.title}, professional digital art, solopreneur AI automation, dark futuristic`);
      images[s.title] = {
        type: 'generated',
        url: `https://image.pollinations.ai/prompt/${prompt}?seed=${seed}&width=400&height=225&nologo=true`,
      };
    });

    return new Response(JSON.stringify({
      qa_status: 'PASS',
      research_source: 'groq_cloud',
      topic,
      sections,
      captions,
      images,
      sales_page: `# ${topic}\n\n${sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')}\n\n---\n*Generated by Sage AI*`,
    }), { headers: cors });

  } catch (err) {
    console.error('[generate] error:', err.message);
    return new Response(JSON.stringify({
      error: 'Generation failed', detail: String(err), qa_status: 'FAIL',
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
