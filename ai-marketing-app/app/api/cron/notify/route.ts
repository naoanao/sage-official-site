import { NextRequest, NextResponse } from "next/server";
import { sendLineMessage, buildWeeklyNotificationText } from "@/lib/line";
import { getAllUsersForCron, saveWeeklySession, getLatestMarketSignal, getPastLearningHistory, getEmailSubscriptions } from "@/lib/db";
import { generateWeeklyActions, UserProfile } from "@/lib/gemini";
import { sendEmail } from "@/lib/notify";

// 週次アクションをメール本文(HTML)に整形（英語圏ユーザー向け・LINE代替）。
function buildWeeklyEmailHtml(
  businessDesc: string,
  actions: Array<{ title?: string; content?: string; content_type?: string }>,
  strategyNote: string,
  lang: "ja" | "en"
): string {
  const isEn = lang === "en";
  const head = isEn ? "This week's 3 marketing actions" : "今週の3つのマーケティング施策";
  const intro = isEn ? "Just copy, paste, and go." : "コピーして貼るだけ。";
  const cards = actions.map((a, i) => `
    <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:12px 0">
      <div style="font-weight:700;color:#4f46e5">${i + 1}. ${a.title ?? ""}</div>
      ${a.content_type ? `<div style="font-size:12px;color:#888;margin:2px 0 8px">${a.content_type}</div>` : ""}
      <div style="white-space:pre-wrap;line-height:1.6">${(a.content ?? "").replace(/</g, "&lt;")}</div>
    </div>`).join("");
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#111">${head}</h2>
    <p style="color:#555">${intro}</p>
    ${strategyNote ? `<p style="background:#f5f3ff;border-radius:8px;padding:12px;color:#4338ca">🧠 ${strategyNote.replace(/</g, "&lt;")}</p>` : ""}
    ${cards}
    <p style="color:#aaa;font-size:12px;margin-top:24px">— Growl · You can unsubscribe anytime.</p>
  </div>`;
}

// Vercel Cron: 毎週月曜8時JST (日曜23:00 UTC)
export const maxDuration = 60;

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = getMondayOfCurrentWeek();
  const users = await getAllUsersForCron();
  const emailSubs = await getEmailSubscriptions(); // device_id -> {email, lang}
  const results = { total: users.length, sent: 0, emailed: 0, errors: 0 };

  for (const user of users) {
    try {
      // この人がメール購読者なら、その言語で生成・送信する（英語圏=LINE代替）。
      const sub = (user as { device_id?: string }).device_id ? emailSubs[(user as { device_id: string }).device_id] : undefined;
      // SNSトレンドシグナルを取得（Sage連携）
      let market_signal: string | undefined;
      try {
        const signal = await getLatestMarketSignal(user.industry);
        if (signal) market_signal = signal;
      } catch { /* サイレントに無視 */ }

      // 過去の学習履歴を取得（週を重ねるごとにAIが賢くなる）
      let learning_history: Array<{ week: string; action: string; result: string }> = [];
      try {
        const hist = await getPastLearningHistory(user.id);
        if (hist.length > 0) learning_history = hist;
      } catch { /* サイレントに無視 */ }

      const profile: UserProfile = {
        industry: user.industry,
        business_desc: user.business_desc,
        customer_desc: user.customer_desc,
        main_problem: user.main_problem,
        final_goal: user.final_goal,
        booking_url: user.booking_url ?? undefined,
        learning_history,
        market_signal,
        // メール購読者はその言語で生成（英語圏は英語）。非購読者は従来どおり(ja既定)。
        lang: sub ? sub.lang : undefined,
      };

      const { actions, strategy_note } = await generateWeeklyActions(profile);
      const actionsWithStatus = actions.map((a) => ({ ...a, completed: false }));

      await saveWeeklySession(user.id, weekStart, actionsWithStatus);

      if (user.line_user_id) {
        const text = buildWeeklyNotificationText(user.business_desc, actions, strategy_note);
        await sendLineMessage({
          to: user.line_user_id,
          messages: [{ type: "text", text }],
        });
        results.sent++;
      }

      // メール購読者へ配信（英語圏=LINE代替）。RESEND_API_KEY未設定なら自動スキップ。
      if (sub?.email) {
        const subject = sub.lang === "ja" ? "今週の3アクション — Growl" : "Your 3 actions this week — Growl";
        const html = buildWeeklyEmailHtml(user.business_desc, actions as Array<{ title?: string; content?: string; content_type?: string }>, strategy_note, sub.lang);
        const r = await sendEmail(sub.email, subject, html);
        if (r.ok) results.emailed++;
      }
    } catch (err) {
      console.error(`Failed for user ${user.id}:`, err);
      results.errors++;
    }
  }

  console.log("Weekly cron completed:", results);
  return NextResponse.json({ status: "ok", results, weekStart });
}
