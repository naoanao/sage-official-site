"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { loadProofData, saveProofData, loadUserId } from "@/lib/store";
import { buildAgencyUrl, buildAgencyFullUrl } from "@/lib/stripe-config";

interface AdCopy {
  headline: string;
  primary_text: string;
  primary_text_short?: string;
  primary_text_full?: string;
  description: string;
  cta: string;
  target_audience: string | Record<string, unknown>;
  image_prompt?: string;
  image_prompt_single?: string;
  framework?: string;
  hook_type?: string;
  carousel_cards?: Array<{ card_headline: string; card_body: string; card_image_prompt: string }>;
}

interface AdBoostCardProps {
  session: {
    industry?: string;
    business_desc?: string;
    customer_desc?: string;
    main_problem?: string;
    final_goal?: string;
    booking_url?: string;
  };
  lang?: string;
  locale?: "us" | "uk" | "au" | "ca" | "jp" | "global";
}

export default function AdBoostCard({ session, lang = "en", locale }: AdBoostCardProps) {
  const [step, setStep] = useState<"idle" | "generating" | "preview" | "submitting" | "done" | "error" | "update-token" | "request" | "requested">("idle");
  const [reqEmail, setReqEmail] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [reqBusy, setReqBusy] = useState(false);
  const [reqErr, setReqErr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imgBusy, setImgBusy] = useState(false);

  // 顧客の実写真をアップロード→imgbb URL取得（広告画像の主素材に）
  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    try {
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/upload-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64 }),
      });
      const data = await resp.json();
      if (data.success) setImageUrl(data.url);
    } catch { /* ignore */ }
    setImgBusy(false);
  }
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null);
  const [result, setResult] = useState<{ message?: string; manager_url?: string; error?: string } | null>(null);
  const [budget, setBudget] = useState(500);
  const [newToken, setNewToken] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenMsg, setTokenMsg] = useState("");
  // 広告強化データ
  const [showEnhance, setShowEnhance] = useState(false);
  const [proofNumbers, setProofNumbers] = useState("");
  const [customerQuote, setCustomerQuote] = useState("");
  const [priceOrOffer, setPriceOrOffer] = useState("");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const proof = loadProofData();
    if (proof.proof_numbers) setProofNumbers(proof.proof_numbers);
    if (proof.customer_quote) setCustomerQuote(proof.customer_quote);
    if (proof.price_or_offer) setPriceOrOffer(proof.price_or_offer);
    if (proof.proof_numbers || proof.customer_quote || proof.price_or_offer) {
      setShowEnhance(true);
    }
    setDeviceId(loadUserId());
  }, []);
  const isEn = lang === "en";

  async function handleSaveToken() {
    setTokenSaving(true);
    setTokenMsg("");
    try {
      const res = await fetch("/api/admin/update-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ token: newToken, secret: adminSecret }),
      });
      const data = await res.json();
      if (data.success) {
        setTokenMsg("✅ Token saved! Try again.");
        setTimeout(() => { setStep("idle"); setNewToken(""); setTokenMsg(""); }, 2000);
      } else {
        setTokenMsg("❌ " + (data.error || "Failed"));
      }
    } catch (e) {
      setTokenMsg("❌ " + String(e));
    }
    setTokenSaving(false);
  }

  async function handleGenerate() {
    setStep("generating");
    try {
      const res = await fetch("/api/meta-ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: session.industry,
          business_desc: session.business_desc,
          customer_desc: session.customer_desc,
          main_problem: session.main_problem,
          goal: session.final_goal,
          lang,
          locale: locale || (lang === "en" ? "us" : "jp"),
          booking_url: session.booking_url || undefined,
          // 広告強化データ（入力済みのみ渡す）
          proof_numbers: proofNumbers.trim() || undefined,
          customer_quote: customerQuote.trim() || undefined,
          price_or_offer: priceOrOffer.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.ad_copy) {
        setAdCopy(data.ad_copy);
        setWarnings(data.warnings || []);
        setStep("preview");
      } else {
        setResult({ error: String(data.error || "Generation failed") });
        setStep("error");
      }
    } catch (e) {
      setResult({ error: String(e) });
      setStep("error");
    }
  }

  async function handleSubmit() {
    if (!adCopy) return;
    setStep("submitting");
    try {
      const res = await fetch("/api/meta-ads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_copy: adCopy,
          link_url: "https://growl-ai.com/start",
          daily_budget: budget,
          device_id: deviceId || "global",
          image_prompt: adCopy.image_prompt_single || adCopy.image_prompt || null,
          image_url: imageUrl || undefined,
          lang: isEn ? "en" : "ja",
          currency: isEn ? "USD" : "JPY",
        }),
      });
      const data = await res.json();
      // Normalize result fields to strings to prevent React Error #31
      setResult({
        success: data.success,
        campaign_id: data.campaign_id,
        message: data.message ? String(data.message) : undefined,
        manager_url: data.manager_url ? String(data.manager_url) : undefined,
        error: data.error !== undefined ? String(data.error) : undefined,
        mock: data.mock,
      } as typeof data);
      if (data.mock || (!data.success && !data.campaign_id)) {
        setStep("error");
      } else {
        setStep("done");
      }
    } catch (e) {
      setResult({ error: String(e) });
      setStep("error");
    }
  }

  // 「おまかせ代行」リクエスト送信（接続不要・なおが受注対応）
  async function handleRequest(plan: "full" | "mgmt") {
    if (!reqEmail.includes("@")) { setReqErr(isEn ? "Enter a valid email." : "有効なメールを入力してください。"); return; }
    setReqBusy(true); setReqErr("");
    try {
      const res = await fetch("/api/agency/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, email: reqEmail.trim(), note: reqNote.trim() || undefined, ad_copy: adCopy, session, budget, lang, plan, image_url: imageUrl || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        // 申込を保存できたらプラン別の決済ページへ（支払い→AIが自動で広告を配信）
        const id = deviceId || "global";
        window.location.href = plan === "full" ? buildAgencyFullUrl(id) : buildAgencyUrl(id);
      } else { setReqErr(String(data.error || "Failed")); }
    } catch (e) { setReqErr(String(e)); }
    setReqBusy(false);
  }

  return (
    <div className="mt-6 rounded-2xl overflow-hidden shadow-sm border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="px-5 py-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📣</span>
          <p className="font-bold text-gray-900 text-sm">
            {isEn ? "Boost with Meta Ads" : "Meta広告で集客する"}
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {isEn
            ? "AI generates your ad — then Growl can launch & manage it for you (done-for-you)."
            : "AIがあなたの広告を生成。配信・運用までGrowlにおまかせ（代行）も可能です。"}
        </p>

        {/* idle: 生成ボタン */}
        {step === "idle" && (
          <div className="space-y-3">
            {/* 広告強化パネル */}
            <button
              onClick={() => setShowEnhance(!showEnhance)}
              className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-xl text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-all"
            >
              <span>✨ {isEn ? "Enhance ad quality (optional)" : "広告の質を上げる（任意）"}</span>
              <span>{showEnhance ? "▲" : "▼"}</span>
            </button>
            {showEnhance && (
              <div className="space-y-2 bg-indigo-50 rounded-xl p-3">
                <div>
                  <label className="text-xs font-bold text-indigo-600">
                    📊 {isEn ? "Proof / Numbers" : "実績・数字"}
                  </label>
                  <input
                    type="text"
                    value={proofNumbers}
                    onChange={(e) => { setProofNumbers(e.target.value); saveProofData({ proof_numbers: e.target.value }); }}
                    placeholder={isEn ? "300+ clients, 3x ROI..." : "300社導入、CVR3倍..."}
                    className="mt-1 w-full border border-indigo-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600">
                    💬 {isEn ? "Customer quote" : "お客様の声"}
                  </label>
                  <input
                    type="text"
                    value={customerQuote}
                    onChange={(e) => { setCustomerQuote(e.target.value); saveProofData({ customer_quote: e.target.value }); }}
                    placeholder={isEn ? "Changed my business in 30 days..." : "30日で売上2倍になりました..."}
                    className="mt-1 w-full border border-indigo-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600">
                    💰 {isEn ? "Price / Offer" : "価格・オファー"}
                  </label>
                  <input
                    type="text"
                    value={priceOrOffer}
                    onChange={(e) => { setPriceOrOffer(e.target.value); saveProofData({ price_or_offer: e.target.value }); }}
                    placeholder={isEn ? "Free first month, from $29/mo..." : "初月無料、月額980円〜..."}
                    className="mt-1 w-full border border-indigo-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
              </div>
            )}
            {/* 実写真アップロード（あればAI画像より優先＝クリック2-3倍） */}
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <label className="text-xs font-bold text-amber-700">
                📷 {isEn ? "Your real photo (recommended — 2-3x more clicks)" : "実物の写真（推奨・クリック2-3倍）"}
              </label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="mt-1 block w-full text-xs text-gray-600" />
              {imgBusy && <p className="text-xs text-amber-600 mt-1">{isEn ? "Uploading..." : "アップロード中..."}</p>}
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="uploaded" className="mt-2 rounded-lg max-h-24 object-cover" />
              )}
            </div>
            <button
              onClick={handleGenerate}
              className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
            >
              {isEn ? "✨ Generate Ad Copy" : "✨ 広告文を生成する"}
            </button>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              {isEn
                ? "Generating is free. Want it launched & optimized for you? Growl runs it on your behalf — no setup needed."
                : "生成は無料。配信・最適化までおまかせしたい方へ → Growlが代わりに運用します（接続作業は不要）。"}
            </p>
          </div>
        )}

        {/* generating */}
        {step === "generating" && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-600 font-medium">
              {isEn ? "Generating ad copy..." : "広告文を生成中..."}
            </span>
          </div>
        )}

        {/* preview: 生成結果確認 */}
        {step === "preview" && adCopy && (
          <div className="space-y-3">
            {/* 常に表示する事実確認バナー */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-1">
                ⚠️ {isEn ? "Fact-check before publishing" : "公開前に必ず事実確認を"}
              </p>
              <p className="text-xs text-amber-600">
                {isEn
                  ? "AI generates copy from your input. Verify all numbers, claims, and quotes are accurate."
                  : "AIがあなたの入力から生成しました。数字・実績・お客様の声は公開前に必ず事実を確認してください。"}
              </p>
              {warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-xs text-red-600 font-medium">⚠️ {w}</li>
                  ))}
                </ul>
              )}
            </div>

            {(adCopy.framework || adCopy.hook_type) && (
              <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-500 mb-1">🧠 {isEn ? "Strategy" : "戦略"}</p>
                {adCopy.framework && <p className="text-xs text-indigo-700 mb-1">📐 {adCopy.framework}</p>}
                {adCopy.hook_type && <p className="text-xs text-indigo-600">🪝 {adCopy.hook_type}</p>}
              </div>
            )}

            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-1">{isEn ? "Headline" : "見出し"}</p>
              <p className="text-sm font-bold text-gray-900">{adCopy.headline}</p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-1">{isEn ? "Ad Text (preview)" : "広告本文（プレビュー）"}</p>
              <p className="text-sm text-gray-700">{adCopy.primary_text_short || adCopy.primary_text}</p>
              {adCopy.primary_text_full && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-400 cursor-pointer">{isEn ? "▼ Full story copy" : "▼ フルストーリー本文"}</summary>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{adCopy.primary_text_full}</p>
                </details>
              )}
            </div>

            {adCopy.carousel_cards && adCopy.carousel_cards.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="text-xs font-bold text-blue-500 mb-2">🎠 {isEn ? "Carousel Cards" : "カルーセルカード"}</p>
                <div className="space-y-1">
                  {adCopy.carousel_cards.map((card, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs font-bold text-gray-800">{card.card_headline}</p>
                      <p className="text-xs text-gray-600">{card.card_body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-1">{isEn ? "Target Audience" : "ターゲット提案"}</p>
              <p className="text-xs text-gray-600">
                {typeof adCopy.target_audience === "object"
                  ? JSON.stringify(adCopy.target_audience)
                  : adCopy.target_audience}
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-500 mb-2">{isEn ? "Daily Budget" : "1日の予算"}</p>
              <div className="flex items-center gap-3">
                <input type="range" min={300} max={3000} step={100} value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))} className="flex-1" />
                <span className="text-sm font-bold text-gray-900 w-16 text-right">¥{budget.toLocaleString()}</span>
              </div>
            </div>

            {/* 主CTA: おまかせ代行（接続不要・推奨） */}
            <button onClick={() => setStep("request")}
              className="w-full bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200">
              🚀 {isEn ? "Have Growl launch & manage it (¥2,980/mo)" : "おまかせで配信（月¥2,980）"}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep("idle")}
                className="flex-1 bg-gray-100 text-gray-600 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-200 transition-all">
                {isEn ? "Regenerate" : "作り直す"}
              </button>
              <button onClick={handleSubmit}
                className="flex-1 bg-white border border-blue-200 text-blue-600 font-medium text-sm py-2.5 rounded-xl hover:bg-blue-50 active:scale-95 transition-all">
                {isEn ? "Run it myself (Paused)" : "自分で出す（停止）"}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {isEn ? "Recommended: let Growl run it for you. Or run it yourself in Meta Ads Manager." : "おすすめは「おまかせ」。自分で出す場合はMeta広告マネージャーで有効化します。"}
            </p>
          </div>
        )}

        {/* submitting */}
        {step === "submitting" && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-600 font-medium">
              {isEn ? "Submitting to Meta..." : "Meta広告に送信中..."}
            </span>
          </div>
        )}

        {/* done: 作成成功 */}
        {step === "done" && result && (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-bold text-green-700">{isEn ? "Ad Created!" : "広告を作成しました！"}</p>
              <p className="text-xs text-green-600 mt-1">{result.message}</p>
              {result.campaign_id && (
                <p className="text-xs text-gray-500 mt-2 font-mono break-all">
                  Campaign ID: <span className="font-semibold text-gray-700">{result.campaign_id}</span>
                </p>
              )}
            </div>
            <a href={result.manager_url || "https://adsmanager.facebook.com"}
              target="_blank" rel="noopener noreferrer"
              className="block w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl text-center hover:bg-blue-700 transition-all">
              📊 {isEn ? "Check in Meta Ads Manager" : "Meta広告マネージャーで確認"}
            </a>
            <p className="text-xs text-gray-400 text-center">
              {isEn ? "Ad is PAUSED. Turn it ON when ready to go live." : "広告は一時停止中です。確認したらONにして配信を開始してください。"}
            </p>
            <button onClick={() => { setStep("idle"); setResult(null); }}
              className="w-full bg-gray-100 text-gray-600 font-medium text-sm py-2 rounded-xl hover:bg-gray-200 transition-all">
              {isEn ? "Create another ad" : "別の広告を作る"}
            </button>
          </div>
        )}

        {/* error */}
        {step === "error" && result && (
          <div className="space-y-3">
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-sm font-bold text-red-600 mb-1">❌ {isEn ? "Error" : "エラー"}</p>
              <p className="text-xs text-red-500">{result.error}</p>
            </div>
            <button onClick={() => setStep("idle")}
              className="w-full bg-gray-100 text-gray-600 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-200 transition-all">
              {isEn ? "Try again" : "もう一度試す"}
            </button>
            {result.error?.includes("credentials") && (
              <a
                href={`mailto:contact@growl-ai.com?subject=${encodeURIComponent(isEn ? "Run my ad for me (Growl)" : "広告の配信代行を希望（Growl）")}&body=${encodeURIComponent((adCopy?.headline ? `Headline: ${adCopy.headline}\n` : "") + (isEn ? "Please launch and manage this ad for me." : "この広告の配信・運用をおまかせしたいです。"))}`}
                className="block w-full bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl text-center hover:bg-indigo-700 transition-all">
                🚀 {isEn ? "Have Growl launch & manage it for you" : "配信はGrowlにおまかせ（代行を依頼）"}
              </a>
            )}
          </div>
        )}

        {/* request: おまかせ代行の申込フォーム */}
        {step === "request" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-900">{isEn ? "Let Growl run it for you" : "Growlにおまかせで配信"}</p>
            <p className="text-xs text-gray-500">
              {isEn ? "Enter your email, then pick a plan. Full auto includes the ad budget and starts automatically after payment; management-only is cheaper but you provide the ad budget. No Facebook setup needed." : "メールを入力してプランを選んでください。『全自動』は広告費込みで、支払い後すぐAIが配信を開始。『管理だけ』は安価ですが広告費は別途。Facebookの接続作業は不要です。"}
            </p>
            <input type="email" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)}
              placeholder={isEn ? "your@email.com" : "メールアドレス"}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            <textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} rows={2}
              placeholder={isEn ? "Anything we should know? (optional)" : "ご要望など（任意）"}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 resize-none" />
            {reqErr && <p className="text-xs text-red-500">{reqErr}</p>}
            <button onClick={() => handleRequest("full")} disabled={reqBusy}
              className="w-full bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 active:scale-95 transition-all shadow-lg shadow-indigo-200">
              {reqBusy ? "..." : (isEn ? "Full auto — ad budget included (¥9,800/mo)" : "全自動でおまかせ（広告費込み・月¥9,800）")}
            </button>
            <button onClick={() => handleRequest("mgmt")} disabled={reqBusy}
              className="w-full bg-white border border-indigo-200 text-indigo-700 font-medium text-sm py-2.5 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-all">
              {isEn ? "Management only (¥2,980/mo — you fund the ad budget)" : "管理だけ（月¥2,980・広告費は別途）"}
            </button>
            <button onClick={() => setStep("preview")}
              className="w-full text-gray-500 font-medium text-xs py-2 rounded-xl hover:bg-gray-100 transition-all">
              {isEn ? "Back" : "戻る"}
            </button>
          </div>
        )}

        {/* requested: 受付完了 */}
        {step === "requested" && (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-bold text-green-700">{isEn ? "Request received!" : "ご依頼を受け付けました！"}</p>
              <p className="text-xs text-green-600 mt-1">
                {isEn ? "We'll review your ad and get back to you. Growl handles the rest." : "内容を確認し、ご連絡します。あとはGrowlにおまかせください。"}
              </p>
            </div>
            <button onClick={() => { setStep("idle"); setReqEmail(""); setReqNote(""); }}
              className="w-full bg-gray-100 text-gray-600 font-medium text-sm py-2 rounded-xl hover:bg-gray-200 transition-all">
              {isEn ? "Done" : "閉じる"}
            </button>
          </div>
        )}

        {/* update-token（管理者専用フォールバック。通常ユーザーはOAuth接続を使う） */}
        {step === "update-token" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{isEn ? "Admin only. Regular users: use \"Connect your Facebook account\" instead." : "管理者専用です。通常は「Facebookアカウントを接続」をご利用ください。"}</p>
            <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)}
              placeholder={isEn ? "Admin secret" : "管理者シークレット"}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-400" />
            <p className="text-xs text-gray-600">{isEn ? "Paste your new Meta access token:" : "新しいMetaアクセストークンを貼り付けてください:"}</p>
            <textarea value={newToken} onChange={e => setNewToken(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-400 resize-none" />
            {tokenMsg && <p className="text-xs text-center">{tokenMsg}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep("idle")}
                className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-xl hover:bg-gray-200 transition-all">
                {isEn ? "Cancel" : "キャンセル"}
              </button>
              <button onClick={handleSaveToken} disabled={tokenSaving}
                className="flex-1 bg-blue-600 text-white font-bold text-sm py-2 rounded-xl hover:bg-blue-700 disabled:bg-gray-200 transition-all">
                {tokenSaving ? "..." : (isEn ? "Save" : "保存")}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
