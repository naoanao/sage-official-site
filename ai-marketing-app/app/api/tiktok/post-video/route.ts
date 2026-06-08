import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PostVideoBody {
  device_id: string;
  video_url: string;
  title?: string;
  privacy_level?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
  disable_duet?: boolean;
  disable_stitch?: boolean;
  disable_comment?: boolean;
  direct_post?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: PostVideoBody = await req.json();
    const {
      device_id,
      video_url,
      title = "",
      privacy_level = "SELF_ONLY",
      disable_duet = false,
      disable_stitch = false,
      disable_comment = false,
      direct_post = false,
    } = body;

    if (!device_id || !video_url) {
      return NextResponse.json(
        { error: "device_id and video_url are required" },
        { status: 400 }
      );
    }

    const { data: tokenRow, error: dbError } = await supabase
      .from("user_tiktok_tokens")
      .select("access_token, expires_at")
      .eq("device_id", device_id)
      .single();

    if (dbError || !tokenRow) {
      return NextResponse.json({ error: "TikTok not connected" }, { status: 401 });
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "TikTok token expired. Please reconnect." }, { status: 401 });
    }

    const accessToken = tokenRow.access_token;

    const endpoint = direct_post
      ? "https://open.tiktokapis.com/v2/post/publish/video/init/"
      : "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";

    const postBody: Record<string, unknown> = {
      post_info: {
        title: title.slice(0, 2200),
        privacy_level,
        disable_duet,
        disable_stitch,
        disable_comment,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url,
      },
    };

    if (direct_post) {
      postBody.post_mode = "DIRECT_POST";
    }

    const postRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(postBody),
    });

    const postData = await postRes.json();

    if (postData.error?.code && postData.error.code !== "ok") {
      console.error("TikTok post error:", postData);
      return NextResponse.json({ error: postData.error.message, detail: postData }, { status: 400 });
    }

    const publishId = postData.data?.publish_id;

    await supabase.from("tiktok_post_log").insert({
      device_id,
      publish_id: publishId,
      video_url,
      title,
      direct_post,
      status: direct_post ? "published" : "uploaded_to_inbox",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      publish_id: publishId,
      mode: direct_post ? "direct_post" : "upload_to_inbox",
    });
  } catch (err) {
    console.error("TikTok post-video error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
