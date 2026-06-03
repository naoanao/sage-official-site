import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app"}/dashboard?meta_error=${error}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app"}/dashboard?meta_error=no_code`
    );
  }

  try {
    // codeをaccess_tokenに交換
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent("https://growl-app.vercel.app/api/meta-ads/oauth-callback")}&client_secret=${process.env.META_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app"}/dashboard?meta_error=token_exchange_failed`
      );
    }

    // 長期トークンに交換（60日有効）
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longTokenData = await longTokenRes.json();
    const finalToken = longTokenData.access_token || tokenData.access_token;

    // Supabaseに保存
    await supabase.from("app_config").upsert({
      key: "meta_ads_access_token",
      value: finalToken,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app"}/dashboard?meta_connected=1`
    );
  } catch (err) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app"}/dashboard?meta_error=${encodeURIComponent(String(err))}`
    );
  }
}
