/**
 * sage-sns-worker — Bluesky 自動投稿 & エンゲージメント Worker
 *
 * 機能:
 *  - Notion からトピックを取得して Groq で SNS コンテンツ生成 → Bluesky に投稿
 *  - いいねされた相手の最新投稿にいいね返し（最大 15 件/回）
 *  - メンション・リプライに Groq で AI 返答（最大 10 件/回）
 *  - Telegram 通知
 *
 * 規制対策:
 *  - アクション間に 800ms 以上の待機
 *  - フォローバックは実施しない
 *  - 返答はメンション/リプライのみ（オプトイン）
 *  - Automation ラベル設定済み
 */

const BSKY_API   = 'https://bsky.social/xrpc';
const GROQ_API   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─── 安全設定 ────────────────────────────────────────────────────
const MAX_LIKES_PER_RUN   = 15;
const MAX_REPLIES_PER_RUN = 10;
const ACTION_DELAY_MS     = 1000; // 1秒待機（規制回避）

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════════
//  Bluesky ヘルパー
// ════════════════════════════════════════════════════════════════

async function blueskyAuth(env) {
  const res = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      identifier: env.BLUESKY_HANDLE,
      password:   env.BLUESKY_APP_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!data.accessJwt) throw new Error(`Bluesky auth failed: ${JSON.stringify(data)}`);
  return data; // { accessJwt, did, handle, ... }
}

async function createPost(auth, text, replyTo = null) {
  const record = {
    '$type':   'app.bsky.feed.post',
    text:       text.slice(0, 300),
    createdAt:  new Date().toISOString(),
    langs:     ['en', 'ja'],
  };
  if (replyTo) {
    record.reply = {
      root:   replyTo.root || { uri: replyTo.uri, cid: replyTo.cid },
      parent: { uri: replyTo.uri, cid: replyTo.cid },
    };
  }
  const res = await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessJwt}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ repo: auth.did, collection: 'app.bsky.feed.post', record }),
  });
  const json = await res.json();
  if (!json.uri) throw new Error(`Post failed: ${JSON.stringify(json)}`);
  return json;
}

async function likePost(auth, uri, cid) {
  await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessJwt}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      repo:       auth.did,
      collection: 'app.bsky.feed.like',
      record: {
        '$type':   'app.bsky.feed.like',
        subject:   { uri, cid },
        createdAt: new Date().toISOString(),
      },
    }),
  });
}

async function listNotifications(auth, limit = 50) {
  const res = await fetch(
    `${BSKY_API}/app.bsky.notification.listNotifications?limit=${limit}`,
    { headers: { 'Authorization': `Bearer ${auth.accessJwt}` } }
  );
  return res.json();
}

async function markNotificationsRead(auth) {
  await fetch(`${BSKY_API}/app.bsky.notification.updateSeen`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessJwt}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ seenAt: new Date().toISOString() }),
  });
}

// ════════════════════════════════════════════════════════════════
//  AI コンテンツ生成
// ════════════════════════════════════════════════════════════════

/**
 * 投稿文を生成 — "Build in Public" 実況スタイル（なお視点）
 *
 * 戦略: 汎用マーケティングコピーをやめ、ソロ開発者の実況・実録型に転換。
 * 「日本人・一人・AI全自動・収益化挑戦中」という属性を前面に出す。
 */
