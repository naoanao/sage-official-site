import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// リンクコードを生成してSupabaseに保存
export async function POST(req: NextRequest) {
  try {
    const { device_id } = await req.json();
    if (!device_id) return NextResponse.json({ error: "device_id required" }, { status: 400 });

    const db = getDB();

    // 既存のリンクコードがあればそれをそのまま返す（リロード時のフリッカー・変更を防止）
    const { data: user, error: fetchError } = await db
      .from("users")
      .select("line_link_code")
      .eq("device_id", device_id)
      .single();

    if (!fetchError && user?.line_link_code) {
      return NextResponse.json({ link_code: user.line_link_code });
    }

    // 存在しない場合のみ新規生成して保存
    const link_code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error: updateError } = await db
      .from("users")
      .update({ line_link_code: link_code })
      .eq("device_id", device_id);

    if (updateError) throw updateError;

    return NextResponse.json({ link_code });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
