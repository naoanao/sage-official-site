import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者用: 接続済みアカウント(device_id)の「掲載ページ(page_id)」を確認・変更する。
// GET  ?device_id=...  → そのトークンで使えるFacebookページ一覧(id,name)と現在の既定page_idを返す
// POST {device_id, page_id} → user_meta_tokens.page_id / page_name を更新（広告主として表示されるページの切替）
// セキュリティ: ADMIN_SECRET 必須。トークンはレスポンスに含めない。
async function auth(req: NextRequest): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET;
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  return !!adminSecret && provided === adminSecret;
}

async function getRow(deviceId: string) {
  const { data } = await supabase
    .from("user_meta_tokens")
    .select("access_token, page_id, page_name")
    .eq("device_id", deviceId)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id") || "nao-agency";
  const row = await getRow(deviceId);
  if (!row?.access_token) return NextResponse.json({ error: "未接続のdevice_id" }, { status: 404 });

  const r = await fetch(`${BASE_URL}/me/accounts?fields=id,name&access_token=${encodeURIComponent(row.access_token)}`);
  const d = await r.json();
  if (d.error) return NextResponse.json({ error: d.error.message }, { status: 400 });
  return NextResponse.json({
    device_id: deviceId,
    current_page_id: row.page_id || null,
    current_page_name: row.page_name || null,
    available_pages: (d.data || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { device_id = "nao-agency", page_id } = body;
  if (!page_id) return NextResponse.json({ error: "page_id 必須" }, { status: 400 });

  const row = await getRow(device_id);
  if (!row?.access_token) return NextResponse.json({ error: "未接続のdevice_id" }, { status: 404 });

  // 指定page_idがそのトークンで実在するか検証し、page_nameも取得
  const r = await fetch(`${BASE_URL}/me/accounts?fields=id,name&access_token=${encodeURIComponent(row.access_token)}`);
  const d = await r.json();
  const match = (d.data || []).find((p: { id: string }) => String(p.id) === String(page_id));
  if (!match) return NextResponse.json({ error: "そのトークンに紐づくページに page_id が見つかりません" }, { status: 400 });

  const { error: upErr } = await supabase
    .from("user_meta_tokens")
    .update({ page_id: match.id, page_name: match.name, updated_at: new Date().toISOString() })
    .eq("device_id", device_id);
  if (upErr) return NextResponse.json({ error: String(upErr.message || upErr) }, { status: 500 });

  return NextResponse.json({ success: true, device_id, page_id: match.id, page_name: match.name });
}
