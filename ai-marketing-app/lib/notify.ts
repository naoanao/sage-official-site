// 地域適応の即時通知ユーティリティ。
// 日本→LINE / 英語圏・その他→Email＋Telegram / Email は全地域ベースライン。
// 各送信は資格情報が無ければ {ok:false, skipped} を返す（壊れない）。
// 必要env(Vercel): RESEND_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, LINE_CHANNEL_ACCESS_TOKEN, NOTIFY_FROM_EMAIL(任意)

const RESEND = process.env.RESEND_API_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_DEFAULT = process.env.TELEGRAM_CHAT_ID;
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const FROM = process.env.NOTIFY_FROM_EMAIL || "Growl <onboarding@resend.dev>";

type Res = { ok: boolean; skipped?: string; id?: string; err?: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<Res> {
  if (!RESEND) return { ok: false, skipped: "no RESEND_API_KEY" };
  if (!to) return { ok: false, skipped: "no recipient" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    const d = await r.json();
    return { ok: r.ok, id: d?.id, err: d?.message || d?.name };
  } catch (e) { return { ok: false, err: String(e) }; }
}

export async function sendTelegram(text: string, chatId?: string): Promise<Res> {
  const chat = chatId || TG_CHAT_DEFAULT;
  if (!TG_TOKEN || !chat) return { ok: false, skipped: "no telegram config" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text }),
    });
    const d = await r.json();
    return { ok: !!d?.ok, err: d?.description };
  } catch (e) { return { ok: false, err: String(e) }; }
}

export async function sendLine(userId: string, text: string): Promise<Res> {
  if (!LINE_TOKEN || !userId) return { ok: false, skipped: "no line config" };
  try {
    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${LINE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
    });
    return { ok: r.ok, err: r.ok ? undefined : String(r.status) };
  } catch (e) { return { ok: false, err: String(e) }; }
}

// 地域適応通知: emailは常に / 日本(jp)はLINE / それ以外はTelegram。
export async function notify(opts: {
  locale?: string; subject: string; message: string;
  email?: string; telegramChatId?: string; lineUserId?: string;
}): Promise<Record<string, Res>> {
  const out: Record<string, Res> = {};
  if (opts.email) out.email = await sendEmail(opts.email, opts.subject, `<div style="font-family:sans-serif;line-height:1.6">${opts.message.replace(/\n/g, "<br>")}</div>`);
  const jp = (opts.locale || "").toLowerCase().startsWith("jp") || (opts.locale || "").toLowerCase().startsWith("ja");
  if (jp && opts.lineUserId) out.line = await sendLine(opts.lineUserId, opts.message);
  else out.telegram = await sendTelegram(opts.message, opts.telegramChatId);
  return out;
}
