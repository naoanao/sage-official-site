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

    // 6桁のリンクコード生成
    const link_code = Math.floor(100000 + Math.random() * 900000).toString();

    const db = getDB();
    const { error } = await db
      .from("users")
      .update({ line_link_code: link_code })
      .eq("device_id", device_id);

    if (error) throw error;

    return NextResponse.json({ link_code });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
