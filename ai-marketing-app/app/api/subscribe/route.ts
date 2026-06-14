import { NextRequest, NextResponse } from "next/server";
import { saveEmailSubscription } from "@/lib/db";
import { sendEmail } from "@/lib/notify";

export const maxDuration = 20;

// 英語圏ユーザー向けの「毎週メールで3アクションが届く」購読登録（LINEの代替チャネル）。
// device_id 単位で保存。確認メールを1通送る（RESEND_API_KEY未設定なら自動スキップ＝壊れない）。
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_id, email, lang } = body || {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!device_id || typeof device_id !== "string") {
      return NextResponse.json({ success: false, error: "Missing device id." }, { status: 400 });
    }

    const language: "ja" | "en" = lang === "ja" ? "ja" : "en";
    await saveEmailSubscription(device_id, String(email).slice(0, 200), language);

    // 確認メール（届けば配信が動く証明にもなる。鍵未設定なら skipped で静かに無視）。
    const subject = language === "ja" ? "Growl: 毎週のアクション配信に登録しました" : "Growl: You're subscribed to weekly actions";
    const html = language === "ja"
      ? `<div style="font-family:sans-serif;line-height:1.6"><h2>登録ありがとうございます！</h2><p>毎週月曜、あなたの事業に合わせた「今週の3アクション」をこのメールアドレスにお届けします。</p><p>いつでも解除できます。</p><p style="color:#888">— Growl</p></div>`
      : `<div style="font-family:sans-serif;line-height:1.6"><h2>You're all set! 🎉</h2><p>Every Monday, we'll email you 3 ready-to-use marketing actions tailored to your business.</p><p>Just copy, paste, and go. You can unsubscribe anytime.</p><p style="color:#888">— Growl</p></div>`;

    let delivery: { ok: boolean; skipped?: string } = { ok: false };
    try { delivery = await sendEmail(String(email), subject, html); } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      delivery,
      message: language === "ja" ? "登録しました。毎週メールでお届けします。" : "Subscribed. We'll email you every week.",
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
