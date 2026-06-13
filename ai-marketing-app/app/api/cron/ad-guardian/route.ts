import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Sage「広告の見張り役」= PDCA/OODA自動化エンジン（毎日実行想定）。
// 広告セット単位で配信中の成果を観測し、自動で判断・実行する:
//   【負けを止める(Kill)】 ① 累計spend>hard_stop=暴走 ② spend>=waste_spendでリンククリック0=無駄遣い ③ CPC>目標×mult=非効率 → PAUSE
//   【勝ちを伸ばす(Scale)】 十分なデータ(spend>=scale_min_spend & clicks>=min_clicks)があり、効率が良ければ
//        日予算を +scale_step(既定20%) 引き上げ（scale_max=暴走上限まで）。急増はMeta不正検知を招くため小刻みに。
// セキュリティ: ADMIN_SECRET 必須。トークンはレスポンスに含めない。
async function auth(req: NextRequest): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  return !!adminSecret && provided === adminSecret;
}

function isZeroDecimal(cur: string) {
  return ["JPY", "KRW", "VND", "CLP"].includes(String(cur).toUpperCase());
}

type Opts = {
  wasteSpend: number; hardStop: number; targetCpc: number | null; targetCpcMult: number;
  scaleStep: number; scaleMax: number; scaleMinSpend: number; minClicks: number;
};

// actions配列からコンバージョン数を拾う（lead / complete_registration / offsite_conversion 等）
function conversionsFromActions(actions: Array<{ action_type?: string; value?: string }> | undefined): number {
  if (!Array.isArray(actions)) return 0;
  let n = 0;
  for (const a of actions) {
    const t = String(a.action_type || "").toLowerCase();
    if (t.includes("lead") || t.includes("complete_registration") || t.includes("offsite_conversion") || t.includes("purchase")) {
      n += Number(a.value || 0);
    }
  }
  return n;
}

