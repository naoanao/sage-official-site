/**
 * Sage SNS Automation Worker
 * ──────────────────────────────────────────────────────────────────────────
 * Runs 24/7 on Cloudflare infrastructure. No PC required.
 *
 * Schedule: Daily at 09:00 JST (00:00 UTC)  →  cron: "0 0 * * *"
 *
 * Flow:
 *   1. Notion query → get next "予約済み" content item
 *   2. Groq API    → generate optimized Japanese SNS post
 *   3. Bluesky     → create post (with image URL)
 *   4. Instagram   → publish to feed (via Graph API)
 *   5. Notion      → mark item as "完了"
 *   6. Telegram    → notify owner
 *
 * Required env vars (set in CF Dashboard → Workers → sage-sns-worker → Settings):
 *   NOTION_API_KEY, NOTION_CONTENT_POOL_DB_ID
 *   GROQ_API_KEY
 *   BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
 *   INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  (optional)
 */

// ── Constants ────────────────────────────────────────────────────────────────
const NOTION_API = 'https://api.notion.com/v1';
const GROQ_API   = 'https://api.groq.com/openai/v1/chat/completions';
const BSKY_API   = 'https://bsky.social/xrpc';
const IG_API     = 'https://graph.facebook.com/v21.0';

// ── Notion helpers ────────────────────────────────────────────────────────────
async function notionQuery(env) {
  const res = await fetch(`${NOTION_API}/databases/${env.NOTION_CONTENT_POOL_DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      filter: { property: 'Status', select: { equals: env.NOTION_STATUS_PENDING || 'Scheduled' } },
      page_size: 1,
    }),
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

function extractPageTitle(page) {
  const titleProp = page.properties?.Name?.title || page.properties?.title?.title || [];
  return titleProp.map(t => t.plain_text).join('') || 'AI automation tips for solopreneurs';
}

function extractPageCategory(page) {
  return page.properties?.Category?.select?.name || 'AI';
}

async function notionMarkDone(env, pageId) {
  await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      properties: { Status: { select: { name: env.NOTION_STATUS_DONE || 'Done' } } },
    }),
  });
}

// ── Groq content generation ───────────────────────────────────────────────────
async function generateSNSContent(env, topic, category) {
  const prompt = `You are an expert social media content writer specializing in AI automation and solopreneur growth.

Write ONE engaging English social media post about the following topic.

Topic: ${topic}
Category: ${category}

Requirements:
- 200–280 characters of English text
- Start with a relevant emoji (🤖, 💡, 🚀, ⚡, etc.)
- Include a specific number, stat, or concrete fact
- Speak directly to solopreneurs, creators, and indie hackers
- End with 3–5 relevant hashtags (e.g. #AIAutomation #Solopreneur #PassiveIncome)
- Tone: confident, practical, inspiring — not salesy
- Works great on both Bluesky and Instagram

Output the post text only (no explanation):`;


  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || `🤖 ${topic}\n\nAI automation is changing how solopreneurs work. Are you keeping up?\n\n#AIAutomation #Solopreneur #PassiveIncome`;
}

// ── Image generation with stable URL ─────────────────────────────────────────
// Priority: Pollinations → imgbb upload (stable) → LoremFlickr (always works)
function _pollinationsUrl(topic) {
  const encoded = encodeURIComponent(
    `${topic}, futuristic AI technology, vibrant colors, professional social media, 1080x1080`
  );
  const seed = Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encoded}?seed=${seed}&width=1080&height=1080&nologo=true`;
}

function _loremFlickrUrl(topic) {
  // Extract up to 2 ASCII keywords from topic for LoremFlickr
  const words = topic.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 4 && /^[a-z]+$/.test(w))
    .slice(0, 2);
  const kw = words.length > 0 ? words.join(',') : 'technology';
  const seed = Math.floor(Math.random() * 9999);
  return `https://loremflickr.com/1080/1080/${kw}?lock=${seed}`;
}

async function getStableImageUrl(env, topic) {
  const pollinationsUrl = _pollinationsUrl(topic);

  // If IMGBB_API_KEY is set in CF Worker secrets, download Pollinations → upload → stable URL
  if (env.IMGBB_API_KEY) {
    try {
      const imgRes = await fetch(pollinationsUrl, { cf: { cacheEverything: false } });
      if (imgRes.ok && imgRes.headers.get('content-type')?.startsWith('image')) {
        const imgBytes = await imgRes.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(imgBytes)));
        const form = new FormData();
        form.append('key', env.IMGBB_API_KEY);
        form.append('image', b64);
        const uploadRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          return { url: uploadData.data.url, source: 'pollinations→imgbb' };
        }
      }
    } catch (_) { /* fall through */ }
  }

  // LoremFlickr — always returns a real image, no API key needed
  return { url: _loremFlickrUrl(topic), source: 'loremflickr' };
}

