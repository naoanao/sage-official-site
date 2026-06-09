import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    export async function GET(req: NextRequest) {
      const deviceId = req.nextUrl.searchParams.get("device_id");

        if (!deviceId) {
            return NextResponse.json({ connected: false }, { status: 400 });
              }

                const { data, error } = await supabase
                    .from("user_tiktok_tokens")
                        .select("open_id, display_name, avatar_url, expires_at")
                            .eq("device_id", deviceId)
                                .single();

                                  if (error || !data) {
                                      return NextResponse.json({ connected: false });
                                        }

                                          const expired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
                                            if (expired) {
                                                return NextResponse.json({ connected: false, expired: true });
                                                  }

                                                    return NextResponse.json({
                                                        connected: true,
                                                            display_name: data.display_name,
                                                                avatar_url: data.avatar_url,
                                                                    open_id: data.open_id,
                                                                      });
                                                                      }