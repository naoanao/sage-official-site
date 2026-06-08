import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://growl-app.vercel.app";
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("device_id") || "global";

  const scope = "user.info.basic,video.publish,video.upload";
  const redirectUri = encodeURIComponent(`${APP_URL}/api/auth/tiktok/callback`);
  const state = encodeURIComponent(deviceId);

  const authUrl =
    `https://www.tiktok.com/v2/auth/authorize/` +
    `?client_key=${CLIENT_KEY}` +
    `&scope=${scope}` +
    `&response_type=code` +
    `&redirect_uri=${redirectUri}` +
    `&state=${state}`;

  return NextResponse.redirect(authUrl);
}
