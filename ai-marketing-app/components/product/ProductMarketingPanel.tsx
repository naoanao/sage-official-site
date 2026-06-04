"use client";

/**
 * ProductMarketingPanel
 * ─────────────────────────────────────────────────────────────
 * AI that builds your sales funnel and retention system
 * ─────────────────────────────────────────────────────────────
 * Features:
 *   1. Product info form (5 fields)
 *   2. AI generates AEO, sales funnel & retention system
 *   3. View each content piece in tabs (copy-paste ready)
 *   4. Step emails & loyalty tactics also included
 */

import { useState } from "react";
import { useLang } from "@/lib/i18n";

interface ProductInput {
  name: string;
  category: "physical" | "digital" | "service" | "subscription";
  price: string;
  description: string;
  target: string;
  usp: string;
  purchase_url: string;
  industry: string;
  social_proof: string;
  limited_offer: string;
  competitor_diff: string;
}

interface StepEmail {
  day: number;
  subject: string;
  purpose: string;
  body: string;
}

interface LoyaltyStage {
  stage: string;
  condition: string;
  action: string;
  message: string;
}

interface AEOBlock {
  question: string;
  answer: string;
}

interface MarketingPlan {
  aeo: {
    faq_schema_jsonld: string;
    product_schema_jsonld: string;
    qa_blocks: AEOBlock[];
    meta_description: string;
    warnings?: string[];
  };
  funnel: {
    /** AIが競合分析の結果発見した独自の切り口（CoT Step1） */
    unique_angle?: string;
    /** 最大の購買障壁と反論コピー（CoT Step2） */
    objection_rebuttal?: string;
    attention: string;
    interest: string;
    search: string;
    action: string;
    share: string;
  };
  retention: {
    step_emails: StepEmail[];
    loyalty_stages: LoyaltyStage[];
    community_tactics: string[];
    vip_event_idea: string;
    ugc_campaign: string;
  };
  strategy_note: string;
  week_actions: Array<{ title: string; detail: string; content_type: string; role?: string; when_where?: string; content: string }>;
}

type TabKey = "actions" | "funnel" | "retention" | "aeo";

const ROLE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  "共感獲得": { label: "💗 Empathy",   bg: "bg-rose-50",   text: "text-rose-600"   },
  "行動促進": { label: "⚡ Action",    bg: "bg-amber-50",  text: "text-amber-600" },
  "信頼構築": { label: "🛡️ Trust",    bg: "bg-sky-50",    text: "text-sky-600"   },
};

function getCategoryLabels(isEn: boolean): Record<string, string> {
  return {
    physical: isEn ? "Physical Product" : "物理商品",
    digital: isEn ? "Digital Product (e-book, video, etc.)" : "デジタル商品（電子書籍・動画など）",
    service: isEn ? "Service / Treatment" : "サービス・施術",
    subscription: isEn ? "Subscription" : "サブスクリプション",
  };
}

function getIndustryOptions(isEn: boolean) {
  return [
    { value: "restaurant", label: isEn ? "Restaurant" : "飲食店" },
    { value: "salon", label: isEn ? "Beauty Salon" : "美容サロン" },
    { value: "ec", label: isEn ? "E-commerce" : "EC・通販" },
    { value: "professional", label: isEn ? "Consulting / Professional" : "士業・コンサル" },
    { value: "construction", label: isEn ? "Construction" : "工務店・建設" },
    { value: "other", label: isEn ? "Other" : "その他" },
  ];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
    >
      {copied ? "Copied! ✓" : "Copy"}
    </button>
  );
}

