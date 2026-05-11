"use client";

/**
 * ProductMarketingPanel
 * ─────────────────────────────────────────────────────────────
 * 商品をインプットすれば売って、継続して買い続けてくれるAI
 * ─────────────────────────────────────────────────────────────
 * 機能:
 *   1. 商品情報フォーム（5項目）
 *   2. AIがAEO・販売ファネル・リピートシステムを一気に生成
 *   3. 各コンテンツをタブで表示（コピペ用）
 *   4. ステップメール・ロイヤリティ施策も閲覧可能
 */

import { useState } from "react";

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
  "共感獲得": { label: "💗 共感獲得", bg: "bg-rose-50",   text: "text-rose-600"   },
  "行動促進": { label: "⚡ 行動促進", bg: "bg-amber-50", text: "text-amber-600" },
  "信頼構築": { label: "🛡️ 信頼構築", bg: "bg-sky-50",   text: "text-sky-600"   },
};

const CATEGORY_LABELS: Record<string, string> = {
  physical: "物販・実物商品",
  digital: "デジタル商品（電子書籍・動画等）",
  service: "サービス・施術",
  subscription: "定期購入・サブスク",
};

const INDUSTRY_OPTIONS = [
  { value: "restaurant", label: "飲食店" },
  { value: "salon", label: "美容サロン" },
  { value: "ec", label: "EC・通販" },
  { value: "professional", label: "士業・コンサル" },
  { value: "construction", label: "工務店・建設" },
  { value: "other", label: "その他" },
];

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
      {copied ? "コピー済み ✓" : "コピー"}
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
      setError("商品名・価格・説明・ターゲット・強みは必須です");
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
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました");
      setPlan(data.plan);
      setActiveTab("actions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "actions", label: "今週のアクション" },
    { key: "funnel", label: "販売コンテンツ" },
    { key: "retention", label: "リピート施策" },
    { key: "aeo", label: "AI検索対策" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">商品マーケAI</h2>
        <p className="text-sm text-gray-500 mt-1">
          商品をインプットするだけで、売れる仕組みとリピート購入システムを自動生成します
        </p>
      </div>

      {/* フォーム */}
      {!plan && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">商品名 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="例: オーガニックフェイスクリーム 30g"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）*</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">業種 *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">商品の説明 *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="例: 無農薬ローズヒップオイルを主成分とした保湿クリーム。防腐剤・合成香料不使用。"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ターゲット顧客 *
            </label>
            <input
              name="target"
              value={form.target}
              onChange={handleChange}
              placeholder="例: 30〜40代の肌荒れに悩む女性。自然派コスメに関心があり、添加物を避けたい人"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              この商品の独自の強み（USP）*
            </label>
            <input
              name="usp"
              value={form.usp}
              onChange={handleChange}
              placeholder="例: 国内自社農園産のローズヒップを使用。化学物質ゼロで赤ちゃんにも安全"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              購入・予約URL（あれば）
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
              お客様の声・実績（あれば）
            </label>
            <textarea
              name="social_proof"
              value={form.social_proof}
              onChange={handleChange}
              rows={2}
              placeholder="例: ユーザー数200人窪・「1週間で投稿時間が90％削減」の声あり"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              競合との一言の違い（あれば）
            </label>
            <input
              name="competitor_diff"
              value={form.competitor_diff}
              onChange={handleChange}
              placeholder="例: 他のAIツールと違い、SNSからブログまで一気通貫で生成する"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              限定オファー（あれば）
            </label>
            <input
              name="limited_offer"
              value={form.limited_offer}
              onChange={handleChange}
              placeholder="例: 今月中に購入で初月無料！または20％オフ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? "マーケティングプランを生成中..." : "マーケティングプランを生成する"}
          </button>
        </div>
      )}

      {/* 結果表示 */}
      {plan && (
        <div>
          {/* 戦略メモ */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-blue-600 mb-1">今週の戦略</p>
            <p className="text-sm text-blue-800">{plan.strategy_note}</p>
          </div>

          {/* AI分析の種明かし */}
          {(plan.funnel.unique_angle || plan.funnel.objection_rebuttal) && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
                🧠 AIの分析プロセス（種明かし）
              </p>
              {plan.funnel.unique_angle && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-indigo-500 mb-1">
                    💡 競合が言っていない独自の切り口
                  </p>
                  <p className="text-sm text-indigo-900 bg-white/70 rounded-lg p-3 leading-relaxed">
                    {plan.funnel.unique_angle}
                  </p>
                </div>
              )}
              {plan.funnel.objection_rebuttal && (
                <div>
                  <p className="text-xs font-semibold text-purple-500 mb-1">
                    🛡️ 最大の購買障壁と反論コピー
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

          {/* 今週のアクション */}
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
                      <span className="text-xs text-gray-400">コピペ用テキスト</span>
                      <CopyButton text={action.content} />
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {action.content}
                    </p>
                  </div>
                  {/* 事実確認バナー */}
                  <div className="flex items-start gap-2 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-amber-500 text-xs mt-0.5 shrink-0">⚠️</span>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      コピー前に確認：存在しない商品名・サービス名・キャンペーンが含まれていないか必ずチェックしてください
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 販売コンテンツ（AISAS） */}
          {activeTab === "funnel" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                AISAS販売ファネル — 認知から購入・口コミまで一気通貫
              </p>

              {/* CoT分析結果サマリー */}
              {(plan.funnel.unique_angle || plan.funnel.objection_rebuttal) && (
                <div className="mb-4 rounded-lg border border-indigo-100 overflow-hidden">
                  <div className="bg-indigo-600 px-4 py-2">
                    <p className="text-xs font-bold text-white tracking-widest uppercase">🧠 このコンテンツが生まれた理由</p>
                  </div>
                  <div className="bg-indigo-50 p-4 space-y-3">
                    {plan.funnel.unique_angle && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-500 mb-1">💡 攻める角度（競合が言っていないこと）</p>
                        <p className="text-sm text-indigo-900 leading-relaxed">{plan.funnel.unique_angle}</p>
                      </div>
                    )}
                    {plan.funnel.objection_rebuttal && (
                      <div>
                        <p className="text-xs font-semibold text-purple-500 mb-1">🛡️ 購買障壁の論破コピー</p>
                        <p className="text-sm text-purple-900 leading-relaxed">{plan.funnel.objection_rebuttal}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <ContentCard label="Attention — SNS投稿文（認知）" content={plan.funnel.attention} />
              <ContentCard label="Interest — LP導入・ブログ冒頭（興味）" content={plan.funnel.interest} />
              <ContentCard label="Search — FAQ・比較コンテンツ（検索）" content={plan.funnel.search} />
              <ContentCard label="Action — セールスコピー・CTA（購入）" content={plan.funnel.action} />
              <ContentCard label="Share — レビュー依頼文（口コミ）" content={plan.funnel.share} />
            </div>
          )}

          {/* リピート施策 */}
          {activeTab === "retention" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                リピート購入システム — 初回赤字→2回損益分岐→3回黒字の設計
              </p>

              {/* ステップメール */}
              <h4 className="text-sm font-bold text-gray-700 mb-2">ステップメール（4通）</h4>
              {plan.retention.step_emails.map((mail, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      Day {mail.day}：{mail.subject}
                    </span>
                    <CopyButton text={`件名: ${mail.subject}\n\n${mail.body}`} />
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{mail.purpose}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded p-3">
                    {mail.body}
                  </p>
                </div>
              ))}

              {/* ロイヤリティステージ */}
              <h4 className="text-sm font-bold text-gray-700 mt-4 mb-2">
                顧客ロイヤリティ施策
              </h4>
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

              {/* コミュニティ施策 */}
              <h4 className="text-sm font-bold text-gray-700 mt-4 mb-2">
                コミュニティマーケティング施策
              </h4>
              <div className="space-y-2 mb-4">
                {plan.retention.community_tactics.map((tactic, i) => (
                  <div key={i} className="flex items-start gap-2 border border-gray-200 rounded-lg p-3">
                    <span className="text-blue-500 font-bold text-sm">{i + 1}.</span>
                    <p className="text-sm text-gray-700">{tactic}</p>
                  </div>
                ))}
              </div>

              <ContentCard label="VIPファンイベントアイデア" content={plan.retention.vip_event_idea} />
              <ContentCard label="UGC促進キャンペーン" content={plan.retention.ugc_campaign} />
            </div>
          )}

          {/* AEO — AI検索対策 */}
          {activeTab === "aeo" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                AEO/GEO — ChatGPT・Perplexity・Gemini・Google AIオーバービューに引用される
              </p>

              {/* Meta Description */}
              <ContentCard
                label="Meta Description（AIが最初に読む説明文）"
                content={plan.aeo.meta_description}
              />

              {/* Q&Aブロック */}
              <h4 className="text-sm font-bold text-gray-700 mb-2">FAQ コンテンツ（5問）</h4>
              {plan.aeo.qa_blocks.map((qa, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-semibold text-gray-800 flex-1">Q. {qa.question}</p>
                    <CopyButton text={`Q. ${qa.question}\nA. ${qa.answer}`} />
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{qa.answer}</p>
                </div>
              ))}

              {/* 構造化データ */}
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚡ AI検索対策：JSON-LD構造化データ</p>
                <p className="text-xs text-amber-600 mb-3">下のコードをサイトの&lt;head&gt;タグ内に貼るだけで、ChatGPT・Perplexityに引用されやすくなります。行けなければサイト担当者に渡してください。</p>
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

          {/* リセットボタン */}
          <button
            onClick={() => { setPlan(null); setForm((prev) => ({ ...prev, name: "", price: "", description: "", target: "", usp: "", purchase_url: "" })); }}
            className="w-full mt-6 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            別の商品を登録する
          </button>
        </div>
      )}
    </div>
  );
}
