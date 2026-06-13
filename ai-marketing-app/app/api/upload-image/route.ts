import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// 顧客の実写真アップロード用。base64を受け取り imgbb にアップして公開URLを返す。
// 実写真はAI画像よりクリック2-3倍。返ったURLを広告生成/入稿に渡し、Metaクリエイティブの主素材にする。
export async function POST(req: NextRequest) {
  try {
    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return NextResponse.json({ success: false, error: "image_base64 required" }, { status: 400 });
    }
    const key = process.env.IMGBB_API_KEY;
    if (!key) return NextResponse.json({ success: false, error: "IMGBB_API_KEY 未設定" }, { status: 500 });

    const b64 = image_base64.replace(/^data:image\/\w+;base64,/, "");
    // ざっくりサイズガード（~8MB）
    if (b64.length > 11_000_000) return NextResponse.json({ success: false, error: "画像が大きすぎます(8MB以下)" }, { status: 400 });

    const form = new URLSearchParams();
    form.append("image", b64);
    const r = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: "POST", body: form });
    const d = await r.json();
    if (!d?.success || !d?.data?.url) {
      return NextResponse.json({ success: false, error: d?.error?.message || "アップロード失敗" }, { status: 400 });
    }
    return NextResponse.json({ success: true, url: d.data.url });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
