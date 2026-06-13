import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const maxDuration = 60;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const SCOPES = "ads_management,pages_show_list,pages_read_engagement,pages_manage_ads";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Meta System Userトークンの自動再発行（毎月スケジュール実行を想定）。
// 新Business Suite UIは60日トークンしか出さないため、ここでGraph API経由で再発行し
// user_meta_tokens を更新する。API経由の再発行は無期限トークンになる場合もある。
// 戦略:
//   1) /me で system user id を取得
//   2) POST /{su-id}/access_tokens (business_app + scope + appsecret_proof + 現トークン=Admin SU) で再発行
//   3) 失敗時は fb_exchange_token で60日延長にフォールバック
//   4) debug_token で新トークンの有効期限を確認し、延びていればDB更新
// セキュリティ: ADMIN_SECRET 必須。レスポンスにトークンは含めない（有効期限と方式のみ返す）。

function appsecretProof(token: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

async function debugTokenExpiry(token: string, appToken: string): Promise<number | null> {
  try {
    const r = await fetch(`${BASE_URL}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`);
    const d = await r.json();
    // data_access_expires_at / expires_at（0 = 無期限）
    const exp = d?.data?.expires_at;
    return typeof exp === "number" ? exp : null;
  } catch { return null; }
}

async function refreshOne(row: { device_id: string; access_token: string }, appId: string, appSecret: string) {
  const current = row.access_token;
  const appToken = `${appId}|${appSecret}`;
  const oldExp = await debugTokenExpiry(current, appToken);

  let newToken: string | null = null;
  let method = "";

  // 1) System User の再発行（推奨・無期限の可能性）
  try {
    const meRes = await fetch(`${BASE_URL}/me?fields=id&access_token=${encodeURIComponent(current)}`);
    const me = await meRes.json();
    if (me?.id) {
      const proof = appsecretProof(current, appSecret);
      const genRes = await fetch(`${BASE_URL}/${me.id}/access_tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          business_app: appId,
          scope: SCOPES,
          appsecret_proof: proof,
          access_token: current,
        }),
      });
      const gen = await genRes.json();
      if (gen?.access_token) { newToken = gen.access_token; method = "system_user_regenerate"; }
    }
  } catch { /* try fallback */ }

  // 2) フォールバック: fb_exchange_token（60日延長）
  if (!newToken) {
    try {
      const ex = await fetch(
        `${BASE_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(current)}`
      );
      const exd = await ex.json();
      if (exd?.access_token) { newToken = exd.access_token; method = "fb_exchange_token"; }
    } catch { /* none */ }
  }

  if (!newToken) {
    return { device_id: row.device_id, ok: false, method: "none", error: "再発行に失敗（手動での再生成が必要な可能性）", old_expires_at: oldExp };
  }

  const newExp = await debugTokenExpiry(newToken, appToken);

  // 期限が延びた / 無期限(0) / または取得不能でも新トークンが有効なら更新
  const { error: upErr } = await supabase.from("user_meta_tokens")
    .update({ access_token: newToken, updated_at: new Date().toISOString() })
    .eq("device_id", row.device_id);

  return {
    device_id: row.device_id,
    ok: !upErr,
    method,
    old_expires_at: oldExp,
    new_expires_at: newExp,
    never_expires: newExp === 0,
    db_error: upErr ? String(upErr.message || upErr) : null,
  };
}

async function handle(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.json({ error: "META_APP_ID / META_APP_SECRET 未設定" }, { status: 500 });
  }

  const deviceId = url.searchParams.get("device_id");
  let query = supabase.from("user_meta_tokens").select("device_id, access_token");
  if (deviceId) query = query.eq("device_id", deviceId);
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ refreshed: [], message: "対象トークンなし" });

  const results = [];
  for (const row of rows) {
    results.push(await refreshOne(row as { device_id: string; access_token: string }, appId, appSecret));
  }
  return NextResponse.json({ refreshed: results, count: results.length });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
