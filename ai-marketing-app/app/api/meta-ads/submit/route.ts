import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

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
      pageId: userToken.page_id || process.env.META_PAGE_ID || null,
    };
  }

  // フォールバック: app_configのグローバルトークン（後方互換）
  const { data: globalToken } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "meta_ads_access_token")
    .single();

  const raw = process.env.META_AD_ACCOUNT_ID || "";
  const accountId = raw ? (raw.startsWith("act_") ? raw : `act_${raw}`) : null;

  return {
    token: globalToken?.value || process.env.META_ADS_ACCESS_TOKEN || null,
    accountId,
    pageId: process.env.META_PAGE_ID || "173041465895454",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ad_copy, link_url, daily_budget = 500, page_id, device_id } = body;

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

    // Step 2: 広告セット作成
    const adsetRes = await fetch(`${BASE_URL}/${ad_account_id}/adsets`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: `Growl_AdSet_${new Date().toISOString().split("T")[0]}`,
        campaign_id: campaign.id,
        daily_budget: String(daily_budget * 10), // セント単位
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting: JSON.stringify({
          // Metaのアルゴリズム（Andromeda）がクリエイティブでターゲティングするため
          // geo_locationsは広くし、Metaに最適化を任せる
          geo_locations: { countries: ["JP", "US", "GB", "AU", "CA"] },
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

    // Step 3: 画像ハッシュ取得（Supabaseキャッシュ→なければアップロード）
    let imageHash: string | null = null;
    try {
      const { data: cachedHash } = await supabase
        .from("app_config").select("value").eq("key", `meta_img_hash_${ad_account_id}`).single();
      if (cachedHash?.value) {
        imageHash = cachedHash.value;
      } else {
        // Growlのデフォルト画像をMetaにアップロード
        const imgUrl = "https://growl-app.vercel.app/og-ad-image.png";
        const imgRes = await fetch(imgUrl);
        const imgBlob = await imgRes.blob();
        const formData = new FormData();
        formData.append("filename", new Blob([await imgBlob.arrayBuffer()], { type: "image/png" }), "growl_ad.png");
        formData.append("access_token", access_token);
        const uploadRes = await fetch(`${BASE_URL}/${ad_account_id}/adimages`, { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        const images = uploadData.images || {};
        imageHash = Object.values(images as Record<string, { hash: string }>)[0]?.hash || null;
        if (imageHash) {
          await supabase.from("app_config").upsert({ key: `meta_img_hash_${ad_account_id}`, value: imageHash, updated_at: new Date().toISOString() });
        }
      }
    } catch {}

    // クリエイティブ本文：primary_text_full（フルストーリー）を優先
    const adText = ad_copy.primary_text_full || ad_copy.primary_text || "";

    // Step 4: クリエイティブ作成
    const linkData: Record<string, unknown> = {
      message: adText,
      link: link_url || "https://growl-app.vercel.app",
      name: ad_copy.headline,
      description: ad_copy.description || "",
      call_to_action: {
        type: ad_copy.cta || "LEARN_MORE",
        value: { link: link_url || "https://growl-app.vercel.app" },
      },
    };
    if (imageHash) {
      linkData.image_hash = imageHash;
    } else {
      linkData.picture = "https://growl-app.vercel.app/og-ad-image.png";
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
