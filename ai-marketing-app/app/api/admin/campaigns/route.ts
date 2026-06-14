import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BASE_URL = "https://graph.facebook.com/v21.0";

async function getToken(deviceId: string) {
  const { data } = await supabase.from("user_meta_tokens").select("access_token, ad_account_id").eq("device_id", deviceId).single();
  if (!data?.access_token || !data.ad_account_id) return null;
  const acct = data.ad_account_id.startsWith("act_") ? data.ad_account_id : `act_${data.ad_account_id}`;
  return { token: data.access_token as string, acct };
}

// 管理者用: 代行アカウントの全キャンペーンを状態付きで一覧（GET）。
// アーカイブ（POST ?ids=a,b,c）= status を ARCHIVED に変更（可逆・削除ではない）。ADMIN_SECRET必須。
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!process.env.ADMIN_SECRET || provided !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deviceId = url.searchParams.get("device_id") || "nao-agency";
  const t = await getToken(deviceId);
  if (!t) return NextResponse.json({ error: "未接続のdevice_id" }, { status: 404 });

  const r = await fetch(`${BASE_URL}/${t.acct}/campaigns?fields=id,name,status,effective_status,created_time&limit=200&access_token=${encodeURIComponent(t.token)}`);
  const data = await r.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 502 });
  return NextResponse.json({ device_id: deviceId, count: (data.data || []).length, campaigns: data.data || [] });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  if (!process.env.ADMIN_SECRET || provided !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deviceId = url.searchParams.get("device_id") || "nao-agency";
  const ids = (url.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ error: "ids required (comma-separated campaign IDs)" }, { status: 400 });

  const t = await getToken(deviceId);
  if (!t) return NextResponse.json({ error: "未接続のdevice_id" }, { status: 404 });

  const results: Record<string, string> = {};
  for (const id of ids) {
    try {
      const r = await fetch(`${BASE_URL}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `status=ARCHIVED&access_token=${encodeURIComponent(t.token)}`,
      });
      const d = await r.json();
      results[id] = d.success || r.ok ? "archived" : (d.error?.message || "failed");
    } catch (e) { results[id] = String(e); }
  }
  return NextResponse.json({ device_id: deviceId, archived: results });
}