function ContentCard({ label, content }: { label: string; content: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <CopyButton text={content} />
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

export default function ProductMarketingPanel({ industry }: { industry?: string }) {
  const { lang } = useLang();
  const isEn = lang === "en";
  const CATEGORY_LABELS = getCategoryLabels(isEn);
  const INDUSTRY_OPTIONS = getIndustryOptions(isEn);

  const [form, setForm] = useState<ProductInput>({
    name: "",
    category: "physical",
    price: "",
    description: "",
    target: "",
    usp: "",
    purchase_url: "",
    industry: industry ?? "other",
    social_proof: "",
    limited_offer: "",
    competitor_diff: "",
  });
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("actions");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.description || !form.target || !form.usp) {
      setError(isEn ? "Product name, price, description, target, and USP are required." : "商品名・価格・説明・ターゲット・USPは必須項目です。");
      return;
    }
    setError(null);
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/product-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (isEn ? "Generation failed. Please try again." : "生成に失敗しました。もう一度お試しください。"));
      // API側のwarningsをplanのaeo.warningsにマージ
      if (data.plan && data.warnings?.length) {
        data.plan.aeo.warnings = data.warnings;
      }
      setPlan(data.plan);
      setActiveTab("actions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "actions", label: isEn ? "This Week's Actions" : "今週のアクション" },
    { key: "funnel", label: isEn ? "Sales Content" : "販売コンテンツ" },
    { key: "retention", label: isEn ? "Retention" : "リテンション" },
    { key: "aeo", label: isEn ? "AI Search" : "AI検索" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{isEn ? "Product Marketing AI" : "商品マーケティングAI"}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {isEn ? "Enter your product details and AI auto-generates a complete sales & retention system." : "商品情報を入力するだけで、AIが販売・リテンションシステムを自動生成します。"}
        </p>
      </div>

      {/* フォーム */}
      {!plan && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isEn ? "Product Name *" : "商品名 *"}</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={isEn ? "e.g. Organic Face Cream 30g" : "例：オーガニックフェイスクリーム 30g"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isEn ? "Category *" : "カテゴリ *"}</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isEn ? "Price (¥) *" : "価格（¥） *"}</label>
              <input
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                placeholder="3980"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isEn ? "Industry *" : "業種 *"}</label>
            <select
              name="industry"
              value={form.industry}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isEn ? "Product Description *" : "商品説明 *"}</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder={isEn ? "e.g. Moisturizer with pesticide-free rosehip oil. No preservatives or synthetic fragrances." : "例：農薬不使用ローズヒップオイル配合の保湿クリーム。防腐剤・合成香料不使用。"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEn ? "Target Customer *" : "ターゲット顧客 *"}
            </label>
            <input
              name="target"
              value={form.target}
              onChange={handleChange}
              placeholder={isEn ? "e.g. Women in their 30s–40s with skin concerns, interested in natural cosmetics" : "例：肌トラブルを抱える30〜40代女性、自然派コスメに興味がある"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEn ? "Unique Selling Point (USP) *" : "独自の強み（USP） *"}
            </label>
            <input
              name="usp"
              value={form.usp}
              onChange={handleChange}
              placeholder={isEn ? "e.g. Rosehip from our own domestic farm. Zero chemicals — safe for babies too." : "例：自社農場産ローズヒップ。完全無農薬・赤ちゃんにも安心。"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEn ? "Purchase / Booking URL (optional)" : "購入・予約URL（任意）"}
            </label>
            <input
              name="purchase_url"
              value={form.purchase_url}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEn ? "Social Proof / Results (optional)" : "実績・お客様の声（任意）"}
            </label>
            <textarea
              name="social_proof"
              value={form.social_proof}
              onChange={handleChange}
              rows={2}
              placeholder={isEn ? "e.g. 200+ users · 'Cut posting time by 90% in a week' reported" : "例：200名以上が利用・「1週間で投稿時間が90%削減」との声"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEn ? "One-line difference vs. competitors (optional)" : "競合との違い一言（任意）"}
            </label>
            <input
              name="competitor_diff"
              value={form.competitor_diff}
              onChange={handleChange}
              placeholder={isEn ? "e.g. Unlike other AI tools, generates everything from social posts to blog in one go." : "例：他のAIツールと違い、SNS投稿からブログまで一括生成。"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEn ? "Limited Offer (optional)" : "期間限定オファー（任意）"}
            </label>
            <input
              name="limited_offer"
              value={form.limited_offer}
              onChange={handleChange}
              placeholder={isEn ? "e.g. Buy this month and get the first month free! Or 20% off." : "例：今月購入で初月無料！20%オフキャンペーン中。"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? (isEn ? "Generating marketing plan..." : "マーケティングプランを生成中...") : (isEn ? "Generate Marketing Plan" : "マーケティングプランを生成する")}
          </button>
        </div>
      )}

      {/* 結果表示 */}
      {plan && (
        <div>
          {/* Strategy note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-blue-600 mb-1">{isEn ? "This Week's Strategy" : "今週の戦略"}</p>
            <p className="text-sm text-blue-800">{plan.strategy_note}</p>
          </div>

          {/* AI分析の種明かし */}
          {(plan.funnel.unique_angle || plan.funnel.objection_rebuttal) && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
                🧠 {isEn ? "AI Analysis Process" : "AI分析プロセス"}
              </p>
              {plan.funnel.unique_angle && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-indigo-500 mb-1">
                    💡 {isEn ? "Unique angle not used by competitors" : "競合が使っていない独自の切り口"}
                  </p>
                  <p className="text-sm text-indigo-900 bg-white/70 rounded-lg p-3 leading-relaxed">
                    {plan.funnel.unique_angle}
                  </p>
                </div>
              )}
              {plan.funnel.objection_rebuttal && (
                <div>
                  <p className="text-xs font-semibold text-purple-500 mb-1">
                    🛡️ {isEn ? "Top objection & rebuttal copy" : "最大の購買障壁と反論コピー"}
                  </p>
                  <p className="text-sm text-purple-900 bg-white/70 rounded-lg p-3 leading-relaxed">
                    {plan.funnel.objection_rebuttal}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* タブ */}
          <div className="flex border-b border-gray-200 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* This week's actions */}
          {activeTab === "actions" && (
            <div className="space-y-3">
              {plan.week_actions.map((action, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-medium">
                          {i + 1} / {plan.week_actions.length}
                        </span>
                        {action.role && ROLE_STYLES[action.role] && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_STYLES[action.role].bg} ${ROLE_STYLES[action.role].text}`}>
                            {ROLE_STYLES[action.role].label}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mt-0.5">{action.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{action.detail}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded whitespace-nowrap">
                        {action.content_type}
                      </span>
                      {action.when_where && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded whitespace-nowrap">
                          {action.when_where}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">{isEn ? "Copy-paste text" : "コピペ文章"}</span>
                      <CopyButton text={action.content} />
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {action.content}
                    </p>
                  </div>
                  {/* Fact-check banner */}
                  <div className="flex items-start gap-2 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-amber-500 text-xs mt-0.5 shrink-0">⚠️</span>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {isEn ? "Before copying: Verify no fictional product names, services, or campaigns are included." : "コピー前に確認：実在しない商品名・サービス・キャンペーンが含まれていないか確認してください。"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sales content (AISAS) */}
          {activeTab === "funnel" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                {isEn ? "AISAS Sales Funnel — from Awareness to Purchase & Word-of-mouth" : "AISASセールスファネル — 認知から購買・口コミまで"}
              </p>

              {/* CoT analysis summary */}
              {(plan.funnel.unique_angle || plan.funnel.objection_rebuttal) && (
                <div className="mb-4 rounded-lg border border-indigo-100 overflow-hidden">
                  <div className="bg-indigo-600 px-4 py-2">
                    <p className="text-xs font-bold text-white tracking-widest uppercase">🧠 {isEn ? "Why this content was created" : "このコンテンツが作られた理由"}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 space-y-3">
                    {plan.funnel.unique_angle && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-500 mb-1">💡 {isEn ? "Angle of attack (what competitors aren't saying)" : "攻め口（競合が言っていないこと）"}</p>
                        <p className="text-sm text-indigo-900 leading-relaxed">{plan.funnel.unique_angle}</p>
                      </div>
                    )}
                    {plan.funnel.objection_rebuttal && (
                      <div>
                        <p className="text-xs font-semibold text-purple-500 mb-1">🛡️ {isEn ? "Objection-busting copy" : "反論コピー"}</p>
                        <p className="text-sm text-purple-900 leading-relaxed">{plan.funnel.objection_rebuttal}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <ContentCard label={isEn ? "Attention — Social Post (Awareness)" : "Attention — SNS投稿（認知獲得）"} content={plan.funnel.attention} />
              <ContentCard label={isEn ? "Interest — Landing Page / Blog Intro" : "Interest — LPブログ冒頭（興味喚起）"} content={plan.funnel.interest} />
              <ContentCard label={isEn ? "Search — FAQ & Comparison Content" : "Search — FAQ比較コンテンツ（検索対策）"} content={plan.funnel.search} />
              <ContentCard label={isEn ? "Action — Sales Copy & CTA" : "Action — 販売コピーCTA（購買促進）"} content={plan.funnel.action} />
              <ContentCard label={isEn ? "Share — Review Request" : "Share — レビュー依頼（口コミ促進）"} content={plan.funnel.share} />
            </div>
          )}

          {/* Retention */}
          {activeTab === "retention" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                {isEn ? "Repeat Purchase System — Loss on 1st order → Break-even on 2nd → Profit on 3rd" : "リピート購買システム — 1回目赤字→2回目回収→3回目黒字"}
              </p>

              {/* Step emails */}
              <h4 className="text-sm font-bold text-gray-700 mb-2">{isEn ? "Step Emails (4 emails)" : "ステップメール（4通）"}</h4>
              {plan.retention.step_emails.map((mail, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      {isEn ? "Day" : "Day"} {mail.day}：{mail.subject}
                    </span>
                    <CopyButton text={`Subject: ${mail.subject}\n\n${mail.body}`} />
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{mail.purpose}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded p-3">
                    {mail.body}
                  </p>
                </div>
              ))}

              {/* Loyalty stages */}
              <h4 className="text-sm font-bold text-gray-700 mt-4 mb-2">{isEn ? "Customer Loyalty Program" : "ロイヤルティプログラム"}</h4>
              {plan.retention.loyalty_stages.map((stage, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {stage.stage}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{stage.condition}</p>
                      <p className="text-sm text-gray-700 mt-1 font-medium">{stage.action}</p>
                    </div>
                    <CopyButton text={stage.message} />
                  </div>
                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-3 whitespace-pre-wrap">
                    {stage.message}
                  </p>
                </div>
              ))}

              {/* Community tactics */}
              <h4 className="text-sm font-bold text-gray-700 mt-4 mb-2">{isEn ? "Community Marketing Tactics" : "コミュニティマーケティング施策"}</h4>
              <div className="space-y-2 mb-4">
                {plan.retention.community_tactics.map((tactic, i) => (
                  <div key={i} className="flex items-start gap-2 border border-gray-200 rounded-lg p-3">
                    <span className="text-blue-500 font-bold text-sm">{i + 1}.</span>
                    <p className="text-sm text-gray-700">{tactic}</p>
                  </div>
                ))}
              </div>

              <ContentCard label={isEn ? "VIP Fan Event Idea" : "VIPファンイベントアイデア"} content={plan.retention.vip_event_idea} />
              <ContentCard label={isEn ? "UGC Campaign" : "UGCキャンペーン"} content={plan.retention.ugc_campaign} />
            </div>
          )}

          {/* AEO — AI Search Optimization */}
          {activeTab === "aeo" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                {isEn ? "AEO/GEO — Get cited by ChatGPT, Perplexity, Gemini & Google AI Overview" : "AEO/GEO — ChatGPT・Perplexity・Gemini・Google AIに引用される"}
              </p>

              {/* ハルシネーション警告バナー（常時表示） */}
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ {isEn ? "Fact-check before publishing" : "公開前にファクトチェックしてください"}</p>
                <p className="text-xs text-amber-700">
                  {isEn ? "AI generates content from your input. Verify all numbers, certifications, and claims are accurate before adding to your site." : "AIは入力内容をもとにコンテンツを生成します。数字・認証・主張がすべて正確かをサイトに追加する前に確認してください。"}
                </p>
                {plan.aeo.warnings && plan.aeo.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {plan.aeo.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-red-600 font-medium">⚠️ {w}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Meta Description */}
              <ContentCard
                label={isEn ? "Meta Description (first text AI reads)" : "メタディスクリプション（AIが最初に読むテキスト）"}
                content={plan.aeo.meta_description}
              />

              {/* Q&A blocks */}
              <h4 className="text-sm font-bold text-gray-700 mb-2">{isEn ? "FAQ Content (5 questions)" : "FAQコンテンツ（5問）"}</h4>
              {plan.aeo.qa_blocks.map((qa, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-semibold text-gray-800 flex-1">Q. {qa.question}</p>
                    <CopyButton text={`Q. ${qa.question}\nA. ${qa.answer}`} />
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{qa.answer}</p>
                </div>
              ))}

              {/* Structured data */}
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚡ {isEn ? "AI Search Optimization: JSON-LD Structured Data" : "AI検索最適化：JSON-LD構造化データ"}</p>
                <p className="text-xs text-amber-600 mb-2">{isEn ? "Paste the code below inside your site's <head> tag to get cited by ChatGPT & Perplexity. Share with your developer if needed." : "下のコードをサイトの<head>タグ内に貼り付けるとChatGPT・Perplexityに引用されやすくなります。開発者に共有してください。"}</p>
                <p className="text-xs text-red-600 font-medium mb-3">⚠️ {isEn ? "Verify all numbers and facts in the FAQ answers match your actual business before adding this code." : "このコードを追加する前に、FAQ回答の数字・事実がすべて実際のビジネスと一致することを確認してください。"}</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600">FAQPage Schema</span>
                      <CopyButton text={plan.aeo.faq_schema_jsonld} />
                    </div>
                    <pre className="text-xs text-gray-600 bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                      {plan.aeo.faq_schema_jsonld}
                    </pre>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600">Product Schema</span>
                      <CopyButton text={plan.aeo.product_schema_jsonld} />
                    </div>
                    <pre className="text-xs text-gray-600 bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                      {plan.aeo.product_schema_jsonld}
                    </pre>
                  </div>
                </div>
              </div>
          </div>
          )}

          {/* Reset button */}
          <button
            onClick={() => { setPlan(null); setForm((prev) => ({ ...prev, name: "", price: "", description: "", target: "", usp: "", purchase_url: "" })); }}
            className="w-full mt-6 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            {isEn ? "Register Another Product" : "別の商品を登録する"}
          </button>
        </div>
      )}
    </div>
  );
}