// ── Bluesky auth (shared) ─────────────────────────────────────────────────────
async function blueskyAuth(env) {
  const authRes = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: env.BLUESKY_HANDLE,
      password:   env.BLUESKY_APP_PASSWORD,
    }),
  });
  const auth = await authRes.json();
  if (!auth.accessJwt) throw new Error(`Bluesky auth failed: ${JSON.stringify(auth)}`);
  return auth;
}

// ── Bluesky posting ───────────────────────────────────────────────────────────
async function postToBluesky(env, text) {
  // 1. Auth
  const auth = await blueskyAuth(env);

  // 2. Post (text only — Bluesky image upload requires blob upload, skip for now)
  const postRes = await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo:       auth.did,
      collection: 'app.bsky.feed.post',
      record: {
        '$type':   'app.bsky.feed.post',
        text:       text.slice(0, 300), // Bluesky 300 char limit
        createdAt:  new Date().toISOString(),
      },
    }),
  });
  const post = await postRes.json();
  if (!post.uri) throw new Error(`Bluesky post failed: ${JSON.stringify(post)}`);
  return post.uri;
}

// ── Instagram posting ─────────────────────────────────────────────────────────
async function postToInstagram(env, text, imageUrl) {
  const accountId = env.INSTAGRAM_ACCOUNT_ID;
  const token     = env.INSTAGRAM_ACCESS_TOKEN;

  // 1. Create media container
  const createRes = await fetch(
    `${IG_API}/${accountId}/media?` +
    `image_url=${encodeURIComponent(imageUrl)}&` +
    `caption=${encodeURIComponent(text)}&` +
    `access_token=${token}`,
    { method: 'POST' }
  );
  const container = await createRes.json();
  if (!container.id) throw new Error(`IG container failed: ${JSON.stringify(container)}`);

  // 2. Wait for container to be ready
  await new Promise(r => setTimeout(r, 4000));

  // 3. Publish
  const publishRes = await fetch(
    `${IG_API}/${accountId}/media_publish?` +
    `creation_id=${container.id}&` +
    `access_token=${token}`,
    { method: 'POST' }
  );
  const published = await publishRes.json();
  if (!published.id) throw new Error(`IG publish failed: ${JSON.stringify(published)}`);
  return published.id;
}

// ── Telegram notification ─────────────────────────────────────────────────────
async function notifyTelegram(env, message) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    env.TELEGRAM_CHAT_ID,
      text:       message,
      parse_mode: 'HTML',
    }),
  }).catch(() => {});
}

// ── Bluesky engagement (reply to mentions/replies) ────────────────────────────
function detectLang(text) {
  return /[\u3000-\u9fff\uff00-\uffef]/.test(text) ? 'ja' : 'en';
}

async function generateReply(env, commentText, authorHandle) {
  const lang = detectLang(commentText);
  const systemMsg = lang === 'ja'
    ? 'あなたはSage AIの公式アカウントです。ユーザーのコメントに2〜3文で温かく共感して返信してください。絵文字1〜2個OK。宣伝は不要。'
    : 'You are the official Sage AI account. Reply with genuine warmth and empathy in 2-3 sentences. 1-2 emojis OK. No sales pitch.';

  try {
    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: `@${authorHandle} said: "${commentText}"\n\nReply:` },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (reply) return reply;
  } catch (_) { /* fall through to fallback */ }

  return lang === 'ja'
    ? `@${authorHandle} ありがとうございます！とても嬉しいです 🙌`
    : `@${authorHandle} Thank you so much! Really appreciate it 🙌`;
}

async function runEngagementCycle(env) {
  const log = [];
  let repliedCount = 0;

  try {
    const auth = await blueskyAuth(env);
    log.push('✅ Bluesky auth OK');

    // 未読通知を取得（最大30件）
    const notifRes = await fetch(`${BSKY_API}/app.bsky.notification.listNotifications?limit=30`, {
      headers: { 'Authorization': `Bearer ${auth.accessJwt}` },
    });
    const notifData = await notifRes.json();
    const notifications = notifData.notifications || [];

    // 未読のreply/mentionのみ対象
    const targets = notifications.filter(n =>
      !n.isRead && (n.reason === 'reply' || n.reason === 'mention')
    );
    log.push(`📬 未読 reply/mention: ${targets.length}件`);

    // 1日最大10件まで返信
    for (const notif of targets.slice(0, 10)) {
      const commentText  = notif.record?.text || '';
      const authorHandle = notif.author?.handle || 'user';
      if (!commentText) continue;

      try {
        const replyText = await generateReply(env, commentText, authorHandle);

        // リプライ参照を構築
        const root   = notif.record?.reply?.root || { uri: notif.uri, cid: notif.cid };
        const parent = { uri: notif.uri, cid: notif.cid };

        const postRes = await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${auth.accessJwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo:       auth.did,
            collection: 'app.bsky.feed.post',
            record: {
              '$type':   'app.bsky.feed.post',
              text:       replyText.slice(0, 300),
              reply:      { root, parent },
              createdAt:  new Date().toISOString(),
            },
          }),
        });
        const postData = await postRes.json();
        if (postData.uri) {
          log.push(`💬 @${authorHandle} に返信: ${replyText.slice(0, 50)}...`);
          repliedCount++;
        } else {
          log.push(`⚠️ @${authorHandle} 返信失敗: ${JSON.stringify(postData)}`);
        }

        // 1.5秒待機（レート制限対策）
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        log.push(`⚠️ @${authorHandle} 返信エラー: ${e.message}`);
      }
    }

    // 全通知を既読にする
    if (notifications.length > 0) {
      await fetch(`${BSKY_API}/app.bsky.notification.updateSeen`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.accessJwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ seenAt: new Date().toISOString() }),
      });
      log.push('✅ 通知を既読にしました');
    }

    return { status: 'success', replied: repliedCount, log };
  } catch (err) {
    log.push(`❌ Engagement error: ${err.message}`);
    return { status: 'error', error: err.message, log };
  }
}

