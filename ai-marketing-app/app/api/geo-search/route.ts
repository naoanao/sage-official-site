import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 15;
const BASE_URL = "https://graph.facebook.com/v21.0";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 半径ターゲティング用: 地名(市区町村)を Meta の adgeolocation 検索で引き、
// geo_locations に渡せる候補(key,name)を返す。代行口座(nao-agency)のトークンで検索。
// 返すのは公開の地理データのみ（トークンは返さない）。
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const { data: row } = await supabase
    .from("user_meta_tokens").select("access_token").eq("device_id", "nao-agency").single();
  const token = row?.access_token;
  if (!token) return NextResponse.json({ results: [], error: "no token" }, { status: 200 });

  try {
    const r = await fetch(
      `${BASE_URL}/search?type=adgeolocation&location_types=${encodeURIComponent('["city","region","subcity"]')}&q=${encodeURIComponent(q)}&limit=8&access_token=${encodeURIComponent(token)}`
    );
    const d = await r.json();
    if (d.error) return NextResponse.json({ results: [], error: d.error.message }, { status: 200 });
    const results = (d.data || []).map((g: { key: string; name: string; type: string; region?: string; country_name?: string }) => ({
      key: g.key, name: g.name, type: g.type,
      label: [g.name, g.region, g.country_name].filter(Boolean).join(", "),
    }));
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) }, { status: 200 });
  }
}
