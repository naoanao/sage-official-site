import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_id");
  const email = req.nextUrl.searchParams.get("email");

  const corsHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  try {
    if (deviceId) {
      const { data } = await supabase
        .from("users")
        .select("plan, email")
        .eq("device_id", deviceId)
        .single();

      if (data?.plan && data.plan !== "free") {
        return NextResponse.json({
          active: true,
          plan: data.plan,
          email: data.email || null,
        }, { headers: corsHeaders });
      }
    }

    if (email) {
      const { data } = await supabase
        .from("users")
        .select("plan, device_id")
        .eq("email", email)
        .single();

      if (data?.plan && data.plan !== "free") {
        return NextResponse.json({
          active: true,
          plan: data.plan,
          email,
        }, { headers: corsHeaders });
      }
    }

    return NextResponse.json({ active: false, plan: "free", reason: "not_found" }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ active: true, plan: "free", source: "fallback" }, { headers: corsHeaders });
  }
}