async function generateSNSContent(env, topic, category) {

  // 投稿の「型」をランダムに選んで単調さを避ける
  const postTypes = [
    'progress_update',   // 今日何が進んだか
    'behind_the_scenes', // 裏側・開発リアル
    'lesson_learned',    // 失敗や気づき
    'milestone',         // 数字・マイルストーン
    'what_im_building',  // 何を作っているか説明
  ];
  const postType = postTypes[Math.floor(Math.random() * postTypes.length)];

  // ハッシュタグは毎回全部使わず2〜3個をランダム選択
  const allTags = ['#BuildInPublic', '#SoloFounder', '#AIAutomation', '#Solopreneur', '#IndieHacker', '#MadeInJapan'];
  const shuffled = allTags.sort(() => Math.random() - 0.5);
  const tags = shuffled.slice(0, 2 + Math.floor(Math.random() * 2)).join(' ');

  // "Sage"という名前は3投稿に1回だけ使う（謎めかした方がクリックされやすい）
  const useSageName = (new Date().getUTCMinutes() % 3 === 0);
  const agentName   = useSageName ? 'Sage' : 'my AI agent';

  const prompt = `You are ghostwriting a Bluesky post for Nao, a solo developer in Japan.

About Nao:
- Building "${agentName}" — an AI automation system that posts, researches, and monetizes while he sleeps
- Working completely alone. No team. No investors. No marketing budget.
- Has been building for 6+ months. First revenue is getting close.
- Shares his journey openly: wins, failures, late nights, breakthroughs.
- His audience: other solo builders, indie hackers, AI enthusiasts worldwide.

Today's topic to weave in naturally: ${topic} [${category}]
Post type to write: ${postType}

Post type guide:
- progress_update: "Today I got X working. Here's what changed."
- behind_the_scenes: "Nobody sees this part of building solo — the reality of..."
- lesson_learned: "I wasted 3 hours before I realized... Here's what I learned."
- milestone: "Day X. Here's where things stand." (use a real-feeling number)
- what_im_building: Explain one specific part of ${agentName} in plain, honest terms.

Rules:
- Write in first person as Nao. Authentic, not polished.
- Max 280 characters total (Bluesky hard limit — stay safely under)
- 1 idea only. Short sentences. Line breaks are OK.
- NO generic phrases: "Scale your business", "Boost productivity", "Game-changer", "Unlock your potential"
- NO URLs in this post
- End with exactly these hashtags (already chosen): ${tags}
- Tone: honest, a little tired but driven, real human building something

REQUIRED — all 3 must appear:
1. Include at least one of "Japan" / "solo" / "no team" somewhere natural
2. Include exactly 1 number (Day count, hours, file count, error count, etc.)
3. Last line before hashtags = cliffhanger or forward pull, e.g.:
   "What breaks next? We'll see."
   "Revenue or bust. Day 201 tomorrow."
   "Still going."

Reference style (match this energy, don't copy):
"Day 183. Solo dev in Japan.
No team. No funding. Just me and an AI agent.
It posted while I slept last night.
Still going.
#BuildInPublic #SoloFounder"

Output the post text ONLY. No explanation, no quotes, no markdown.`;


  const res = await fetch(GROQ_API, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  300,
      temperature: 0.9,  // 少し高めにして個性・バリエーションを出す
    }),
  });
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}



/**
 * コメント・メンションへの返答を生成
 */
async function generateReply(env, commentText, lang = 'ja') {
  const systemPrompt = lang === 'ja'
    ? `あなたはSage AIの公式botアカウントです（自動化ラベル付き）。
ユーザーのコメントに2〜3文で温かく誠実に返信してください。
絵文字1〜2個OK。宣伝・ハッシュタグ・URLは一切不要。
自然な会話として返答してください。`
    : `You are the official Sage AI bot account (marked as automated).
Reply warmly and genuinely in 2-3 sentences.
1-2 emojis OK. No sales pitch, no hashtags, no URLs.
Keep it conversational and authentic.`;

  const res = await fetch(GROQ_API, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: commentText },
      ],
      max_tokens:  120,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim() || '💙 ありがとうございます！';
}

// ════════════════════════════════════════════════════════════════
//  Notion 連携
// ════════════════════════════════════════════════════════════════

async function getNextTopicFromNotion(env) {
  if (!env.NOTION_API_KEY || !env.NOTION_CONTENT_POOL_DB_ID) return null;

  const status  = env.NOTION_STATUS_PENDING || 'Scheduled';
  const res = await fetch(
    `https://api.notion.com/v1/databases/${env.NOTION_CONTENT_POOL_DB_ID}/query`,
    {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Status',
          status:   { equals: status },
        },
        page_size: 1,
        sorts:     [{ property: 'Created', direction: 'ascending' }],
      }),
    }
  );
  const data = await res.json();
  const page = data.results?.[0];
  if (!page) return null;

  const topic    = page.properties?.Topic?.title?.[0]?.text?.content
                || page.properties?.Name?.title?.[0]?.text?.content
                || 'AI Automation';
  const category = page.properties?.Category?.select?.name || 'General';

  return { pageId: page.id, topic, category };
}