async function guardOne(
  row: { device_id: string; access_token: string; ad_account_id: string | null },
  opts: Opts
) {
  const token = row.access_token;
  if (!row.ad_account_id) return { device_id: row.device_id, error: "no ad_account_id", checked: 0, actions: [] as unknown[] };
  const acct = row.ad_account_id.startsWith("act_") ? row.ad_account_id : `act_${row.ad_account_id}`;

  // 口座通貨
  let cur = "JPY";
  try {
    const cRes = await fetch(`${BASE_URL}/${acct}?fields=currency&access_token=${encodeURIComponent(token)}`);
    const c = await cRes.json();
    if (c.currency) cur = c.currency;
  } catch { /* default */ }

  // 広告セット単位のインサイト（直近3日）
  const insRes = await fetch(
    `${BASE_URL}/${acct}/insights?level=adset&date_preset=last_3d` +
    `&fields=adset_id,adset_name,spend,inline_link_clicks,clicks,actions&limit=200&access_token=${encodeURIComponent(token)}`
  );
  const ins = await insRes.json();
  if (ins.error) return { device_id: row.device_id, error: ins.error.message, checked: 0, actions: [] as unknown[] };
  const rows = ins.data || [];

  const actionsLog: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const adsetId = r.adset_id;
    if (!adsetId) continue;
    const spend = Number(r.spend || 0);
    const clicks = Number(r.inline_link_clicks || 0);
    const conv = conversionsFromActions(r.actions);
    const cpc = clicks > 0 ? spend / clicks : null;

    // 現在の広告セット状態・予算を取得
    let daily = 0; let status = ""; let eff = "";
    try {
      const aRes = await fetch(`${BASE_URL}/${adsetId}?fields=daily_budget,status,effective_status&access_token=${encodeURIComponent(token)}`);
      const a = await aRes.json();
      daily = Number(a.daily_budget || 0); // アカウント通貨の最小単位
      status = a.status || ""; eff = a.effective_status || "";
    } catch { /* skip */ }
    if (status !== "ACTIVE") { actionsLog.push({ adset_id: adsetId, skipped: `status=${status || eff}` }); continue; }

    // --- Kill 判定 ---
    let killReason = "";
    if (spend >= opts.hardStop) killReason = `累計spend ${spend} が暴走上限 ${opts.hardStop} 超`;
    else if (spend >= opts.wasteSpend && clicks === 0) killReason = `spend ${spend} でリンククリック0（無駄遣い）`;
    else if (opts.targetCpc && cpc !== null && cpc > opts.targetCpc * opts.targetCpcMult) killReason = `CPC ${cpc.toFixed(0)} が目標 ${opts.targetCpc} の${opts.targetCpcMult}倍超`;

    if (killReason) {
      try {
        const pr = await fetch(`${BASE_URL}/${adsetId}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ status: "PAUSED", access_token: token }) });
        const pd = await pr.json();
        actionsLog.push({ adset_id: adsetId, adset_name: r.adset_name, action: "PAUSE(kill)", reason: killReason, spend, clicks, conversions: conv, ok: !pd.error, err: pd.error?.message || null });
      } catch (e) { actionsLog.push({ adset_id: adsetId, action: "PAUSE(kill)", reason: killReason, ok: false, err: String(e) }); }
      continue;
    }

    // --- Scale 判定（勝ちを伸ばす）---
    // 十分なデータ + 効率が良い（CPC目標内 or コンバージョンあり）→ 予算を小刻みに増額
    const efficient = (opts.targetCpc ? (cpc !== null && cpc <= opts.targetCpc) : true);
    const winner = spend >= opts.scaleMinSpend && (conv > 0 || clicks >= opts.minClicks) && efficient;
    if (winner && daily > 0) {
      const next = Math.min(opts.scaleMax, Math.round(daily * (1 + opts.scaleStep)));
      if (next > daily) {
        try {
          const ur = await fetch(`${BASE_URL}/${adsetId}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ daily_budget: String(next), access_token: token }) });
          const ud = await ur.json();
          actionsLog.push({ adset_id: adsetId, adset_name: r.adset_name, action: "SCALE(+)", from: daily, to: next, spend, clicks, conversions: conv, cpc: cpc ? Math.round(cpc) : null, ok: !ud.error, err: ud.error?.message || null });
        } catch (e) { actionsLog.push({ adset_id: adsetId, action: "SCALE(+)", ok: false, err: String(e) }); }
        continue;
      }
    }

    actionsLog.push({ adset_id: adsetId, adset_name: r.adset_name, action: "HOLD", spend, clicks, conversions: conv, cpc: cpc ? Math.round(cpc) : null });
  }
  return { device_id: row.device_id, currency: cur, checked: rows.length, actions: actionsLog };
}

async function handle(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id");
  const zero = true; // 既定はJPY基準のしきい値（口座通貨が小数ありでも安全側に働く）
  const opts: Opts = {
    wasteSpend: Number(url.searchParams.get("waste_spend") || (zero ? 1000 : 10)),
    hardStop: Number(url.searchParams.get("hard_stop") || (zero ? 20000 : 200)),
    targetCpc: url.searchParams.get("target_cpc") ? Number(url.searchParams.get("target_cpc")) : null,
    targetCpcMult: Number(url.searchParams.get("target_cpc_mult") || 1.5),
    scaleStep: Number(url.searchParams.get("scale_step") || 0.2),       // +20%
    scaleMax: Number(url.searchParams.get("scale_max") || (zero ? 50000 : 500)), // 暴走上限と同じ
    scaleMinSpend: Number(url.searchParams.get("scale_min_spend") || (zero ? 1000 : 10)),
    minClicks: Number(url.searchParams.get("min_clicks") || 10),
  };

  let q = supabase.from("user_meta_tokens").select("device_id, access_token, ad_account_id");
  if (deviceId) q = q.eq("device_id", deviceId);
  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ results: [], message: "対象なし" });

  const results = [];
  for (const row of rows) {
    results.push(await guardOne(row as { device_id: string; access_token: string; ad_account_id: string | null }, opts));
  }
  const paused = results.reduce((n, r) => n + ((r.actions as Array<{ action?: string }>)?.filter((a) => a.action === "PAUSE(kill)").length || 0), 0);
  const scaled = results.reduce((n, r) => n + ((r.actions as Array<{ action?: string }>)?.filter((a) => a.action === "SCALE(+)").length || 0), 0);
  return NextResponse.json({ results, summary: { paused, scaled } });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
