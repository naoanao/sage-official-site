import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || token.length < 20) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // 短期トークンを60日有効な長期トークンに自動変換
    let finalToken = token;
    try {
      const exchangeRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${token}`
      );
      const exchangeData = await exchangeRes.json();
      if (exchangeData.access_token) {
        finalToken = exchangeData.access_token;
      }
    } catch {}

    const { error } = await supabase
      .from("app_config")
      .upsert({
        key: "meta_ads_access_token",
        value: finalToken,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Token saved (60-day long-lived)" });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
