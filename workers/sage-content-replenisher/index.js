/**
 * Sage Content Replenisher Worker
 * ──────────────────────────────────────────────────────────────────────────
 * Keeps the Notion content pool stocked so sage-sns-worker never runs dry.
 *
 * Schedule: Every Sunday 20:00 JST (11:00 UTC) → cron: "0 11 * * 0"
 *
 * Flow:
 *   1. Query Notion DB  → count items with Status = "予約済み"
 *   2. If count ≥ TARGET (14)  → already full, skip
 *   3. Else generate (TARGET - count) new topics via Groq
 *   4. Create each topic as a new Notion page with Status "予約済み"
 *   5. Telegram notify owner with summary
 *
 * Required env vars (CF Worker Secrets):
 *   NOTION_API_KEY, NOTION_CONTENT_POOL_DB_ID
 *   GROQ_API_KEY
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  (optional)
 */

const NOTION_API = 'https://api.notion.com/v1';
const GROQ_API   = 'https://api.groq.com/openai/v1/chat/completions';

// Target: always keep at least 14 items queued (two weeks of daily posts)
const TARGET_POOL_SIZE = 14;

// ── Notion: count 予約済み items ──────────────────────────────────────────
async function countPendingItems(env) {
  let total = 0;
  let cursor = undefined;

  do {
    const body = {
      filter: { property: 'Status', select: { equals: '予約済み' } },
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(
      `${NOTION_API}/databases/${env.NOTION_CONTENT_POOL_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    total += (data.results || []).length;
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return total;
}

// ── Groq: generate a batch of unique SNS topics ───────────────────────────
async function generateTopics(env, count) {
  const categories = [
    'AI Income & Monetization', 'Business Automation', 'Social Media Strategy', 'Notion Productivity',
    'ChatGPT & Prompting', 'Freelance & Remote Work', 'Digital Marketing',
    'AI Tools & Reviews', 'Content Creation', 'Blogging & SEO',
  ];

  const prompt = `You are an expert social media content strategist specializing in AI automation and solopreneur growth for an English-speaking global audience.

Generate exactly ${count} unique and specific English SNS post topics. Balance across the categories below.

Categories: ${categories.join(' / ')}

Requirements:
- Each topic is specific and actionable (e.g. "3 AI tools that replace a $2,000/month VA")
- Diverse categories — don't repeat the same type
- Target audience: solopreneurs, indie hackers, creators, freelancers wanting to earn with AI
- No duplicates
- Output a JSON array only. Each element: {"title": "...", "category": "..."}
- No explanation, just the JSON array

${count} topics:`;

  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.85,
    }),
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '[]';

  // Extract JSON array even if Groq wraps it in backticks
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return generateFallbackTopics(count);

  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_) { /* fall through */ }

  return generateFallbackTopics(count);
}

// Fallback topics if Groq fails
function generateFallbackTopics(count) {
  const pool = [
    { title: '3 steps to start earning with ChatGPT as a solopreneur', category: 'ChatGPT & Prompting' },
    { title: 'How to auto-track your side income with Notion AI', category: 'Notion Productivity' },
    { title: 'How I automated daily social media posting with AI', category: 'Business Automation' },
    { title: 'Why Groq API is the fastest free AI for content generation', category: 'AI Tools & Reviews' },
    { title: 'How to grow a Bluesky account from 0 to 1,000 followers with AI', category: 'Social Media Strategy' },
    { title: 'Build a $500/month passive income blog with AI in 30 days', category: 'Blogging & SEO' },
    { title: 'How freelancers cut 10 hours/week using AI workflows', category: 'Freelance & Remote Work' },
    { title: 'Automate Instagram posts for free using Cloudflare Workers', category: 'Social Media Strategy' },
    { title: 'Sell AI prompt packs on Gumroad — a beginner\'s guide', category: 'AI Income & Monetization' },
    { title: 'Run a 24/7 business on Cloudflare\'s free tier', category: 'Business Automation' },
    { title: 'Automate revenue notifications with Make.com + Stripe', category: 'Business Automation' },
    { title: 'Build your own AI tool with the ChatGPT API in a weekend', category: 'ChatGPT & Prompting' },
    { title: 'How to manage recurring subscriptions automatically with Stripe', category: 'AI Income & Monetization' },
    { title: 'Use AI to find the perfect hashtag strategy for your niche', category: 'Digital Marketing' },
  ];
  return pool.slice(0, count);
}

// ── Notion: create a single content page ─────────────────────────────────
async function createNotionPage(env, title, category) {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: env.NOTION_CONTENT_POOL_DB_ID },
      properties: {
        Name: {
          title: [{ text: { content: title } }],
        },
        Status: {
          select: { name: '予約済み' },
        },
        Category: {
          select: { name: category },
        },
      },
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Notion page create failed: ${JSON.stringify(data)}`);
  return data.id;
}

// ── Telegram helper ───────────────────────────────────────────────────────
async function notifyTelegram(env, message) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    }
  ).catch(() => {});
}