// ── Main SNS cycle ────────────────────────────────────────────────────────────
async function runSNSCycle(env) {
  const now = new Date().toISOString();
  const log = [];

  try {
    // 1. Fetch content from Notion
    log.push('📋 Fetching Notion content...');
    const page = await notionQuery(env);
    if (!page) {
      const msg = '⚠️ No 予約済み content found in Notion. Skipping today.';
      log.push(msg);
      await notifyTelegram(env, `[Sage SNS Worker]\n${msg}\n${now.slice(0,16)} UTC`);
      return { status: 'skipped', reason: 'no_content', log };
    }

    const topic    = extractPageTitle(page);
    const category = extractPageCategory(page);
    const pageId   = page.id;
    log.push(`✅ Got topic: "${topic}" (${category})`);

    // 2. Generate content via Groq
    log.push('🤖 Generating SNS content with Groq...');
    const snsText = await generateSNSContent(env, topic, category);
    log.push(`✅ Content: ${snsText.slice(0, 80)}...`);

    // 3. Image URL — Pollinations→imgbb (stable) or LoremFlickr fallback
    const { url: imageUrl, source: imageSource } = await getStableImageUrl(env, topic);
    log.push(`🎨 Image (${imageSource}): ${imageUrl.slice(0, 80)}...`);

    // 4. Post to Bluesky
    log.push('🦋 Posting to Bluesky...');
    let bskyUri = null;
    try {
      bskyUri = await postToBluesky(env, snsText);
      log.push(`✅ Bluesky: ${bskyUri}`);
    } catch (e) {
      log.push(`⚠️ Bluesky failed: ${e.message}`);
    }

    // 5. Post to Instagram
    log.push('📸 Posting to Instagram...');
    let igId = null;
    try {
      igId = await postToInstagram(env, snsText, imageUrl);
      log.push(`✅ Instagram: ${igId}`);
    } catch (e) {
      log.push(`⚠️ Instagram failed: ${e.message}`);
    }

    // 6. Mark as done in Notion (only if at least one platform succeeded)
    if (bskyUri || igId) {
      await notionMarkDone(env, pageId);
      log.push(`✅ Notion marked as 完了`);
    }

    // 7. Telegram summary
    const platforms = [bskyUri && '🦋 Bluesky', igId && '📸 Instagram'].filter(Boolean).join(' + ');
    await notifyTelegram(env, [
      `🤖 <b>Sage SNS Worker — 投稿完了</b>`,
      `トピック: ${topic}`,
      `プラットフォーム: ${platforms || 'なし（エラー）'}`,
      `画像: ${imageSource}`,
      `時刻: ${now.slice(0, 16)} UTC`,
    ].join('\n'));

    return { status: 'success', topic, bluesky: bskyUri, instagram: igId, log };

  } catch (err) {
    const msg = `❌ SNS Worker error: ${err.message}`;
    log.push(msg);
    await notifyTelegram(env, `[Sage SNS Worker]\n${msg}`);
    return { status: 'error', error: err.message, log };
  }
}

// ── Worker export ─────────────────────────────────────────────────────────────
export default {
  // Cron trigger (scheduled) — 毎日09:00 JST
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      // 1. SNS投稿
      const snsResult = await runSNSCycle(env);
      // 2. Bluesky返信（SNS投稿後に実行）
      const engResult = await runEngagementCycle(env);
      // 3. Telegramでengagementサマリー通知
      if (engResult.replied > 0) {
        await notifyTelegram(env,
          `🦋 <b>Bluesky Engagement</b>\n${engResult.replied}件のコメントに返信しました\n${new Date().toISOString().slice(0,16)} UTC`
        );
      }
    })());
  },

  // HTTP handler — 手動テスト用
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/run') {
      const result = await runSNSCycle(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Bluesky返信のみ手動テスト
    if (url.pathname === '/engage') {
      const result = await runEngagementCycle(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      name:     'Sage SNS Automation Worker',
      status:   'running',
      triggers: {
        '/run':    'SNS投稿 手動実行',
        '/engage': 'Bluesky返信 手動実行',
      },
      cron: '0 0 * * * (毎日09:00 JST — SNS投稿 + Bluesky返信)',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
