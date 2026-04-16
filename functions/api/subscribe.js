/**
 * CF Pages Function: /api/subscribe
 * ──────────────────────────────────────────────────────────────
 * 購入前の見込み客メールを収集する Edge Function。
 * PC不要・Cloudflare上で完結。
 *
 * Required CF Pages bindings:
 *   D1 binding:  SUBSCRIBERS_DB   → sage-subscribers
 *   Env var:     RESEND_API_KEY   → re_xxxxxxxxxxxxxxxx
 *   Env var:     FROM_EMAIL       → sage@yourdomain.com (Resend認証済みドメイン)
 *
 * POST /api/subscribe
 * Body: { email, source? }   source = "blog" | "landing" | "popup" etc.
 *
 * 処理:
 *   1. メールアドレスをバリデーション
 *   2. D1 leads テーブルに upsert（重複は updated_at だけ更新）
 *   3. Resend で Welcome メール送信
 *   4. /api/track に blog_subscribe イベントを非同期で記録
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── D1 初期化（テーブルが無ければ作成）────────────────────────────
async function ensureLeadsTable(db) {
  if (!db) return;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT    NOT NULL UNIQUE,
      source      TEXT    DEFAULT 'unknown',
      subscribed  INTEGER DEFAULT 1,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    )
  `).run();
}

async function upsertLead(db, email, source, nowIso) {
  if (!db) return;
  await db.prepare(`
    INSERT INTO leads (email, source, subscribed, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      source     = excluded.source,
      subscribed = 1,
      updated_at = excluded.updated_at
  `).bind(email, source, nowIso, nowIso).run();
}

// ── Resend ウェルカムメール ─────────────────────────────────────
async function sendWelcomeEmail(resendKey, fromEmail, toEmail) {
  if (!resendKey || !fromEmail) return;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Sage</title></head>
<body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">

  <div style="text-align:center;margin-bottom:32px;">
    <span style="display:inline-block;width:12px;height:12px;background:#8b5cf6;border-radius:50%;"></span>
    <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;margin-left:8px;">SAGE 3.0</span>
  </div>

  <h1 style="font-size:32px;font-weight:900;line-height:1.2;margin:0 0 16px;">
    Welcome. Your AI clone just activated.
  </h1>

  <p style="color:#9ca3af;line-height:1.7;margin:0 0 24px;">
    You're now on the Sage insider list. While most people are manually writing blogs and social posts,
    Sage does it automatically — 24 hours a day, 7 days a week.
  </p>

  <p style="color:#9ca3af;line-height:1.7;margin:0 0 32px;">
    Here's what happens next:<br><br>
    📌 You'll get exclusive AI automation strategies — the ones that actually drive revenue.<br>
    🚀 Early access to new Sage features before anyone else.<br>
    💡 Real case studies: how an AI clone generates passive income.
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="https://naofumi3.gumroad.com/l/apvbzh?utm_source=email&utm_medium=welcome&utm_campaign=subscriber"
       style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:700;font-size:16px;border-radius:100px;text-decoration:none;">
      Get Sage 3.0 — $49 →
    </a>
  </div>

  <p style="color:#6b7280;font-size:13px;margin:32px 0 0;text-align:center;line-height:1.6;">
    Don't want emails? <a href="https://sage-ai.app/unsubscribe?email=${encodeURIComponent(toEmail)}" style="color:#8b5cf6;">Unsubscribe here</a><br>
    You're receiving this because you signed up at sage-ai.app
  </p>
</div>
</body>
</html>
`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: 'Your AI clone is ready. Here\'s what\'s next.',
        html,
      }),
    });
  } catch (e) {
    // best-effort: メール失敗でもD1登録は成功扱い
    console.error('Resend error:', e);
  }
}

// ── メインハンドラ ──────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const nowIso = new Date().toISOString();

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const email  = (body.email  || '').trim().toLowerCase();
  const source = (body.source || 'unknown').slice(0, 64);

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // 1. D1 upsert
  try {
    await ensureLeadsTable(env.SUBSCRIBERS_DB);
    await upsertLead(env.SUBSCRIBERS_DB, email, source, nowIso);
  } catch (e) {
    console.error('D1 error:', e);
    // D1が未設定でも Welcome メールは送る
  }

  // 2. Welcome メール（非同期・失敗しても200を返す）
  context.waitUntil(
    sendWelcomeEmail(
      env.RESEND_API_KEY,
      env.FROM_EMAIL || 'sage@sage-ai.app',
      email
    )
  );

  return new Response(JSON.stringify({ success: true, email }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// 他のメソッドは拒否
export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'POST') return onRequestPost(context);
  if (method === 'OPTIONS') return onRequestOptions();
  return new Response('Method Not Allowed', { status: 405, headers: CORS });
}
