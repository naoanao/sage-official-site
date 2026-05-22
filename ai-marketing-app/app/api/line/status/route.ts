import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_id");
  if (!deviceId) return NextResponse.json({ linked: false });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await db
    .from("users")
    .select("line_user_id")
    .eq("device_id", deviceId)
    .single();

  return NextResponse.json({ linked: !!data?.line_user_id });
}
