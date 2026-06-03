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
  // OAuthのstateパラメータにdevice_idを埋め込む
  const deviceId = searchParams.get("state") || "global";

  if (error) return NextResponse.redirect(`${APP_URL}/dashboard?meta_error=${error}`);
  if (!code) return NextResponse.redirect(`${APP_URL}/dashboard?meta_error=no_code`);

  try {
    // codeをaccess_tokenに交換
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

    // 長期トークンに交換（60日有効）
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    const finalToken = longData.access_token || tokenData.access_token;

    // ユーザーのページ一覧・広告アカウント一覧を取得
    const [pagesRes, accountsRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name&access_token=${finalToken}`),
      fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${finalToken}`),
    ]);
    const pagesData = await pagesRes.json();
    const accountsData = await accountsRes.json();

    const firstPage = pagesData.data?.[0];
    const firstAccount = accountsData.data?.[0];

    // device_idごとにapp_configへ保存
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("app_config").upsert({ key: `meta_token_${deviceId}`, value: finalToken, updated_at: now }),
      firstPage && supabase.from("app_config").upsert({
        key: `meta_page_${deviceId}`,
        value: JSON.stringify({ id: firstPage.id, name: firstPage.name }),
        updated_at: now,
      }),
      firstAccount && supabase.from("app_config").upsert({
        key: `meta_account_${deviceId}`,
        value: firstAccount.id, // act_xxxxxx形式
        updated_at: now,
      }),
    ]);

    // ページ選択が複数ある場合はページ選択画面へ、1つなら直接ダッシュボードへ
    const pageCount = pagesData.data?.length || 0;
    if (pageCount > 1) {
      const pagesParam = encodeURIComponent(JSON.stringify(pagesData.data.slice(0, 10).map((p: {id: string; name: string}) => ({ id: p.id, name: p.name }))));
      return NextResponse.redirect(`${APP_URL}/dashboard?meta_connected=1&select_page=1&pages=${pagesParam}&device_id=${deviceId}`);
    }
    return NextResponse.redirect(`${APP_URL}/dashboard?meta_connected=1`);

  } catch (err) {
    return NextResponse.redirect(`${APP_URL}/dashboard?meta_error=${encodeURIComponent(String(err))}`);
  }
}
