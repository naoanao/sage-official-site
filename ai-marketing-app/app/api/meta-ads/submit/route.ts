import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ad_copy, link_url, daily_budget = 500, page_id } = body;

    const access_token = process.env.META_ADS_ACCESS_TOKEN;
    const ad_account_id = process.env.META_AD_ACCOUNT_ID;

    if (!access_token || !ad_account_id) {
      return NextResponse.json({
        success: false,
        error: "Meta Ads credentials not configured",
        mock: true,
        message: "広告の準備ができました。Meta広告マネージャーで確認してください。",
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
        access_token,
      }),
    });
    const campaign = await campaignRes.json();
    if (!campaign.id) {
      return NextResponse.json({ success: false, error: campaign }, { status: 400 });
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
        targeting: JSON.stringify({
          geo_locations: { countries: ["JP"] },
          age_min: 25,
          age_max: 55,
        }),
        status: "PAUSED",
        access_token,
      }),
    });
    const adset = await adsetRes.json();
    if (!adset.id) {
      return NextResponse.json({ success: false, error: adset }, { status: 400 });
    }

    // Step 3: クリエイティブ作成
    const creativePayload: Record<string, string> = {
      name: `Growl_Creative_${Date.now()}`,
      object_story_spec: JSON.stringify({
        page_id: page_id || process.env.META_PAGE_ID || "100969749629377",
        link_data: {
          message: ad_copy.primary_text,
          link: link_url || "https://growl-app.vercel.app",
          name: ad_copy.headline,
          description: ad_copy.description,
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
