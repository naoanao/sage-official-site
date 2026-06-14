import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者用: 代行アカウント(device_id)の広告成果を取得し、顧客に見せられる形で返す。
// 費用/表示/リーチ/クリック/CTR/CPC/コンバージョン/CPA を、口座全体＋キャンペーン別で集計。
// セキュリティ: ADMIN_SECRET 必須。
function conv(actions: Array<{ action_type?: string; value?: string }> | undefined): number {
  if (!Array.isArray(actions)) return 0;
  let n = 0;
  for (const a of actions) {
    const t = String(a.action_type || "").toLowerCase();
    if (t.includes("lead") || t.includes("complete_registration") || t.includes("offsite_conversion") || t.includes("purchase")) n += Number(a.value || 0);
  }
  return n;
}
function summarize(rows: Array<Record<string, unknown>>) {
  let spend = 0, impressions = 0, reach = 0, clicks = 0, linkClicks = 0, conversions = 0;
  for (const r of rows) {
    spend += Number(r.spend || 0);
    impressions += Number(r.impressions || 0);
    reach += Number(r.reach || 0);
    clicks += Number(r.clicks || 0);
    linkClicks += Number(r.inline_link_clicks || 0);
    conversions += conv(r.actions as Array<{ action_type?: string; value?: string }>);
  }
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = linkClicks > 0 ? spend / linkClicks : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  return {
    spend: Math.round(spend), impressions, reach, clicks, link_clicks: linkClicks,
    conversions, ctr: Number(ctr.toFixed(2)), cpc: Math.round(cpc), cpa: Math.round(cpa),
  };
}

export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deviceId = url.searchParams.get("device_id") || "nao-agency";
  const datePreset = url.searchParams.get("since") || "last_7d";

  const { data: row } = await supabase.from("user_meta_tokens").select("access_token, ad_account_id").eq("device_id", deviceId).single();
  if (!row?.access_token || !row.ad_account_id) return NextResponse.json({ error: "未接続のdevice_id" }, { status: 404 });
  const acct = row.ad_account_id.startsWith("act_") ? row.ad_account_id : `act_${row.ad_account_id}`;
  const token = row.access_token;

  let currency = "JPY";
  try { const c = await (await fetch(`${BASE_URL}/${acct}?fields=currency&access_token=${encodeURIComponent(token)}`)).json(); if (c.currency) currency = c.currency; } catch {}

  const fields = "campaign_name,spend,impressions,reach,clicks,inline_link_clicks,actions";
  const r = await fetch(`${BASE_URL}/${acct}/insights?level=campaign&date_preset=${datePreset}&fields=${fields}&limit=200&access_token=${encodeURIComponent(token)}`);
  const data = await r.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });
  const rows = data.data || [];

  const perCampaign = rows.map((c: Record<string, unknown>) => ({ campaign: c.campaign_name, ...summarize([c]) }));
  const total = summarize(rows);

  return NextResponse.json({ device_id: deviceId, period: datePreset, currency, total, campaigns: perCampaign });
}
