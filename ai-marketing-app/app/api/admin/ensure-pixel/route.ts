import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者用: 接続済みアカウント(device_id)に Meta Pixel が無ければ作成し、Pixel ID を返す。
// 返ってきたIDを Vercel env NEXT_PUBLIC_META_PIXEL_ID に設定すると、
// ①サイトにPixelが入りPageView/Lead計測 ②submitがコンバージョン最適化に自動切替、になる。
// セキュリティ: ADMIN_SECRET 必須。
async function auth(req: NextRequest): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  return !!adminSecret && provided === adminSecret;
}

async function handle(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id") || "nao-agency";

  const { data: row } = await supabase
    .from("user_meta_tokens")
    .select("access_token, ad_account_id")
    .eq("device_id", deviceId)
    .single();
  if (!row?.access_token || !row.ad_account_id) {
    return NextResponse.json({ error: "未接続のdevice_id（access_token/ad_account_idなし）" }, { status: 404 });
  }
  const acct = row.ad_account_id.startsWith("act_") ? row.ad_account_id : `act_${row.ad_account_id}`;
  const token = row.access_token;

  // 既存Pixelを確認
  const listRes = await fetch(`${BASE_URL}/${acct}/adspixels?fields=id,name&access_token=${encodeURIComponent(token)}`);
  const list = await listRes.json();
  if (list.error) return NextResponse.json({ error: list.error.message }, { status: 400 });
  if (Array.isArray(list.data) && list.data.length > 0) {
    return NextResponse.json({
      created: false,
      pixel_id: list.data[0].id,
      pixel_name: list.data[0].name,
      all: list.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      next: "この pixel_id を Vercel env NEXT_PUBLIC_META_PIXEL_ID に設定→再デプロイ。",
    });
  }

  // 無ければ作成
  const createRes = await fetch(`${BASE_URL}/${acct}/adspixels`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ name: "Growl Pixel", access_token: token }),
  });
  const created = await createRes.json();
  if (created.error || !created.id) {
    return NextResponse.json({ error: created.error?.message || "Pixel作成に失敗", raw: created }, { status: 400 });
  }
  return NextResponse.json({
    created: true,
    pixel_id: created.id,
    next: "この pixel_id を Vercel env NEXT_PUBLIC_META_PIXEL_ID に設定→再デプロイ。",
  });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
