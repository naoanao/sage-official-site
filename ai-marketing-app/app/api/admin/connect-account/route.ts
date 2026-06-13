import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者が自分(または代行先)のMeta広告アカウントを user_meta_tokens に登録する。
// OAuthボタン無しで、Graph API Explorer等で発行したトークンを貼るだけで接続できる（代行モデル用）。
// セキュリティ: ADMIN_SECRET 必須（フェイルクローズ）。トークンはサーバー側でのみ扱い、レスポンスには含めない。
export async function POST(req: NextRequest) {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    const body = await req.json();
    const { token, secret, device_id } = body;
    const provided = req.headers.get("x-admin-secret") || secret;

    if (!adminSecret || !provided || provided !== adminSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!token || String(token).length < 20) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    const deviceId = (device_id && String(device_id).trim()) || "nao-agency";

    // 1) 短期トークン → 60日長期トークンに交換（失敗時は元のトークンを使用）
    let finalToken = String(token).trim();
    try {
      const ex = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${encodeURIComponent(finalToken)}`
      );
      const exd = await ex.json();
      if (exd.access_token) finalToken = exd.access_token;
    } catch { /* keep original */ }

    // 2) 広告アカウントとページを自動取得（OAuthコールバックと同じロジック）
    const [accRes, pageRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency&access_token=${finalToken}`),
      fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name&access_token=${finalToken}`),
    ]);
    const accData = await accRes.json();
    const pageData = await pageRes.json();

    if (accData.error) {
      return NextResponse.json({ error: `Token validation failed: ${accData.error.message}` }, { status: 400 });
    }
    const accounts = accData.data || [];
    const pages = pageData.data || [];
    if (accounts.length === 0) {
      return NextResponse.json({ error: "このトークンに紐づく広告アカウントが見つかりません。ads_management権限と広告アカウントを確認してください。" }, { status: 400 });
    }
    const firstAccount = accounts[0];
    const firstPage = pages[0] || null;

    // 3) user_meta_tokens に upsert（device_id別）
    const { error: upErr } = await supabase.from("user_meta_tokens").upsert({
      device_id: deviceId,
      access_token: finalToken,
      ad_account_id: firstAccount.id,            // 例: act_123456
      page_id: firstPage?.id || null,
      page_name: firstPage?.name || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "device_id" });
    if (upErr) throw upErr;

    // レスポンスにトークンは含めない（接続できた事実と、選ばれたアカウント/ページのみ返す）
    return NextResponse.json({
      success: true,
      device_id: deviceId,
      connected_ad_account: { id: firstAccount.id, name: firstAccount.name, currency: firstAccount.currency },
      connected_page: firstPage ? { id: firstPage.id, name: firstPage.name } : null,
      available_ad_accounts: accounts.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
      available_pages: pages.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      message: "広告アカウントを接続しました。複数ある場合は connected_* が既定です（必要なら後で変更可）。",
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
