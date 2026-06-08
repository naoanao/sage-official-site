import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.TIKTOK_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://ai-marketing-app-blush.vercel.app";
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id") || "global";

  if (!CLIENT_KEY) {
    return NextResponse.json({ error: "TIKTOK_CLIENT_KEY not configured" }, { status: 500 });
  }

  const redirectUri = `${APP_URL}/api/auth/tiktok/callback`;
  const scope = "user.info.basic,video.upload"; // video.publish は Sandbox 非対応のため除外
  const state = encodeURIComponent(deviceId);

  const authUrl =
    `https://www.tiktok.com/v2/auth/authorize/` +
    `?client_key=${CLIENT_KEY}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}`;

  return NextRespo