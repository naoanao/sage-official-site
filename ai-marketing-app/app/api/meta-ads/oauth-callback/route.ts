import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const deviceId = searchParams.get("state") || "global";

  if (error) return NextResponse.redirect(`${APP_URL}/dashboard?meta_error=${error}`);
  if (!code) return NextResponse.redirect(`${APP_URL}/dashboard?meta_error=no_code`);

  try {
    // code → access_token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?client_id=${process.env.META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(`${APP_URL}/api/meta-ads/oauth-callback`)}` +
      `&client_secret=${process.env.META_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${APP_URL}/dashboard?meta_error=token_exchange_failed`);
    }

    // 長期トークン（60日）
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    const finalToken = longData.access_token || tokenData.access_token;

    // ユーザーのページ一覧・広告アカウント取得
    const [pagesRes, accountsRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${finalToken}`),
      fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${finalToken}`),
    ]);
    const pagesData = await pagesRes.json();
    const accountsData = await accountsRes.json();

    const pages = pagesData.data || [];
    const accounts = accountsData.data || [];
    const firstAccount = accounts[0];

    // user_meta_tokensテーブルに保存（ページは後で選択）
    await supabase.from("user_meta_tokens").upsert({
      device_id: deviceId,
      access_token: finalToken,
      ad_account_id: firstAccount?.id || null,
      page_id: pages.length === 1 ? pages[0].id : null,
      page_name: pages.length === 1 ? pages[0].name : null,
      updated_at: new Date().toISOString(),
    });

    // ページが複数 → 選択画面へ
    if (pages.length > 1) {
      const pagesParam = encodeURIComponent(JSON.stringify(
        pages.slice(0, 10).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
      ));
      const accountsParam = encodeURIComponent(JSON.stringify(
        accounts.slice(0, 5).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))
      ));
      return NextResponse.redirect(
        `${APP_URL}/dashboard?meta_connected=1&select_page=1&pages=${pagesParam}&accounts=${accountsParam}&device_id=${deviceId}`
      );
    }

    return NextResponse.redirect(`${APP_URL}/dashboard?meta_connected=1`);
  } catch (err) {
    return NextResponse.redirect(`${APP_URL}/dashboard?meta_error=${encodeURIComponent(String(err))}`);
  }
}
