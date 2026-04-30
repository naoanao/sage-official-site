import { NextRequest, NextResponse } from "next/server";
import { sendLineMessage, buildWeeklyNotificationText } from "@/lib/line";

// Vercel Cron: runs every Monday at 8am JST (Sunday 23:00 UTC)
// vercel.json: {"crons": [{"path": "/api/cron/notify", "schedule": "0 23 * * 0"}]}

export async function GET(req: NextRequest) {
  // Verify this is called from Vercel Cron (or with the correct secret)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: When Supabase is connected, fetch all active users with LINE IDs
  // and their pending actions, then send personalized notifications.
  //
  // Example (pseudocode):
  // const users = await supabase.from("users").select("*").not("line_user_id", "is", null);
  // for (const user of users) {
  //   const actions = await generateWeeklyActions(user.profile);
  //   const text = buildWeeklyNotificationText(user.business_name, actions);
  //   await sendLineMessage({ to: user.line_user_id, messages: [{ type: "text", text }] });
  // }

  console.log("Weekly LINE notification cron triggered");

  return NextResponse.json({
    status: "ok",
    message: "Cron executed. Supabase integration pending.",
    timestamp: new Date().toISOString(),
  });
}
