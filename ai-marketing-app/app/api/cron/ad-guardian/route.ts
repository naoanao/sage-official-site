import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Sage「広告の見張り役」: 配信中の広告を毎日点検し、無駄遣い/不調の広告を自動でPAUSEする。
// ルール(保守的):
//   ① 直近3日で spend >= waste_spend かつ リンククリック0 → 「お金を捨てている」→ 自動停止
//   ② target_cpc 指定があり、CPC(=spend/clicks) > target_cpc*1.5 → 「効率が悪い」→ 自動停止
//   ③ 1広告の累計spendが hard_stop を超えたら → 暴走防止で自動停止
// セキュリティ: ADMIN_SECRET 必須。スケジュール実行(毎日)を想定。トークンはレスポンスに含めない。

async function auth(req: NextRequest): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  return !!adminSecret && provided === adminSecret;
}

function isZeroDecimal(cur: string) {
  return ["JPY", "KRW", "VND", "CLP"].includes(String(cur).toUpperCase());
}

async function guardOne(
  row: { device_id: string; access_token: string; ad_account_id: string | null },
  opts: { wasteSpend: number; targetCpcMult: number; hardStop: number; targetCpc: number | null }
) {
  const out: Array<Record<string, unknown>> = [];
  const acct = row.ad_account_id?.startsWith("act_") ? row.ad_account_id : `act_${row.ad_account_id}`;
  if (!row.ad_account_id) return { device_id: row.device_id, error: "no ad_account_id", checked: 0, paused: [] as unknown[] };

  // 配信中の広告のインサイト(直近3日)を取得
  const insRes = await fetch(
    `${BASE_URL}/${acct}/insights?level=ad&date_preset=last_3d` +
    `&fields=ad_id,ad_name,spend,inline_link_clicks,clicks&limit=200&access_token=${encodeURIComponent(row.access_token)}`
  );
  const ins = await insRes.json();
  if (ins.error) return { device_id: row.device_id, error: ins.error.message, checked: 0, paused: [] as unknown[] };
  const rows = ins.data || [];

  // 通貨判定（口座通貨を取得）
  let cur = "JPY";
  try {
    const cRes = await fetch(`${BASE_URL}/${acct}?fields=currency&access_token=${encodeURIComponent(row.access_token)}`);
    const c = await cRes.json();
    if (c.currency) cur = c.currency;
  } catch { /* default JPY */ }
  const unit = isZeroDecimal(cur) ? 1 : 1; // spendは口座通貨の主単位(文字列)で返る

  const paused: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const spend = Number(r.spend || 0) * unit;
    const linkClicks = Number(r.inline_link_clicks || 0);
    let reason = "";
    if (spend >= opts.hardStop) reason = `累計spend ${spend} が暴走上限 ${opts.hardStop} 超`;
    else if (spend >= opts.wasteSpend && linkClicks === 0) reason = `spend ${spend} でリンククリック0（無駄遣い）`;
    else if (opts.targetCpc && linkClicks > 0 && spend / linkClicks > opts.targetCpc * opts.targetCpcMult) {
      reason = `CPC ${(spend / linkClicks).toFixed(0)} が目標 ${opts.targetCpc} の${opts.targetCpcMult}倍超`;
    }
    if (reason && r.ad_id) {
      try {
        const pr = await fetch(`${BASE_URL}/${r.ad_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ status: "PAUSED", access_token: row.access_token }),
        });
        const pd = await pr.json();
        paused.push({ ad_id: r.ad_id, ad_name: r.ad_name, spend, link_clicks: linkClicks, reason, ok: !pd.error, err: pd.error?.message || null });
      } catch (e) {
        paused.push({ ad_id: r.ad_id, reason, ok: false, err: String(e) });
      }
    }
    out.push({ ad_id: r.ad_id, spend, link_clicks: linkClicks });
  }
  return { device_id: row.device_id, currency: cur, checked: rows.length, paused };
}

async function handle(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id");
  const wasteSpend = Number(url.searchParams.get("waste_spend") || 1000); // 無駄遣い判定の最低spend(口座通貨)
  const hardStop = Number(url.searchParams.get("hard_stop") || 20000);    // 暴走停止の累計spend上限
  const targetCpc = url.searchParams.get("target_cpc") ? Number(url.searchParams.get("target_cpc")) : null;
  const targetCpcMult = Number(url.searchParams.get("target_cpc_mult") || 1.5);

  let q = supabase.from("user_meta_tokens").select("device_id, access_token, ad_account_id");
  if (deviceId) q = q.eq("device_id", deviceId);
  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ results: [], message: "対象なし" });

  const results = [];
  for (const row of rows) {
    results.push(await guardOne(row as { device_id: string; access_token: string; ad_account_id: string | null }, { wasteSpend, hardStop, targetCpc, targetCpcMult }));
  }
  const totalPaused = results.reduce((n, r) => n + ((r.paused as unknown[])?.length || 0), 0);
  return NextResponse.json({ results, total_paused: totalPaused });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
