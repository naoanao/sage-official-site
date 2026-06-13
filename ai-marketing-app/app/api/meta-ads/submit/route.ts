import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 出稿前コンプライアンス事前審査（2026 Metaポリシー準拠）
// 個人属性の暗示 / 非現実的成果・保証 / 制限カテゴリ / 根拠なき最上級 を検査。
// blocked=true の場合は出稿を中止する（アカウントBAN・却下・信頼毀損を防ぐ）。
type PreflightIssue = { level: "block" | "warn"; reason: string };
function preflightCompliance(ad_copy: Record<string, unknown> | null | undefined): { blocked: boolean; issues: PreflightIssue[] } {
  const ac = ad_copy || {};
  const cards = Array.isArray((ac as { carousel_cards?: unknown }).carousel_cards)
    ? ((ac as { carousel_cards: Array<Record<string, unknown>> }).carousel_cards)
    : [];
  const parts: unknown[] = [
    ac.headline, ac.primary_text, (ac as Record<string, unknown>).primary_text_short,
    (ac as Record<string, unknown>).primary_text_full, ac.description,
    ...cards.flatMap((c) => [c?.card_headline, c?.card_body]),
  ];
  const text = parts.filter(Boolean).map(String).join(" \n ");
  const issues: PreflightIssue[] = [];

  const personalAttr: RegExp[] = [
    /(diabet|blood sugar|depress|anxiet|overweight|obes|\bstd\b|hiv|cancer|addict|bankrupt|in debt|divorc|infertil|erectile)/i,
    /(糖尿|血糖|うつ病|不安障害|肥満|多額の借金|自己破産|離婚|不妊|薄毛|ＥＤ|ed治療)/,
    /(for people (with|managing|dealing)|those (with|dealing|struggling)|do you (have|suffer))/i,
    /(でお悩みの(あなた|方)|に悩んでいるあなた|な人のための|あなたは.*(ですか|でしょうか))/,
  ];
  if (personalAttr.some((r) => r.test(text))) issues.push({ level: "block", reason: "個人属性の暗示(健康/金銭/関係性)はMetaのPersonal Attributesポリシー違反になりやすい。一般的な訴求に書き換える。" });

  const unrealistic: RegExp[] = [
    /(guarantee|guaranteed|100%\s|risk[- ]?free|lose \d+\s?(kg|lbs|pounds)|in \d+\s?(days|hours)\b|double your|triple your|get rich|passive income|make \$?\d+[k]?\s*(a|per)?\s*(day|week|month))/i,
    /(必ず|確実に|100%|不労所得|誰でも稼げ|月収?\s*\d+\s*万|\d+日で痩|倍になる|絶対に)/,
  ];
  if (unrealistic.some((r) => r.test(text))) issues.push({ level: "block", reason: "非現実的な成果・保証・一攫千金の表現は誇大広告として制限対象。期待値を現実的にする。" });

  const restricted: RegExp[] = [
    /(crypto|bitcoin|\bnft\b|forex|\bcbd\b|cannabis|\bweed\b|gambl|casino|betting|weapon|\bgun\b|ammo|tobacco|\bvape\b|escort)/i,
    /(仮想通貨|暗号資産|ＦＸ|fx取引|カジノ|ギャンブル|大麻|武器|タバコ|アダルト)/,
  ];
  if (restricted.some((r) => r.test(text))) issues.push({ level: "block", reason: "制限/禁止カテゴリ(金融・薬物・ギャンブル・武器・タバコ等)は別途認可・審査が必要。" });

  const superlatives: RegExp[] = [
    /\b(best|cheapest|no\.?\s?1|#1|number one|world'?s best)\b/i,
    /(日本一|業界no\.?\s?1|最安値?|世界一|最高の)/,
  ];
  if (superlatives.some((r) => r.test(text))) issues.push({ level: "warn", reason: "根拠のない最上級(最安/No.1/日本一)は要証拠。証拠が無ければ表現を和らげる。" });

  // 根拠なき数値の成果主張（例「30%効果アップ」「売上2倍」）。捏造statを検知してWARN(自動ONを保留)。
  const unsupportedStats: RegExp[] = [
    /\d+\s*[%％]\s*(以上|アップ|UP|向上|改善|増加|増|削減|減|オフ|OFF|還元)/i,
    /(売上|集客|効果|成約|reach|sales|CV|cvr|roi|roas)[^。\n]{0,8}\d+\s*(倍|割|%|％)/i,
    /\b\d+%\s*(more|increase|boost|growth|higher|faster|cheaper|off)\b/i,
  ];
  if (unsupportedStats.some((r) => r.test(text))) issues.push({ level: "warn", reason: "数値の成果主張(〇%アップ/〇倍等)は実データの裏付けが必須。実績が無ければ削除し一般的な表現にする(虚偽広告・アカウントBAN回避)。" });

  return { blocked: issues.some((i) => i.level === "block"), issues };
}

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
      image_url,          // 任意: 顧客の実写真URL。あればAI画像より優先してクリエイティブに使う
      currency = "JPY",
      country,            // 例: "JP"（未指定なら lang から推定）
      lang,               // "ja" / "en"
      geo_locations,      // 任意: ローカル配信用 { cities:[{key,radius,distance_unit}] } や { custom_locations:[{latitude,longitude,radius,distance_unit}] }
      auto_activate = false, // true: AI自動審査を通過し安全上限内なら自動でONにする（手作業ゼロ運用）
      pixel_id,           // 任意: Meta Pixel ID。あればコンバージョン最適化に切替（クリックでなく登録/CVを買う）
      conversion_event = "LEAD", // pixel使用時の最適化イベント
    } = body;

    const { token: access_token, accountId: ad_account_id, pageId: resolvedPageId } =
      await getUserMetaConfig(device_id || "global");

    const effectivePageId = page_id || resolvedPageId;

    // コンバージョン最適化: Pixelが設定されていれば「クリック」でなく「CV(登録など)」を買う。
    // 未設定なら従来のトラフィック最適化に安全フォールバック（Pixel未導入でも壊れない）。
    const pixelId = pixel_id || process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || null;
    const useConversion = !!pixelId;

    if (!access_token || !ad_account_id) {
      return NextResponse.json({
        success: false,
        error: "Meta Ads credentials not configured. Please connect your Facebook account.",
        mock: true,
        message: "Meta広告アカウントが未接続です。Facebookアカウントを接続してください。",
      }, { status: 200 });
    }

    // 出稿前コンプライアンス審査（BlockならMetaに何も作らず中止）
    const preflight = preflightCompliance(ad_copy);
    if (preflight.blocked) {
      return NextResponse.json({
        success: false,
        blocked: true,
        message: "広告ポリシー違反の可能性が高いため、出稿を中止しました。コピーを修正してください。",
        issues: preflight.issues,
      }, { status: 200 });
    }

    // Step 1: キャンペーン作成
    const campaignRes = await fetch(`${BASE_URL}/${ad_account_id}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: `Growl_${new Date().toISOString().split("T")[0]}`,
        objective: useConversion ? "OUTCOME_LEADS" : "OUTCOME_TRAFFIC",
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
    const maxDaily = 50000; // 暴走防止のハード上限(¥50,000 / $500 相当/日)。急な大予算はMetaの不正検知も誘発する
    const budgetMinor = Math.min(maxDaily, Math.max(minDaily, Math.round(Number(daily_budget) * minorPerUnit)));

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
        // Pixelあり=コンバージョン最適化(登録などを買う) / なし=リンククリック最適化
        optimization_goal: useConversion ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        // コンバージョン最適化時は計測対象(pixel+イベント)を指定
        ...(useConversion ? { promoted_object: JSON.stringify({ pixel_id: pixelId, custom_event_type: conversion_event }) } : {}),
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

      // A0) 顧客の実写真(image_url)があれば最優先で使う（実写真>AI画像＝クリック2-3倍）
      if (image_url && typeof image_url === "string") {
        try {
          const imgRes = await fetch(image_url);
          if (imgRes.ok) {
            const ab = await imgRes.arrayBuffer();
            if (ab.byteLength > 0) imageBytes = Buffer.from(ab);
          }
        } catch {}
      }

      // A) 実写真が無ければ image_promptからFLUX.1-schnell（HuggingFace）でAI画像を生成
      const prompt = image_prompt || ad_copy.image_prompt_single;
      if (!imageBytes && prompt && process.env.HF_TOKEN) {
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

    // Step 5: AI自動審査→自動ON（auto_activate時のみ）。
    // 安全ガード: ①コンプラBlockなし ②警告(warn)ゼロ ③広告要素が揃っている
    // ④日予算が自動ON上限以内、を全て満たした場合のみ ACTIVE 化する。
    // それ以外はPAUSEDのまま保留し理由を返す（＝怪しいものだけ人が見る運用）。
    // 注: ACTIVE化してもMeta側の広告審査を通るまで配信は始まらない（二重チェック）。
    const AUTO_ACTIVATE_MAX = isZeroDecimal ? 1000 : 1000; // 自動ON時の日予算ハード上限(¥1,000 / $10相当)
    let finalStatus = "PAUSED";
    let auto_activated = false;
    let activation_note = "";
    const warnList = preflight.issues.filter((i) => i.level === "warn");
    if (auto_activate && ad_id && creative.id) {
      const structureOk = !!(ad_copy.headline && (ad_copy.primary_text_full || ad_copy.primary_text) && link_url);
      if (warnList.length > 0) {
        activation_note = "警告があるため自動ONせず保留しました（要確認）。";
      } else if (budgetMinor > AUTO_ACTIVATE_MAX) {
        activation_note = `日予算が自動ON上限(${AUTO_ACTIVATE_MAX})を超えるため保留しました。`;
      } else if (!structureOk) {
        activation_note = "広告要素(見出し/本文/リンク)が不足のため保留しました。";
      } else {
        try {
          await fetch(`${BASE_URL}/${campaign.id}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ status: "ACTIVE", access_token }) });
          await fetch(`${BASE_URL}/${adset.id}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ status: "ACTIVE", access_token }) });
          const actRes = await fetch(`${BASE_URL}/${ad_id}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ status: "ACTIVE", access_token }) });
          const act = await actRes.json();
          if (act && act.error) {
            activation_note = `自動ON失敗: ${act.error.message}（PAUSEDのままです）`;
          } else {
            finalStatus = "ACTIVE";
            auto_activated = true;
            activation_note = "AI自動審査を通過したため自動ONしました（Meta側の広告審査を通過後に配信開始）。";
          }
        } catch (e) {
          activation_note = `自動ON処理でエラー: ${String(e)}（PAUSEDのままです）`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      adset_id: adset.id,
      creative_id: creative.id,
      ad_id,
      status: finalStatus,
      auto_activated,
      activation_note,
      message: auto_activated
        ? "AI審査通過→自動ONしました。Meta審査を通れば配信されます。"
        : "広告を作成しました（一時停止中）。" + (activation_note || "Meta広告マネージャーで確認・有効化してください。"),
      manager_url: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${ad_account_id.replace("act_", "")}`,
      warnings: warnList,
      daily_budget_applied: budgetMinor,
    });

  } catch (err) {
    console.error("meta-ads/submit error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
