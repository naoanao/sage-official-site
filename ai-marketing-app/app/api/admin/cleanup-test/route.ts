import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者用: 動作確認で作ったテストデータ(app_config)を掃除する。
// 対象: emailsub_* / agency_req_* で、値にテスト印(example.com / verify@ / wiretest / 動作確認 / verify-)を含むもの。
// 安全策: 既定は dry_run（消さず一覧だけ返す）。?confirm=yes のときだけ実削除。ADMIN_SECRET必須。
function looksLikeTest(value: string): boolean {
  const v = value.toLowerCase();
  return v.includes("@example.com") || v.includes("verify@") || v.includes("wiretest")
    || v.includes("動作確認") || v.includes('"device_id":"verify-') || v.includes('"device_id":"wiretest"');
}

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const confirm = url.searchParams.get("confirm") === "yes";

  const { data, error } = await supabase.from("app_config").select("key, value")
    .or("key.like.emailsub_%,key.like.agency_req_%,key.like.agency_pending_%");
  if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });

  const targets = (data || [])
    .filter((r) => looksLikeTest((r as { value: string }).value))
    .map((r) => (r as { key: string }).key);

  if (!confirm) {
    return NextResponse.json({ mode: "dry_run", would_delete: targets.length, keys: targets, note: "実削除は ?confirm=yes を付ける。" });
  }

  let deleted = 0;
  for (const key of targets) {
    const { error: delErr } = await supabase.from("app_config").delete().eq("key", key);
    if (!delErr) deleted++;
  }
  return NextResponse.json({ mode: "deleted", requested: targets.length, deleted, keys: targets });
}
