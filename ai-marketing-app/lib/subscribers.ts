import { createClient } from "@supabase/supabase-js";

// 全メールリストの集約（ローンチ告知・週次配信などで使う単一の出所）。
// 収集元: 週次購読(emailsub_*) / 代行申込(agency_req_*) / 有料顧客(revenue_events)
//        / ウェイトリスト(waitlist_signups) / ユーザー(users)。
export type Subscriber = { email: string; lang: string; sources: string; first_seen: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// テスト用ダミー(example.com / verify@)かどうか
export function isTestEmail(email: string): boolean {
  const e = email.toLowerCase();
  return e.includes("@example.com") || e.startsWith("verify@") || e.includes("+test@");
}

export async function getAllSubscribers(): Promise<Subscriber[]> {
  const map = new Map<string, Entry>();

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

  try {
    const { data } = await supabase.from("revenue_events").select("email, created_at");
    for (const r of data || []) add(map, (r as { email?: string }).email, "customer", undefined, (r as { created_at?: string }).created_at);
  } catch { /* skip */ }

  try {
    const { data } = await supabase.from("waitlist_signups").select("email, signed_up_at");
    for (const r of data || []) add(map, (r as { email?: string }).email, "waitlist", undefined, (r as { signed_up_at?: string }).signed_up_at);
  } catch { /* skip */ }

  try {
    const { data } = await supabase.from("users").select("email, plan_updated_at").not("email", "is", null);
    for (const r of data || []) add(map, (r as { email?: string }).email, "user", undefined, (r as { plan_updated_at?: string }).plan_updated_at);
  } catch { /* skip */ }

  return Array.from(map.values())
    .map((e) => ({ email: e.email, lang: e.lang, sources: Array.from(e.sources).sort().join("|"), first_seen: e.first_seen }))
    .sort((a, b) => String(b.first_seen).localeCompare(String(a.first_seen)));
}
