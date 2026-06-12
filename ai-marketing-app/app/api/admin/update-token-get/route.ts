import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // 管理者認証（フェイルクローズ）: ADMIN_SECRET 未設定なら必ず拒否し、
  // ?secret= が一致した場合のみ続行する。
  const adminSecret = process.env.ADMIN_SECRET;
  const provided = searchParams.get("secret");
  if (!adminSecret || !provided || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!token || token.length < 20) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  try {
    // 長期トークンに交換
    let finalToken = token;
    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${token}`
      );
      const d = await r.json();
      if (d.access_token) finalToken = d.access_token;
    } catch {}

    await supabase.from("app_config").upsert({
      key: "meta_ads_access_token",
      value: finalToken,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.redirect("https://growl-ai.com/dashboard?meta_connected=1");
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
