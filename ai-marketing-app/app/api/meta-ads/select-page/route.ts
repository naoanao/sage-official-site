import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { device_id, page_id, page_name, ad_account_id } = await req.json();
    if (!device_id || !page_id) {
      return NextResponse.json({ success: false, error: "device_id and page_id required" }, { status: 400 });
    }
    await supabase.from("user_meta_tokens").update({
      page_id,
      page_name: page_name || null,
      ad_account_id: ad_account_id || null,
      updated_at: new Date().toISOString(),
    }).eq("device_id", device_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
