import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app";
    const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
    const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;

    export async function GET(req: NextRequest) {
      const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
          const error = searchParams.get("error");
            const state = searchParams.get("state");
              const deviceId = state ? decodeURIComponent(state) : "global";

                if (error) {
                    return NextResponse.redirect(`${APP_URL}/dashboard?tiktok_error=${error}`);
                      }
                        if (!code) {
                            return NextResponse.redirect(`${APP_URL}/dashboard?tiktok_error=no_code`);
                              }

                                try {
                                    const redirectUri = `${APP_URL}/api/auth/tiktok/callback`;

                                        const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
                                              method: "POST",
                                                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                                          body: new URLSearchParams({
                                                                  client_key: CLIENT_KEY,
                                                                          client_secret: CLIENT_SECRET,
                                                                                  code,
                                                                                          grant_type: "authorization_code",
                                                                                                  redirect_uri: redirectUri,
                                                                                                        }),
                                                                                                            });

                                                                                                                const tokenData = await tokenRes.json();

                                                                                                                    if (!tokenData.access_token) {
                                                                                                                          console.error("TikTok token exchange failed:", tokenData);
                                                                                                                                return NextResponse.redirect(`${APP_URL}/dashboard?tiktok_error=token_exchange_failed`);
                                                                                                                                    }

                                                                                                                                        const { access_token, refresh_token, open_id, scope, expires_in, refresh_expires_in } = tokenData;

                                                                                                                                            const userRes = await fetch(
                                                                                                                                                  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
                                                                                                                                                        { headers: { Authorization: `Bearer ${access_token}` } }
                                                                                                                                                            );
                                                                                                                                                                const userData = await userRes.json();
                                                                                                                                                                    const userInfo = userData.data?.user || {};

                                                                                                                                                                        await supabase.from("user_tiktok_tokens").upsert({
                                                                                                                                                                              device_id: deviceId,
                                                                                                                                                                                    access_token,
                                                                                                                                                                                          refresh_token: refresh_token || null,
                                                                                                                                                                                                open_id: open_id || userInfo.open_id || null,
                                                                                                                                                                                                      display_name: userInfo.display_name || null,
                                                                                                                                                                                                            avatar_url: userInfo.avatar_url || null,
                                                                                                                                                                                                                  scope: scope || null,
                                                                                                                                                                                                                        expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
                                                                                                                                                                                                                              refresh_expires_at: refresh_expires_in ? new Date(Date.now() + refresh_expires_in * 1000).toISOString() : null,
                                                                                                                                                                                                                                    updated_at: new Date().toISOString(),
                                                                                                                                                                                                                                        });

                                                                                                                                                                                                                                            return NextResponse.redirect(`${APP_URL}/dashboard?tiktok_connected=1`);
                                                                                                                                                                                                                                              } catch (err) {
                                                                                                                                                                                                                                                  console.error("TikTok OAuth callback error:", err);
                                                                                                                                                                                                                                                      return NextResponse.redirect(`${APP_URL}/dashboard?tiktok_error=${encodeURIComponent(String(err))}`);
                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                        }