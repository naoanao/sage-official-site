import { NextRequest, NextResponse } from "next/server";
import { sendEmail, sendTelegram } from "@/lib/notify";

export const maxDuration = 20;

// 管理者用: 通知チャネル(Email=Resend / Telegram)が実際に届くか検証する。
// GET ?secret=...&email=...(任意) → 各チャネルの送信結果を返す。
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const to = url.searchParams.get("email") || process.env.NOTIFY_ADMIN_EMAIL || "naofumi0930@gmail.com";
  const email = await sendEmail(to, "Growl 通知テスト", "<p>これは Growl の通知テストです。メール送信に成功しています。</p>");
  const telegram = await sendTelegram("Growl 通知テスト: Telegram送信に成功しています。");
  return NextResponse.json({ email, telegram, note: "ok=true なら届いています。skipped=資格情報未設定。" });
}
