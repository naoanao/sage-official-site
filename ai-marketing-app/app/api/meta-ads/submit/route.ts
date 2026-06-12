import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// device_idごとのトークン・ページ・広告アカウントを取得
async function getUserMetaConfig(deviceId: string): Promise<{
  token: string | null;
  accountId: string | null;
  pageId: string | null;
}> {
  // user_meta_tokensテーブルから取得（正規）
  const { data: userToken } = await supabase
    .from("user_meta_tokens")
    .select("access_token, page_id, ad_account_id")
    .eq("device_id", deviceId)
    .single();

  if (userToken?.access_token) {
    const accountId = userToken.ad_account_id
      ? (userToken.ad_account_id.startsWith("act_") ? userToken.ad_account_id : `act_${userToken.ad_account_id}`)
      : null;
    return {
      token: userToken.access_token,
      accountId,
      pageId: userToken.page_id || null,
    };
  }

  // OAuth必須: グローバル共有トークン/env フォールバックは廃止。
  // 各ユーザーが自分のMetaアカウントを接続していない場合は未接続として扱い、
  // 呼び出し側は「Facebookを接続してください」を返す（他人の口座への誤出稿・共有トークン汚染を防ぐ）。
  return { token: null, accountId: null, pageId: null };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ad_copy, link_url, daily_budget = 500, page_id, device_id, image_prompt,
      currency = "JPY",
      country,            // 例: "JP"（未指定なら lang から推定）
      lang,               // "ja" / "en"
      geo_locations,      // 任意: ローカル配信用 { cities:[{key,radius,distance_unit}] } や { custom_locations:[{latitude,longitude,radius,distance_unit}] }
    } = body;

    const { token: access_token, accountId: ad_account_id, pageId: resolvedPageId } =
      await getUserMetaConfig(device_id || "global");

    const effectivePageId = page_id || resolvedPageId;

    if (!access_token || !ad_account_id) {
      return NextResponse.json({
        success: false,
        error: "Meta Ads credentials not configured. Please connect your Facebook account.",
        mock: true,
        message: "Meta広告アカウントが未接続です。Facebookアカウントを接続してください。",
      }, { status: 200 });
    }

    // Step 1: キャンペーン作成
    const campaignRes = await fetch(`${BASE_URL}/${ad_account_id}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: `Growl_${new Date().toISOString().split("T")[0]}`,
        objective: "OUTCOME_TRAFFIC",
        status: "PAUSED",
        special_ad_categories: "[]",
        is_adset_budget_sharing_enabled: "false",
        access_token,
      }),
    });
    const campaign = await campaignRes.json();
    if (!campaign.id) {
      return NextResponse.json({ success: false, error: `Campaign creation failed: ${JSON.stringify(campaign)}` }, { status: 400 });
    }

    // 予算: Metaは「アカウント通貨の最小単位」で渡す。JPYは最小単位=円(×1)、USDはセント(×100)。
    // 旧コードの ×10 は通貨非対応のバグだったため、通貨別に正しく換算し最低額も担保する。
    const cur = String(currency).toUpperCase();
    const isZeroDecimal = ["JPY", "KRW", "VND", "CLP"].includes(cur); // 小数を持たない通貨
    const minorPerUnit = isZeroDecimal ? 1 : 100;
    const minDaily = isZeroDecimal ? 200 : 100; // 最低日予算の目安(¥200 / $1.00)
    const budgetMinor = Math.max(minDaily, Math.round(Number(daily_budget) * minorPerUnit));

    // ターゲティング: 地元の店舗向けにローカル配信。
    // 1) 呼び出し側が geo_locations（市区 or 緯度経度+半径）を渡せばそれを使う（最も精度が高い）。
    // 2) 無ければ言語/指定から単一国に絞る（旧コードの5カ国ばらまき＝広告費の無駄を廃止）。
    const fallbackCountry = (country || (String(lang).toLowerCase().startsWith("en") ? "US" : "JP")).toUpperCase();
    const targetingGeo = (geo_locations && typeof geo_locations === "object")
      ? geo_locations
      : { countries: [fallbackCountry] };

    // Step 2: 広告セット作成
    const adsetRes = await fetch(`${BASE_URL}/${ad_account_id}/adsets`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: `Growl_AdSet_${new Date().toISOString().split("T")[0]}`,
        campaign_id: campaign.id,
        daily_budget: String(budgetMinor), // アカウント通貨の最小単位
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting: JSON.stringify({
          geo_locations: targetingGeo, // ローカル配信（市区/半径）または単一国
          age_min: 18,
          age_max: 65,
          targeting_automation: { advantage_audience: 1 }, // Advantage+オーディエンスON
        }),
        status: "PAUSED",
        access_token,
      }),
    });
    const adset = await adsetRes.json();
    if (!adset.id) {
      return NextResponse.json({ success: false, error: `AdSet creation failed: ${JSON.stringify(adset)}` }, { status: 400 });
    }

    // Step 3: 画像生成 → Metaにアップロード → ハッシュ取得
    let imageHash: string | null = null;
    try {
      let imageBytes: Buffer | null = null;

      // A) image_promptがあればFLUX.1-schnell（HuggingFace）で商品特化画像を生成
      const prompt = image_prompt || ad_copy.image_prompt_single;
      if (prompt && process.env.HF_TOKEN) {
        try {
          const hfRes = await fetch(
            "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                inputs: `High quality Meta ad photo. ${prompt}. Photorealistic, professional, no text overlays, bright natural lighting, landscape 16:9 format.`,
              }),
            }
          );
          if (hfRes.ok) {
            const contentType = hfRes.headers.get("content-type") || "";
            if (contentType.includes("image")) {
              const arrayBuffer = await hfRes.arrayBuffer();
              imageBytes = Buffer.from(arrayBuffer);
            }
          }
        } catch {}
      }

      // B) 生成できなければキャッシュ済みハッシュを使用
      if (!imageBytes) {
        const { data: cachedHash } = await supabase
          .from("app_config").select("value").eq("key", `meta_img_hash_${ad_account_id}`).single();
        if (cachedHash?.value) {
          imageHash = cachedHash.value;
        }
      }

      // C) 画像バイトがあればMetaにアップロード
      if (imageBytes && !imageHash) {
        const formData = new FormData();
        formData.append("filename", new Blob([imageBytes], { type: "image/png" }), "ad_image.png");
        formData.append("access_token", access_token);
        const uploadRes = await fetch(`${BASE_URL}/${ad_account_id}/adimages`, { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        const images = uploadData.images || {};
        imageHash = (Object.values(images as Record<string, { hash: string }>)[0])?.hash || null;
        // キャッシュ（Gemini生成は毎回異なるのでキャッシュしない）
      }

      // D) どれも失敗した場合はデフォルトをアップロード
      if (!imageHash) {
        const { data: cachedHash } = await supabase
          .from("app_config").select("value").eq("key", `meta_img_hash_${ad_account_id}`).single();
        imageHash = cachedHash?.value || null;
      }
    } catch {}

    // クリエイティブ本文：primary_text_full（フルストーリー）を優先
    const adText = ad_copy.primary_text_full || ad_copy.primary_text || "";

    // Step 4: クリエイティブ作成
    const linkData: Record<string, unknown> = {
      message: adText,
      link: link_url || "https://growl-ai.com",
      name: ad_copy.headline,
      description: ad_copy.description || "",
      call_to_action: {
        type: ad_copy.cta || "LEARN_MORE",
        value: { link: link_url || "https://growl-ai.com" },
      },
    };
    if (imageHash) {
      linkData.image_hash = imageHash;
    } else {
      linkData.picture = "https://growl-ai.com/og-ad-image.png";
    }

    const creativePayload: Record<string, string> = {
      name: `Growl_Creative_${Date.now()}`,
      object_story_spec: JSON.stringify({ page_id: effectivePageId, link_data: linkData }),
      access_token,
    };

    const creativeRes = await fetch(`${BASE_URL}/${ad_account_id}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(creativePayload),
    });
    const creative = await creativeRes.json();

    // Step 4: 広告作成（PAUSED状態）
    let ad_id = null;
    if (creative.id) {
      const adRes = await fetch(`${BASE_URL}/${ad_account_id}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          name: ad_copy.headline,
          adset_id: adset.id,
          creative: JSON.stringify({ creative_id: creative.id }),
          status: "PAUSED",
          access_token,
        }),
      });
      const ad = await adRes.json();
      ad_id = ad.id;
    }

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      adset_id: adset.id,
      creative_id: creative.id,
      ad_id,
      status: "PAUSED",
      message: "広告を作成しました（一時停止中）。Meta広告マネージャーで確認・有効化してください。",
      manager_url: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${ad_account_id.replace("act_", "")}`,
    });

  } catch (err) {
    console.error("meta-ads/submit error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