// ── Main replenishment cycle ──────────────────────────────────────────────
async function runReplenishCycle(env) {
  const now = new Date().toISOString();
  const log = [];

  try {
    // 1. Count current pending items
    log.push('📋 Counting 予約済み items in Notion...');
    const currentCount = await countPendingItems(env);
    log.push(`✅ Current pool: ${currentCount} items`);

    if (currentCount >= TARGET_POOL_SIZE) {
      const msg = `✅ Pool already full (${currentCount}/${TARGET_POOL_SIZE}). Nothing to do.`;
      log.push(msg);
      await notifyTelegram(
        env,
        `🤖 <b>Sage Content Replenisher</b>\n${msg}\n${now.slice(0, 16)} UTC`
      );
      return { status: 'skipped', reason: 'pool_full', currentCount, log };
    }

    const needed = TARGET_POOL_SIZE - currentCount;
    log.push(`📝 Need to generate ${needed} new topics...`);

    // 2. Generate topics via Groq
    const topics = await generateTopics(env, needed);
    log.push(`✅ Generated ${topics.length} topics`);

    // 3. Create Notion pages
    const created = [];
    const failed = [];

    for (const topic of topics) {
      try {
        const pageId = await createNotionPage(env, topic.title, topic.category);
        created.push(topic.title);
        log.push(`✅ Created: "${topic.title}" (${topic.category})`);
        // Small delay to avoid Notion rate limit
        await new Promise(r => setTimeout(r, 350));
      } catch (e) {
        failed.push(topic.title);
        log.push(`⚠️ Failed: "${topic.title}" — ${e.message}`);
      }
    }

    // 4. Telegram summary
    const summary = [
      `📚 <b>Sage Content Replenisher — 補充完了</b>`,
      `追加: ${created.length}件 / エラー: ${failed.length}件`,
      `プール残量: ${currentCount + created.length}件`,
      `次回投稿: 明日 09:00 JST`,
      `${now.slice(0, 16)} UTC`,
    ].join('\n');
    await notifyTelegram(env, summary);

    return {
      status: 'success',
      created: created.length,
      failed: failed.length,
      newTotal: currentCount + created.length,
      log,
    };

  } catch (err) {
    const msg = `❌ Replenisher error: ${err.message}`;
    log.push(msg);
    await notifyTelegram(env, `[Sage Replenisher]\n${msg}`);
    return { status: 'error', error: err.message, log };
  }
}

// ── Worker export ─────────────────────────────────────────────────────────
export default {
  // Cron trigger — every Sunday 20:00 JST (11:00 UTC)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReplenishCycle(env));
  },

  // HTTP handler — manual trigger
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/run') {
      const result = await runReplenishCycle(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/status') {
      const count = await countPendingItems(env).catch(e => ({ error: e.message }));
      return new Response(JSON.stringify({
        pending_items: count,
        target: TARGET_POOL_SIZE,
        needs_refill: typeof count === 'number' && count < TARGET_POOL_SIZE,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      name:    'Sage Content Replenisher',
      status:  'running',
      trigger: '/run  (GET — manual fire)',
      status_check: '/status  (GET — pool count)',
      cron:    '0 11 * * 0 (Sunday 20:00 JST)',
      target:  TARGET_POOL_SIZE,
    }), { headers: { 'Content-Type': 'application/json' } });
  },
};