async function markNotionPageDone(env, pageId) {
  const done = env.NOTION_STATUS_DONE || 'Done';
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method:  'PATCH',
    headers: {
      'Authorization':  `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({
      properties: { Status: { status: { name: done } } },
    }),
  });
}

// ════════════════════════════════════════════════════════════════
//  Telegram 通知
// ════════════════════════════════════════════════════════════════

async function sendTelegram(env, message) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:    env.TELEGRAM_CHAT_ID,
        text:       `🤖 sage-sns-worker\n${message}`,
        parse_mode: 'HTML',
      }),
    }
  );
}

// ════════════════════════════════════════════════════════════════
//  メインフロー①: Notion → Groq → Bluesky 投稿
// ════════════════════════════════════════════════════════════════

async function runPostingCycle(env) {
  const log = [];

  try {
    const notion = await getNextTopicFromNotion(env);

    let topic, category, pageId;
    if (notion) {
      ({ topic, category, pageId } = notion);
      log.push(`📚 Notion トピック取得: "${topic}" [${category}]`);
    } else {
      // Notion なし / ネタ切れ時のフォールバックトピック
      const fallbacks = [
        { topic: 'How AI tools save solopreneurs 10+ hours per week', category: 'Productivity' },
        { topic: 'The $0 AI stack that replaces a full marketing team', category: 'AI Tools' },
        { topic: 'Why most side hustles fail — and how AI fixes it',   category: 'Mindset' },
        { topic: 'Automate your social media in 30 minutes with AI',   category: 'Automation' },
        { topic: '5 AI workflows that generate passive income',         category: 'Income' },
      ];
      const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      topic    = pick.topic;
      category = pick.category;
      log.push(`⚡ フォールバックトピック使用: "${topic}"`);
    }

    const content = await generateSNSContent(env, topic, category);
    if (!content) throw new Error('コンテンツ生成失敗');
    log.push(`✍️ 生成完了 (${content.length}字)`);

    const auth = await blueskyAuth(env);
    const post = await createPost(auth, content);
    log.push(`✅ Bluesky 投稿成功\n📎 URI: ${post.uri}`);

    if (pageId) await markNotionPageDone(env, pageId);

    await sendTelegram(env, log.join('\n'));
  } catch (e) {
    log.push(`❌ エラー: ${e.message}`);
    await sendTelegram(env, log.join('\n'));
  }

  return log.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  メインフロー②: エンゲージメント（いいね返し + AI 返答）
// ════════════════════════════════════════════════════════════════

function detectLang(text) {
  return /[\u3040-\u30ff\u4e00-\u9fff]/.test(text) ? 'ja' : 'en';
}

async function runEngagementCycle(env) {
  const log = [];

  try {
    const auth = await blueskyAuth(env);
    const notifData = await listNotifications(auth, 50);
    const unread    = (notifData.notifications || []).filter(n => !n.isRead);
    log.push(`🔔 未読通知: ${unread.length}件`);

    let likeCount  = 0;
    let replyCount = 0;

    for (const n of unread) {
      // ── いいね → いいね返し ──────────────────────────────
      if (n.reason === 'like' && likeCount < MAX_LIKES_PER_RUN) {
        try {
          const feedRes = await fetch(
            `${BSKY_API}/app.bsky.feed.getAuthorFeed?actor=${n.author.did}&limit=1`,
            { headers: { 'Authorization': `Bearer ${auth.accessJwt}` } }
          );
          const feedData    = await feedRes.json();
          const latestPost  = feedData.feed?.[0]?.post;
          if (latestPost) {
            await likePost(auth, latestPost.uri, latestPost.cid);
            likeCount++;
            log.push(`❤️ いいね返し → @${n.author.handle}`);
            await sleep(ACTION_DELAY_MS);
          }
        } catch (e) {
          log.push(`いいね返しエラー (@${n.author.handle}): ${e.message}`);
        }
      }

      // ── メンション / リプライ → AI 返答 ─────────────────
      if ((n.reason === 'mention' || n.reason === 'reply') && replyCount < MAX_REPLIES_PER_RUN) {
        try {
          const commentText = n.record?.text || '';
          if (!commentText) continue;

          const lang      = detectLang(commentText);
          const replyText = await generateReply(env, commentText, lang);

          const root = n.record?.reply?.root || { uri: n.uri, cid: n.cid };

          await createPost(auth, replyText, { uri: n.uri, cid: n.cid, root });
          replyCount++;
          log.push(`💬 返答 → @${n.author.handle}: "${replyText.slice(0, 40)}..."`);
          await sleep(ACTION_DELAY_MS);
        } catch (e) {
          log.push(`返答エラー (@${n.author.handle}): ${e.message}`);
        }
      }
    }

    await markNotificationsRead(auth);
    log.push(`\n📊 完了 | ❤️ ${likeCount}件 | 💬 ${replyCount}件`);
    await sendTelegram(env, log.join('\n'));
  } catch (e) {
    log.push(`❌ エラー: ${e.message}`);
    await sendTelegram(env, log.join('\n'));
  }

  return log.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  Worker エントリーポイント
// ════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /run → Notion から取得して投稿
    if (request.method === 'POST' && url.pathname === '/run') {
      const result = await runPostingCycle(env);
      return new Response(result, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // POST /engage → エンゲージメント（いいね返し + リプライ）
    if (request.method === 'POST' && url.pathname === '/engage') {
      const result = await runEngagementCycle(env);
      return new Response(result, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // POST / → テキスト直接指定で投稿
    if (request.method === 'POST' && url.pathname === '/') {
      const body = await request.json().catch(() => ({}));
      if (!body.text) return new Response('text is required', { status: 400 });
      const auth   = await blueskyAuth(env);
      const result = await createPost(auth, body.text);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(
      '🤖 sage-sns-worker\n\nPOST /run    → Notionトピック取得 → Bluesky投稿\nPOST /engage → いいね返し + コメント返答\nPOST /       → テキスト直接投稿',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  },

  // Cron: 毎日 00:00 UTC (09:00 JST)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      Promise.all([
        runPostingCycle(env),
        runEngagementCycle(env),
      ])
    );
  },
};
