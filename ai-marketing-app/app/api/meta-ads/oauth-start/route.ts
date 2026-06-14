import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://growl-ai.com";

// セルフサーブ Meta OAuth 開始ルート（ユーザーが自分のFB広告アカウントを接続）。
// FacebookのOAuthダイアログへ送り出す。callbackは /api/meta-ads/oauth-callback（既存）。
// 要: Vercel に META_APP_ID／META_APP_SECRET、Meta App の Valid OAuth Redirect URIs に
//     {APP_URL}/api/meta-ads/oauth-callback を登録、App Review通過（一般ユーザー向け）。
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id") || "global";
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "META_APP_ID not configured" }, { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/meta-ads/oauth-callback`;
  // 広告作成/管理(write)・成果取得(read)・BM・ページ選択・リード取得
  const scope = [
    "ads_management",
    "ads_read",
    "business_management",
    "pages_show_list",
    "pages_read_engagement",
    "leads_retrieval",
  ].join(",");

  const authUrl =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(deviceId)}`;

  return NextResponse.redirect(authUrl);
}
