import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";

export const maxDuration = 20;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const ADMIN_EMAIL = process.env.NOTIFY_ADMIN_EMAIL || "naofumi0930@gmail.com";

// データ削除リクエストの受付（Meta/TikTok App Review 要件）。
// リクエストを記録し、管理者へ通知し、ユーザーへ受付確認メールを送る。
// 実削除は管理者が確認のうえ実行（誤削除防止）。トークンは即時無効化が望ましい。
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, device_id, lang } = body || {};
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid email required." }, { status: 400 });
    }
    const isEn = lang === "en";
    const ts = new Date().toISOString();
    const record = { type: "data_deletion_request", email: String(email).slice(0, 200), device_id: device_id || null, lang: isEn ? "en" : "ja", status: "new", created_at: ts };

    const key = `data_deletion_${Date.now()}`;
    const { error } = await supabase.from("app_config").insert({ key, value: JSON.stringify(record) });
    if (error) await supabase.from("app_config").upsert({ key, value: JSON.stringify(record) });

    // 管理者へ通知
    try {
      await notify({
        locale: isEn ? "en" : "jp",
        subject: "🗑️ Growl データ削除リクエスト",
        email: ADMIN_EMAIL,
        message: `データ削除のリクエストがありました。\nメール: ${record.email}\ndevice_id: ${record.device_id || "-"}\n→ 30日以内に削除・トークン無効化を実施`,
      });
    } catch { /* ignore */ }

    // ユーザーへ受付確認メール（Resend設定時のみ送信）
    try {
      await notify({
        locale: isEn ? "en" : "jp",
        subject: isEn ? "Growl: Data deletion request received" : "Growl: データ削除リクエストを受け付けました",
        email: record.email,
        message: isEn
          ? "We received your data deletion request. We'll delete your data within 30 days and revoke any connected ad-account tokens. — Growl"
          : "データ削除のリクエストを受け付けました。30日以内にデータを削除し、連携中の広告アカウントのトークンを無効化します。— Growl",
      });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, request_id: key });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
