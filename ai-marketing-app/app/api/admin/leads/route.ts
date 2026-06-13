import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 20;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者用: 「おまかせ代行」の申込リード一覧を返す。
// /api/agency/request が app_config に agency_req_{ts}=JSON で保存したものを集約。
// セキュリティ: ADMIN_SECRET 必須。
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("app_config")
    .select("key, value")
    .like("key", "agency_req_%");
  if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });

  const leads = (data || [])
    .map((row) => {
      try {
        const v = JSON.parse(row.value);
        return { key: row.key, ...v };
      } catch {
        return { key: row.key, parse_error: true };
      }
    })
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  return NextResponse.json({ count: leads.length, leads });
}
