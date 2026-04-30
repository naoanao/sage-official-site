import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET ?? "";
  const hash = crypto
    .createHmac("SHA256", secret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events ?? [];

  for (const event of events) {
    if (event.type === "follow") {
      // User followed the LINE Official Account
      console.log("New LINE follower:", event.source?.userId);
      // TODO: Store userId in Supabase when credentials are connected
    }

    if (event.type === "message" && event.message?.type === "text") {
      const userId = event.source?.userId;
      const text = event.message.text;
      console.log(`Message from ${userId}: ${text}`);
      // Future: handle commands like "今週のタスク" etc.
    }
  }

  return NextResponse.json({ status: "ok" });
}
