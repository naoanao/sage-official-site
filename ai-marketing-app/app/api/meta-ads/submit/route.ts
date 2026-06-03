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
  const keys = [
    `meta_token_${deviceId}`,
    `meta_account_${deviceId}`,
    `meta_page_${deviceId}`,
    // フォールバック: グローバル（後方互換）
    "meta_ads_access_token",
  ];
  const { data } = await supabase.from("app_config").select("key,value").in("key", keys);
  const map: Record<string, string> = {};
  for (const row of data || []) map[row.key] = row.value;

  const token = map[`meta_token_${deviceId}`] || map["meta_ads_access_token"] || process.env.META_ADS_ACCESS_TOKEN || null;

  let accountId = map[`meta_account_${deviceId}`] || null;
  if (!accountId) {
    const raw = process.env.META_AD_ACCOUNT_ID || "";
    accountId = raw ? (raw.startsWith("act_") ? raw : `act_${raw}`) : null;
  } else {
    accountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  }

  let pageId = null;
  const pageJson = map[`meta_page_${deviceId}`];
  if (pageJson) {
    try { pageId = JSON.parse(pageJson).id; } catch {}
  }
  if (!pageId) pageId = process.env.META_PAGE_ID || "173041465895454";

  return { token, accountId, pageId };
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

    // Step 3: クリエイティブ作成
    const creativePayload: Record<string, string> = {
      name: `Growl_Creative_${Date.now()}`,
      object_story_spec: JSON.stringify({
        page_id: effectivePageId,
        link_data: {
          message: ad_copy.primary_text,
          link: link_url || "https://growl-app.vercel.app",
          name: ad_copy.headline,
          description: ad_copy.description,
          picture: "https://growl-app.vercel.app/og-ad-image.png",
          call_to_action: {
            type: ad_copy.cta || "LEARN_MORE",
            value: { link: link_url || "https://growl-app.vercel.app" },
          },
        },
      }),
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
