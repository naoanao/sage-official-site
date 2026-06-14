import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者用: 将来のローンチ告知に使える「全メールリスト」を集約して返す。
// 収集元: 週次メール購読(emailsub_*) / 代行申込(agency_req_*) / 有料顧客(revenue_events)
//        / ウェイトリスト(waitlist_signups) / ユーザー(users)。
// メールで重複排除し、source(収集元)・lang・初回日時をまとめる。
// ?format=csv でCSVダウンロード。セキュリティ: ADMIN_SECRET 必須。
type Entry = { email: string; lang: string; sources: Set<string>; first_seen: string };

function add(map: Map<string, Entry>, email: unknown, source: string, lang?: string, when?: string) {
  if (!email || typeof email !== "string" || !email.includes("@")) return;
  const key = email.trim().toLowerCase();
  if (!key) return;
  const ts = when || "";
  const cur = map.get(key);
  if (cur) {
    cur.sources.add(source);
    if (lang && (cur.lang === "?" || !cur.lang)) cur.lang = lang;
    if (ts && (!cur.first_seen || ts < cur.first_seen)) cur.first_seen = ts;
  } else {
    map.set(key, { email: key, lang: lang || "?", sources: new Set([source]), first_seen: ts });
  }
}

export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const map = new Map<string, Entry>();

  // 1) app_config: 週次メール購読 + 代行申込
  try {
    const { data } = await supabase.from("app_config").select("key, value")
      .or("key.like.emailsub_%,key.like.agency_req_%");
    for (const row of data || []) {
      try {
        const v = JSON.parse((row as { value: string }).value);
        const isSub = (row as { key: string }).key.startsWith("emailsub_");
        add(map, v.email, isSub ? "weekly" : "agency", v.lang, v.created_at);
      } catch { /* skip */ }
    }
  } catch { /* table missing */ }

  // 2) 有料顧客
  try {
    const { data } = await supabase.from("revenue_events").select("email, created_at");
    for (const r of data || []) add(map, (r as { email?: string }).email, "customer", undefined, (r as { created_at?: string }).created_at);
  } catch { /* skip */ }

  // 3) ウェイトリスト
  try {
    const { data } = await supabase.from("waitlist_signups").select("email, signed_up_at");
    for (const r of data || []) add(map, (r as { email?: string }).email, "waitlist", undefined, (r as { signed_up_at?: string }).signed_up_at);
  } catch { /* skip */ }

  // 4) ユーザー（メール登録済み）
  try {
    const { data } = await supabase.from("users").select("email, plan_updated_at").not("email", "is", null);
    for (const r of data || []) add(map, (r as { email?: string }).email, "user", undefined, (r as { plan_updated_at?: string }).plan_updated_at);
  } catch { /* skip */ }

  const list = Array.from(map.values())
    .map((e) => ({ email: e.email, lang: e.lang, sources: Array.from(e.sources).sort().join("|"), first_seen: e.first_seen }))
    .sort((a, b) => String(b.first_seen).localeCompare(String(a.first_seen)));

  // CSV エクスポート
  if (url.searchParams.get("format") === "csv") {
    const header = "email,lang,sources,first_seen";
    const rows = list.map((e) => `${e.email},${e.lang},${e.sources},${e.first_seen}`);
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="growl-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // 収集元ごとの集計も返す
  const bySource: Record<string, number> = {};
  for (const e of list) for (const s of e.sources.split("|")) bySource[s] = (bySource[s] || 0) + 1;

  return NextResponse.json({ count: list.length, by_source: bySource, subscribers: list });
}
