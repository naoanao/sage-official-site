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

const CATEGORY_LABELS: Record<string, string> = {
  physical: "Physical Product",
  digital: "Digital Product (e-book, video, etc.)",
  service: "Service / Treatment",
  subscription: "Subscription",
};

const INDUSTRY_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "salon", label: "Beauty Salon" },
  { value: "ec", label: "E-commerce" },
  { value: "professional", label: "Consulting / Professional" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
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
      setError("Product name, price, description, target, and USP are required.");
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
      if (!res.ok) throw new Error(data.error ?? "Generation failed. Please try again.");
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
    { key: "actions", label: "This Week's Actions" },
    { key: "funnel", label: "Sales Content" },
    { key: "retention", label: "Retention" },
    { key: "aeo", label: "AI Search" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Product Marketing AI</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter your product details and AI auto-generates a complete sales & retention system.
        </p>
      </div>

      {/* フォーム */}
      {!plan && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Organic Face Cream 30g"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (¥) *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Description *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. Moisturizer with pesticide-free rosehip oil. No preservatives or synthetic fragrances."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Customer *
            </label>
            <input
              name="target"
              value={form.target}
              onChange={handleChange}
              placeholder="e.g. Women in their 30s–40s with skin concerns, interested in natural cosmetics"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unique Selling Point (USP) *
            </label>
            <input
              name="usp"
              value={form.usp}
              onChange={handleChange}
              placeholder="e.g. Rosehip from our own domestic farm. Zero chemicals — safe for babies too."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase / Booking URL (optional)
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
              Social Proof / Results (optional)
            </label>
            <textarea
              name="social_proof"
              value={form.social_proof}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. 200+ users · 'Cut posting time by 90% in a week' reported"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              One-line difference vs. competitors (optional)
            </label>
            <input
              name="competitor_diff"
              value={form.competitor_diff}
              onChange={handleChange}
              placeholder="e.g. Unlike other AI tools, generates everything from social posts to blog in one go."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limited Offer (optional)
            </label>
            <input
              name="limited_offer"
              value={form.limited_offer}
              onChange={handleChange}
              placeholder="e.g. Buy this month and get the first month free! Or 20% off."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? "Generating marketing plan..." : "Generate Marketing Plan"}
          </button>
        </div>
      )}

      {/* 結果表示 */}
      {plan && (
        <div>
          {/* Strategy note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-blue-600 mb-1">This Week's Strategy</p>
            <p className="text-sm text-blue-800">{plan.strategy_note}</p>
          </div>

          {/* AI分析の種明かし */}
          {(plan.funnel.unique_angle || plan.funnel.objection_rebuttal) && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
                🧠 AI Analysis Process
              </p>
              {plan.funnel.unique_angle && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-indigo-500 mb-1">
                    💡 Unique angle not used by competitors
                  </p>
                  <p className="text-sm text-indigo-900 bg-white/70 rounded-lg p-3 leading-relaxed">
                    {plan.funnel.unique_angle}
                  </p>
                </div>
              )}
              {plan.funnel.objection_rebuttal && (
                <div>
                  <p className="text-xs font-semibold text-purple-500 mb-1">
                    🛡️ Top objection & rebuttal copy
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
                      <span className="text-xs text-gray-400">Copy-paste text</span>
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
                      Before copying: Verify no fictional product names, services, or campaigns are included.
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
                AISAS Sales Funnel — from Awareness to Purchase & Word-of-mouth
              </p>

              {/* CoT analysis summary */}
              {(plan.funnel.unique_angle || plan.funnel.objection_rebuttal) && (
                <div className="mb-4 rounded-lg border border-indigo-100 overflow-hidden">
                  <div className="bg-indigo-600 px-4 py-2">
                    <p className="text-xs font-bold text-white tracking-widest uppercase">🧠 Why this content was created</p>
                  </div>
                  <div className="bg-indigo-50 p-4 space-y-3">
                    {plan.funnel.unique_angle && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-500 mb-1">💡 Angle of attack (what competitors aren't saying)</p>
                        <p className="text-sm text-indigo-900 leading-relaxed">{plan.funnel.unique_angle}</p>
                      </div>
                    )}
                    {plan.funnel.objection_rebuttal && (
                      <div>
                        <p className="text-xs font-semibold text-purple-500 mb-1">🛡️ Objection-busting copy</p>
                        <p className="text-sm text-purple-900 leading-relaxed">{plan.funnel.objection_rebuttal}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <ContentCard label="Attention — Social Post (Awareness)" content={plan.funnel.attention} />
              <ContentCard label="Interest — Landing Page / Blog Intro" content={plan.funnel.interest} />
              <ContentCard label="Search — FAQ & Comparison Content" content={plan.funnel.search} />
              <ContentCard label="Action — Sales Copy & CTA" content={plan.funnel.action} />
              <ContentCard label="Share — Review Request" content={plan.funnel.share} />
            </div>
          )}

          {/* Retention */}
          {activeTab === "retention" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Repeat Purchase System — Loss on 1st order → Break-even on 2nd → Profit on 3rd
              </p>

              {/* Step emails */}
              <h4 className="text-sm font-bold text-gray-700 mb-2">Step Emails (4 emails)</h4>
              {plan.retention.step_emails.map((mail, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      Day {mail.day}：{mail.subject}
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
              <h4 className="text-sm font-bold text-gray-700 mt-4 mb-2">Customer Loyalty Program</h4>
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
              <h4 className="text-sm font-bold text-gray-700 mt-4 mb-2">Community Marketing Tactics</h4>
              <div className="space-y-2 mb-4">
                {plan.retention.community_tactics.map((tactic, i) => (
                  <div key={i} className="flex items-start gap-2 border border-gray-200 rounded-lg p-3">
                    <span className="text-blue-500 font-bold text-sm">{i + 1}.</span>
                    <p className="text-sm text-gray-700">{tactic}</p>
                  </div>
                ))}
              </div>

              <ContentCard label="VIP Fan Event Idea" content={plan.retention.vip_event_idea} />
              <ContentCard label="UGC Campaign" content={plan.retention.ugc_campaign} />
            </div>
          )}

          {/* AEO — AI Search Optimization */}
          {activeTab === "aeo" && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                AEO/GEO — Get cited by ChatGPT, Perplexity, Gemini & Google AI Overview
              </p>

              {/* ハルシネーション警告バナー（常時表示） */}
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Fact-check before publishing</p>
                <p className="text-xs text-amber-700">
                  AI generates content from your input. Verify all numbers, certifications, and claims are accurate before adding to your site.
                </p>
                {plan.aeo.warnings && plan.aeo.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {plan.aeo.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-red-600 font-medium">⚠️ {w}</li>
                    ))}
                  </ul>
                )}
              </div>
              </p>

              {/* Meta Description */}
              <ContentCard
                label="Meta Description (first text AI reads)"
                content={plan.aeo.meta_description}
              />

              {/* Q&A blocks */}
              <h4 className="text-sm font-bold text-gray-700 mb-2">FAQ Content (5 questions)</h4>
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
                <p className="text-xs font-semibold text-amber-700 mb-1">⚡ AI Search Optimization: JSON-LD Structured Data</p>
                <p className="text-xs text-amber-600 mb-2">Paste the code below inside your site's &lt;head&gt; tag to get cited by ChatGPT & Perplexity. Share with your developer if needed.</p>
                <p className="text-xs text-red-600 font-medium mb-3">⚠️ Verify all numbers and facts in the FAQ answers match your actual business before adding this code.</p>
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
            Register Another Product
          </button>
        </div>
      )}
    </div>
  );
}
