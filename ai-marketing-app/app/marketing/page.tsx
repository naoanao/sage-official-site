"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LangToggle from "@/components/LangToggle";
import { loadOnboarding } from "@/lib/store";
import { useLang } from "@/lib/i18n";

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────
function getSituations(isEn: boolean) {
  return [
    {
      id: "s1",
      icon: "🔭",
      title: isEn ? "Know Your Market" : "市場を知る",
      sub: isEn ? "Environment analysis · Competitive edge" : "環境分析・競合優位性",
      frameworks: [
        { id: "pest", name: "PEST Analysis", desc: isEn ? "Understand political, economic, social & tech trends shaping your market" : "政治・経済・社会・技術トレンドを把握する", time: "5 min" },
        { id: "3c", name: "3C Analysis", desc: isEn ? "Map your business from three angles: customer, competitor, company" : "顧客・競合・自社の3視点でビジネスを分析する", time: "5 min" },
        { id: "swot", name: "SWOT Analysis", desc: isEn ? "Identify strengths, weaknesses, opportunities & threats" : "強み・弱み・機会・脅威を整理する", time: "5 min" },
      ],
    },
    {
      id: "s2",
      icon: "💎",
      title: isEn ? "Differentiate" : "差別化する",
      sub: isEn ? "Value design · Competitive advantage" : "価値設計・競合優位性",
      frameworks: [
        { id: "vrio", name: "VRIO Analysis", desc: isEn ? "Evaluate your resources for sustainable competitive advantage" : "持続的競合優位のためにリソースを評価する", time: "5 min" },
      ],
    },
    {
      id: "s3",
      icon: "🎯",
      title: isEn ? "Build Your Strategy" : "戦略を構築する",
      sub: isEn ? "Targeting · Positioning" : "ターゲット設定・ポジショニング",
      frameworks: [
        { id: "stp", name: "STP Analysis", desc: isEn ? "Segment the market and establish your positioning" : "市場をセグメントし自社のポジションを確立する", time: "5 min" },
        { id: "4p", name: "4P / 4C Analysis", desc: isEn ? "Design your product, price, place & promotion mix" : "製品・価格・流通・プロモーションを設計する", time: "5 min" },
      ],
    },
    {
      id: "s4",
      icon: "🚀",
      title: isEn ? "Web & AI Search Traffic" : "Web・AI検索流入",
      sub: isEn ? "2026 growth strategy" : "2026年成長戦略",
      frameworks: [
        { id: "ulssas", name: "ULSSAS Analysis", desc: isEn ? "Design a viral loop for growth in the social media era" : "SNS時代のバイラルループを設計する", time: "5 min" },
        { id: "aeo", name: "AEO Strategy", desc: isEn ? "Get recommended by ChatGPT, Gemini & AI search engines" : "ChatGPT・GeminiなどAI検索エンジンに推薦される", time: "5 min" },
      ],
    },
  ];
}

const CONTENT_TYPE_ICONS: Record<string, string> = {
  "Instagram Post": "📸",
  "Google Review Reply": "⭐",
  "LINE Message": "💬",
  "Blog Intro": "✍️",
  "Email": "📧",
  "Announcement": "📢",
  "Flyer Copy": "📄",
  // Japanese fallbacks
  "Instagram投稿文": "📸",
  "Googleレビュー返信文": "⭐",
  "LINE配信文": "💬",
  "ブログ記事冒頭": "✍️",
  "メール文": "📧",
  "告知文": "📢",
  "チラシ文": "📄",
};

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
interface PositioningPoint {
  label: string;
  x: number;
  y: number;
}

interface PositioningMap {
  x_label_left: string;
  x_label_right: string;
  y_label_top: string;
  y_label_bottom: string;
  own: PositioningPoint;
  competitors: PositioningPoint[];
}

interface StrategySummary {
  target: string;
  usp: string;
  main_channel: string;
  top_priority: string;
  winning_message: string;
}

interface AnalysisResult {
  framework: string;
  why: string;
  items: Record<string, string[]>;
  insight: string;
  actions: string[];
  positioning?: PositioningMap;
  strategy_summary?: StrategySummary;
}

interface PostResult {
  platform: string;
  content: string;
  hook: string;
}

// AI market research result types
interface CompetitorItem {
  name: string;
  strength: string;
  weakness: string;
  ad_count?: string;
}
interface ResearchResult {
  status: string;
  research: {
    customer: {
      purchase_motives: string[];
      pain_points: string[];
      latent_needs: string[];
      quantitative: string[];
    };
    competitor: {
      top_competitors: CompetitorItem[];
      ad_landscape: string;
      white_space: string;
    };
    company_gaps: { gap: string; opportunity: string }[];
    market: { market_size: string; trend: string; key_statistics: string[] };
    positioning_statement?: string;
    gtm_motion?: string;
    growth_levers?: string[];
    localization_gaps?: { market: string; adapt: string; keep: string }[];
    beachhead_market?: string;
    usp_candidates: string[];
    recommended_actions: string[];
    sources: string[];
  };
  summary: string;
  generated_at: string;
}

type Step = "form" | "situation" | "loading" | "result" | "research-loading" | "research-result";

// ────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

function getContentIcon(platform: string): string {
  return CONTENT_TYPE_ICONS[platform] ?? "📝";
}

// ────────────────────────────────────────────
// STP Positioning Map
// ────────────────────────────────────────────
function PositioningMapChart({ data }: { data: PositioningMap }) {
  const toPercent = (v: number) => Math.min(Math.max(((v + 1) / 2) * 100, 5), 95);
  const COLORS = ["#a78bfa", "#f472b6", "#34d399", "#fb923c", "#60a5fa"];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
      <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Positioning Map (vs. Competitors)</p>
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-gray-300" style={{ transform: "translateX(-50%)" }} />
            <div className="absolute top-1/2 left-0 right-0 border-t border-gray-300" style={{ transform: "translateY(-50%)" }} />
          </div>
          <p className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 text-center leading-tight px-1 max-w-[45%]">
            ▲ {data.y_label_top}
          </p>
          <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 text-center leading-tight px-1 max-w-[45%]">
            ▼ {data.y_label_bottom}
          </p>
          <p className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 leading-tight max-w-[20%]">
            ◀ {data.x_label_left}
          </p>
          <p className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 text-right leading-tight max-w-[20%]">
            {data.x_label_right} ▶
          </p>
          {data.competitors.map((c, i) => (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{
                left: `${toPercent(c.x)}%`,
                top: `${100 - toPercent(c.y)}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[9px] font-medium mt-0.5 text-center leading-tight whitespace-nowrap" style={{ color: COLORS[i % COLORS.length], maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.label}
              </span>
            </div>
          ))}
          <div
            className="absolute flex flex-col items-center"
            style={{
              left: `${toPercent(data.own.x)}%`,
              top: `${100 - toPercent(data.own.y)}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 10,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-lg" />
            <span className="text-[10px] font-bold text-indigo-600 mt-0.5 text-center leading-tight whitespace-nowrap">
              {data.own.label}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-[10px] text-gray-600 font-medium">Your Business</span>
        </div>
        {data.competitors.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-[10px] text-gray-500">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────
export default function MarketingPage() {
  const { lang, mounted } = useLang();
  const isEn = mounted && lang === "en";
  const SITUATIONS = !mounted ? getSituations(false) : getSituations(isEn);

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [target, setTarget] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedSituation, setSelectedSituation] = useState<string | null>(null);
  const [selectedFw, setSelectedFw] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchRegion, setResearchRegion] = useState<"jp" | "us" | "global">("us");

  const [posts, setPosts] = useState<PostResult[] | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsCopied, setPostsCopied] = useState<Record<number, boolean>>({});

  const situation = SITUATIONS.find((s) => s.id === selectedSituation);

  useEffect(() => {
    const data = loadOnboarding();
    if (data.industry) setIndustry(data.industry);
  }, []);

  function isValidInput(str: string): boolean {
    const trimmed = str.trim();
    if (trimmed.length < 2) return false;
    // Require at least one letter or number
    return /[\p{L}\p{N}]/u.test(trimmed);
  }

  function scrollTop() {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidInput(name) || !isValidInput(product) || !isValidInput(target)) {
      setFormError(isEn ? "Please enter at least 2 characters for business name, product/service, and target customer." : "ビジネス名・商品サービス・ターゲット顧客をそれぞれ2文字以上入力してください。");
      return;
    }
    setFormError(null);
    scrollTop();
    setStep("situation");
  }

  async function handleAnalyze() {
    if (!selectedFw) return;
    setStep("loading");
    setError(null);
    setPosts(null);
    try {
      const res = await fetch("/api/marketing/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          product,
          target,
          url: url || undefined,
          framework: selectedFw,
          industry: industry || undefined,
          price: price || undefined,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "An error occurred");
      setResult(data.result);
      setStep("result");
      scrollTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("situation");
    }
  }

  async function handleResearch() {
    setStep("research-loading");
    setResearchError(null);
    try {
      const res = await fetch("/api/market-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: industry || "professional",
          product,
          target,
          business_name: name || undefined,
          region: researchRegion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "An error occurred");
      setResearchResult(data);
      setStep("research-result");
      scrollTop();
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "An error occurred");
      setStep("situation");
    }
  }

  async function handleGeneratePosts() {
    if (!result) return;
    setPostsLoading(true);
    setPostsCopied({});
    try {
      const res = await fetch("/api/marketing/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework: result.framework,
          insight: result.insight,
          name,
          product,
          target,
          industry: industry || undefined,
          price: price || undefined,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "An error occurred");
      setPosts(data.posts);
    } catch {
      // Silently fail
    } finally {
      setPostsLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const text = [
      `■ ${result.framework}`,
      `[Why it matters]\n${stripMarkdown(result.why)}`,
      ...Object.entries(result.items).map(
        ([k, vs]) => `[${k}]\n${vs.map((v) => `• ${stripMarkdown(v)}`).join("\n")}`
      ),
      `[Insight]\n${stripMarkdown(result.insight)}`,
      `[This week's actions]\n${result.actions.map((a, i) => `${i + 1}. ${stripMarkdown(a)}`).join("\n")}`,
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyPost(index: number, content: string) {
    const text = `${content}\n\n📊 Created with Growl`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setPostsCopied((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => setPostsCopied((prev) => ({ ...prev, [index]: false })), 2000);
  }

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────

  // Research loading
  if (step === "research-loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4" key={lang}>
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-6" />
        <p className="text-gray-600 font-medium text-lg">{isEn ? "AI is researching your market…" : "AIが市場をリサーチ中…"}</p>
        <p className="text-gray-400 text-sm mt-2 text-center">{isEn ? "Scanning competitors, reviews, ads, market size & government data" : "競合・レビュー・広告・市場規模・政府データをスキャン中"}</p>
        <p className="text-gray-300 text-xs mt-1">{isEn ? "(Takes 30–60 seconds)" : "（30〜60秒かかります）"}</p>
      </main>
    );
  }

  // Research result
  if (step === "research-result" && researchResult) {
    const r = researchResult.research;
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10" key={lang}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setStep("situation"); setResearchResult(null); scrollTop(); }}
              className="text-gray-400 text-sm hover:text-gray-600"
            >
              {isEn ? "← Back" : "← 戻る"}
            </button>
            <h1 className="text-xl font-bold text-gray-900">🔍 {isEn ? "AI Market Research Report" : "AI市場リサーチレポート"}</h1>
          </div>

          {/* Summary badge */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl px-4 py-4 mb-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold text-emerald-100 tracking-widest uppercase">{isEn ? "Research Complete" : "リサーチ完了"}</p>
              <span className="text-xs bg-emerald-400 bg-opacity-50 px-2 py-0.5 rounded-full">
                {researchRegion === "jp" ? "🇯🇵 Japan" : researchRegion === "us" ? "🇺🇸 US / English" : "🌐 Global"}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug">{researchResult.summary}</p>
            <p className="text-xs text-emerald-200 mt-2">{isEn ? "Gemini 2.0 + Live Web Search" : "Gemini 2.0 + ライブWeb検索"}</p>
          </div>

          {/* Customer analysis */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">👤 {isEn ? "Customer" : "顧客"}</p>
            {r.customer.purchase_motives.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">{isEn ? "Purchase Motives (from 5-star reviews)" : "購買動機（5つ星レビューより）"}</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.purchase_motives.map((m, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-emerald-400 flex-shrink-0">✓</span>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.customer.pain_points.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">{isEn ? "Pain Points (from 2–3 star reviews)" : "ペインポイント（2〜3つ星レビューより）"}</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.pain_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-red-400 flex-shrink-0">✗</span>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.customer.latent_needs.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">{isEn ? "Latent Needs (from social / UGC)" : "潜在ニーズ（SNS・UGCより）"}</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.latent_needs.map((n, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-amber-400 flex-shrink-0">💬</span>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.customer.quantitative.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">{isEn ? "Quantitative Data (government / industry stats)" : "定量データ（政府・業界統計より）"}</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.quantitative.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-blue-400 flex-shrink-0">📊</span>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Competitor analysis */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">⚔️ {isEn ? "Competitor" : "競合"}</p>
            {r.competitor.top_competitors.map((c, i) => (
              <div key={i} className="mb-3 pb-3 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                <p className="text-sm font-bold text-gray-800 mb-1">{c.name}</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">{isEn ? "Strength" : "強み"}</p>
                    <p className="text-xs text-gray-700">{c.strength}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">{isEn ? "Weakness (your opportunity)" : "弱み（あなたのチャンス）"}</p>
                    <p className="text-xs text-emerald-700">{c.weakness}</p>
                  </div>
                </div>
                {c.ad_count && <p className="text-xs text-gray-400 mt-1">{isEn ? "Ads:" : "広告数:"} {c.ad_count}</p>}
              </div>
            ))}
            {r.competitor.ad_landscape && (
              <div className="mt-2 pt-2 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-1">{isEn ? "Ad Landscape" : "広告状況"}</p>
                <p className="text-sm text-gray-700">{r.competitor.ad_landscape}</p>
              </div>
            )}
            {r.competitor.white_space && (
              <div className="mt-2 pt-2 border-t border-gray-50">
                <p className="text-xs font-semibold text-emerald-600 mb-1">🎯 {isEn ? "Market Gap (competitors missing this)" : "市場のスキマ（競合が手をつけていない）"}</p>
                <p className="text-sm text-emerald-800 font-medium">{r.competitor.white_space}</p>
              </div>
            )}
          </div>

          {/* Company opportunities */}
          {r.company_gaps.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">🏢 {isEn ? "Company — Differentiation Opportunities" : "自社 — 差別化の機会"}</p>
              {r.company_gaps.map((g, i) => (
                <div key={i} className="mb-3 pb-3 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">{isEn ? "Gap" : "課題"}: {g.gap}</p>
                  <p className="text-sm text-indigo-700">→ {g.opportunity}</p>
                </div>
              ))}
            </div>
          )}

          {/* Market data */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">📈 {isEn ? "Market" : "市場"}</p>
            {r.market.market_size && <p className="text-sm text-gray-700 mb-1"><span className="text-xs text-gray-400">{isEn ? "Market size: " : "市場規模: "}</span>{r.market.market_size}</p>}
            {r.market.trend && <p className="text-sm text-gray-700 mb-2"><span className="text-xs text-gray-400">{isEn ? "Trend: " : "トレンド: "}</span>{r.market.trend}</p>}
            {r.market.key_statistics.length > 0 && (
              <ul className="flex flex-col gap-1">
                {r.market.key_statistics.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-blue-300">·</span>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* US-specific: positioning, GTM, growth levers */}
          {r.positioning_statement && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 mb-4">
              <p className="text-xs font-bold text-blue-600 mb-2">🎯 {isEn ? "Positioning Statement" : "ポジショニングステートメント"}</p>
              <p className="text-sm text-blue-900 italic leading-relaxed">&ldquo;{r.positioning_statement}&rdquo;</p>
            </div>
          )}
          {r.gtm_motion && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="text-xs font-bold text-indigo-500 mb-1">🚀 {isEn ? "GTM Motion" : "GTM戦略"}</p>
              <p className="text-sm text-gray-700">{r.gtm_motion}</p>
            </div>
          )}
          {r.growth_levers && r.growth_levers.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="text-xs font-bold text-indigo-500 mb-2">📈 {isEn ? "Growth Levers" : "成長レバー"}</p>
              {r.growth_levers.map((g, i) => (
                <p key={i} className="text-sm text-gray-700 mb-1 flex gap-2"><span className="text-indigo-400 flex-shrink-0">▶</span>{g}</p>
              ))}
            </div>
          )}

          {/* Global: localization */}
          {r.beachhead_market && (
            <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-4 mb-4">
              <p className="text-xs font-bold text-teal-600 mb-1">🌍 {isEn ? "Beachhead Market (where to win first)" : "橋頭堡市場（最初に勝つべき場所）"}</p>
              <p className="text-sm text-teal-900">{r.beachhead_market}</p>
            </div>
          )}
          {r.localization_gaps && r.localization_gaps.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="text-xs font-bold text-indigo-500 mb-3">🌐 {isEn ? "Localization Requirements" : "ローカライゼーション要件"}</p>
              {r.localization_gaps.map((lg, i) => (
                <div key={i} className="mb-3 pb-3 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                  <p className="text-xs font-bold text-gray-700 mb-1">📍 {lg.market}</p>
                  <p className="text-xs text-gray-600 mb-0.5"><span className="text-red-400 font-semibold">{isEn ? "Must adapt: " : "要変更: "}</span>{lg.adapt}</p>
                  <p className="text-xs text-gray-600"><span className="text-emerald-500 font-semibold">{isEn ? "Universal: " : "共通: "}</span>{lg.keep}</p>
                </div>
              ))}
            </div>
          )}

          {/* USP candidates */}
          {r.usp_candidates.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-4">
              <p className="text-xs font-semibold text-amber-600 mb-2">💡 {isEn ? "USP Candidates" : "USP候補"}</p>
              {r.usp_candidates.map((u, i) => (
                <p key={i} className="text-sm text-amber-900 mb-1">✦ {u}</p>
              ))}
            </div>
          )}

          {/* Recommended actions */}
          {r.recommended_actions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">{isEn ? "Actions you can take this week (30 min, no budget needed)" : "今週できるアクション（30分・予算ゼロ）"}</p>
              <ol className="flex flex-col gap-3">
                {r.recommended_actions.map((action, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-700">{action}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Sources */}
          {r.sources.length > 0 && (
            <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-6">
              <p className="text-xs text-gray-400 font-semibold mb-1">📚 {isEn ? "Sources" : "情報源"}</p>
              {r.sources.map((s, i) => <p key={i} className="text-xs text-gray-500">· {s}</p>)}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-6">
            <p className="text-xs text-amber-700 leading-relaxed">
              {isEn ? "⚠️ This research was automatically collected by AI + web search. Always verify key figures and competitor data from primary sources before making business decisions." : "⚠️ このリサーチはAI＋Web検索で自動収集されたものです。ビジネス判断を行う前に、重要な数字や競合データは一次情報で必ず確認してください。"}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setStep("situation"); setResearchResult(null); scrollTop(); }}
              className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              {isEn ? "← Back to Framework Analysis" : "← フレームワーク選択に戻る"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Loading
  if (step === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4" key={lang}>
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-6" />
        <p className="text-gray-600 font-medium text-lg">{isEn ? "AI is analyzing…" : "AIが分析中…"}</p>
        <p className="text-gray-400 text-sm mt-2">
          {isEn ? "Generating" : "生成中："} {situation?.frameworks.find((f) => f.id === selectedFw)?.name ?? "framework"}
        </p>
      </main>
    );
  }

  // Result
  if (step === "result" && result) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10" key={lang}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setStep("situation"); setResult(null); setPosts(null); scrollTop(); }}
              className="text-gray-400 text-sm hover:text-gray-600"
            >
              {isEn ? "← Back" : "← 戻る"}
            </button>
            <h1 className="text-xl font-bold text-gray-900">{result.framework}</h1>
          </div>

          {/* Strategy summary */}
          {result.strategy_summary && (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl px-4 py-4 mb-5 text-white shadow-lg shadow-indigo-200">
              <p className="text-xs font-bold text-indigo-200 mb-3 tracking-widest uppercase">📋 {isEn ? "Strategy Summary" : "戦略サマリー"}</p>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-24 flex-shrink-0 pt-0.5">{isEn ? "Target" : "ターゲット"}</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.target}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-24 flex-shrink-0 pt-0.5">USP</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.usp}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-24 flex-shrink-0 pt-0.5">{isEn ? "Main Channel" : "メインチャネル"}</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.main_channel}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-24 flex-shrink-0 pt-0.5">{isEn ? "Top Priority" : "最優先事項"}</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.top_priority}</span>
                </div>
                <div className="mt-1 pt-2.5 border-t border-indigo-500">
                  <p className="text-xs text-indigo-300 mb-1">{isEn ? "Winning Message" : "訴求メッセージ"}</p>
                  <p className="text-base font-bold leading-snug">{result.strategy_summary.winning_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Why it matters */}
          <div className="bg-indigo-50 rounded-2xl px-4 py-3 mb-5">
            <p className="text-xs text-indigo-400 font-medium mb-1">{isEn ? "Why this analysis matters" : "この分析が重要な理由"}</p>
            <p className="text-indigo-800 text-sm leading-relaxed">{stripMarkdown(result.why)}</p>
          </div>

          {/* Framework body */}
          <div className="flex flex-col gap-3 mb-5">
            {Object.entries(result.items).map(([label, items]) => (
              <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{label}</p>
                <ul className="flex flex-col gap-1">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                      <span>{stripMarkdown(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* STP positioning map */}
          {result.positioning && <PositioningMapChart data={result.positioning} />}

          {/* Insight */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-5">
            <p className="text-xs font-semibold text-amber-500 mb-1">💡 {isEn ? "Key Insight" : "キーインサイト"}</p>
            <p className="text-amber-900 text-sm leading-relaxed">{stripMarkdown(result.insight)}</p>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <p className="text-xs font-semibold text-gray-500 mb-3">{isEn ? "Actions you can take this week (30 min, no budget needed)" : "今週できるアクション（30分・予算ゼロ）"}</p>
            <ol className="flex flex-col gap-3">
              {result.actions.map((action, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700">{stripMarkdown(action)}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5">
            <p className="text-xs text-amber-700 leading-relaxed">
              {isEn ? "⚠️ This analysis is an AI-generated starting point. Always verify current regulations and market data from primary sources before making business decisions." : "⚠️ この分析はAIが生成した出発点です。ビジネス判断を行う前に、最新の規制や市場データは一次情報で必ず確認してください。"}
            </p>
          </div>

          {/* Post generation section */}
          <div className="mb-6">
            {!posts && !postsLoading && (
              <button
                onClick={handleGeneratePosts}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-100"
              >
                {isEn ? "📱 Generate 3 social posts from this analysis →" : "📱 この分析から投稿文3つを生成する →"}
              </button>
            )}

            {postsLoading && (
              <div className="w-full flex flex-col items-center justify-center py-8 bg-white rounded-2xl border border-gray-100">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
                <p className="text-gray-500 text-sm">{isEn ? "Generating posts…" : "投稿文を生成中…"}</p>
              </div>
            )}

            {posts && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-800">📱 {isEn ? "Ready-to-post copy" : "すぐ投稿できる文章"}</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{isEn ? "Verify facts before posting" : "投稿前に内容を確認してください"}</span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-2">⚠️ {isEn ? "Please check before copying" : "コピーする前に確認してください"}</p>
                  <ul className="flex flex-col gap-1.5">
                    <li className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">□</span>
                      <span>{isEn ? <>Does it mention any <strong>product names, menu items, or services</strong> that don&apos;t actually exist?</> : <>実際には存在しない<strong>商品名・メニュー・サービス</strong>が書かれていませんか？</>}</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">□</span>
                      <span>{isEn ? <>Are there any <strong>made-up discounts, prices, or promotions</strong>?</> : <>実際にはない<strong>割引・価格・プロモーション</strong>が含まれていませんか？</>}</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">□</span>
                      <span>{isEn ? <>Is everything described something you <strong>actually offer right now</strong>?</> : <>書かれている内容は<strong>実際に今提供しているもの</strong>ですか？</>}</span>
                    </li>
                  </ul>
                  <p className="text-xs text-amber-600 mt-2 leading-relaxed">
                    {isEn ? "AI generates content based on your input but may add details that don't exist. Always read through before posting." : "AIは入力内容をもとに文章を生成しますが、存在しない詳細を付け加えることがあります。投稿前に必ずお読みください。"}
                  </p>
                </div>

                {posts.map((post, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getContentIcon(post.platform)}</span>
                        <span className="text-xs font-semibold text-indigo-700">{post.platform}</span>
                      </div>
                      {post.hook && (
                        <span className="text-xs text-indigo-500 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                          {post.hook}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                    <div className="px-4 pb-3 flex justify-end">
                      <button
                        onClick={() => handleCopyPost(i, post.content)}
                        className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all active:scale-95 ${
                          postsCopied[i]
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-indigo-500 hover:bg-indigo-600 text-white"
                        }`}
                      >
                        {postsCopied[i] ? (isEn ? "✓ Copied!" : "✓ コピー済") : (isEn ? "📋 Copy" : "📋 コピー")}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => { setPosts(null); handleGeneratePosts(); }}
                  className="text-xs text-center text-gray-400 hover:text-indigo-500 py-2"
                >
                  {isEn ? "🔄 Generate different variations" : "🔄 別のバリエーションを生成する"}
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCopy}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl transition-colors active:scale-95"
            >
              {copied ? (isEn ? "✅ Copied!" : "✅ コピー済！") : (isEn ? "📋 Copy Analysis" : "📋 分析結果をコピー")}
            </button>
            <button
              onClick={() => {
                setSelectedSituation(null);
                setSelectedFw(null);
                setResult(null);
                setPosts(null);
                setStep("situation");
                scrollTop();
              }}
              className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              {isEn ? "Analyze with a different framework" : "別のフレームワークで分析する"}
            </button>
            <div className="w-full border border-gray-200 text-gray-400 font-medium py-3 rounded-2xl text-center cursor-not-allowed flex items-center justify-center gap-2">
              <span>{isEn ? "Create weekly action plan" : "週次アクションプランを作成"}</span>
              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">{isEn ? "Coming Soon" : "近日公開"}</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Step 2: Situation / Framework selection
  if (step === "situation") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10" key={lang}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => { setStep("form"); setSelectedSituation(null); setSelectedFw(null); scrollTop(); }}
            className="text-gray-400 text-sm mb-4 hover:text-gray-600"
          >
            {isEn ? "← Edit business info" : "← ビジネス情報を編集"}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{isEn ? "Which analysis do you need?" : "どの分析が必要ですか？"}</h1>
          <p className="text-gray-500 text-sm mb-6">{name} · {product}</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {researchError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {researchError}
            </div>
          )}

          {/* AI real-time market research banner */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{isEn ? "AI Real-Time Market Research" : "AIリアルタイム市場リサーチ"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{isEn ? "AI scans reviews, ads, competitor rankings, market size & government data to auto-generate a 3C analysis" : "AIがレビュー・広告・競合ランキング・市場規模・政府データをスキャンして3C分析を自動生成"}</p>
              </div>
            </div>
            {/* Region selector */}
            <div className="flex gap-2 mb-3">
              {(["jp", "us", "global"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setResearchRegion(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    researchRegion === r
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  {r === "jp" ? "🇯🇵 Japan" : r === "us" ? "🇺🇸 US / English" : "🌐 Global"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {researchRegion === "jp" && (isEn ? "Sources: Amazon JP · Rakuten · Yano Research · Ministry of Health & Stat" : "情報源: Amazon JP・楽天・矢野経済研・厚生労働省統計")}
              {researchRegion === "us" && (isEn ? "Sources: Amazon.com · G2 · Trustpilot · Statista · IBISWorld · US Census" : "Sources: Amazon.com · G2 · Trustpilot · Statista · IBISWorld · US Census")}
              {researchRegion === "global" && (isEn ? "Sources: JP + US combined coverage" : "情報源: JP + US 合算カバレッジ")}
            </p>
            <button
              onClick={handleResearch}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-sm"
            >
              {isEn ? "🌐 Auto-collect web data and generate 3C analysis →" : "🌐 Webデータを自動収集して3C分析を生成する →"}
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">{isEn ? "Takes 30–60 seconds" : "30〜60秒かかります"}</p>
          </div>

          <p className="text-xs text-gray-400 font-semibold mb-3">{isEn ? "Or: choose a framework for instant AI analysis" : "または：フレームワークを選んで即座にAI分析"}</p>

          <div className="flex flex-col gap-4 mb-6">
            {SITUATIONS.map((sit) => (
              <div key={sit.id}>
                <button
                  onClick={() => setSelectedSituation(sit.id === selectedSituation ? null : sit.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ${
                    selectedSituation === sit.id
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-white border-gray-100 hover:border-indigo-100"
                  }`}
                >
                  <span className="text-2xl">{sit.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{sit.title}</p>
                    <p className="text-xs text-gray-400">{sit.sub}</p>
                  </div>
                  <span className="text-gray-300 text-lg">{selectedSituation === sit.id ? "▲" : "▼"}</span>
                </button>

                {selectedSituation === sit.id && (
                  <div className="mt-2 flex flex-col gap-2 pl-2">
                    {sit.frameworks.map((fw) => (
                      <button
                        key={fw.id}
                        onClick={() => setSelectedFw(fw.id === selectedFw ? null : fw.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ${
                          selectedFw === fw.id
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-white border-gray-100 hover:border-indigo-200"
                        }`}
                      >
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${selectedFw === fw.id ? "text-white" : "text-gray-800"}`}>
                            {fw.name}
                          </p>
                          <p className={`text-xs mt-0.5 leading-relaxed break-words ${selectedFw === fw.id ? "text-indigo-100" : "text-gray-400"}`}>
                            {fw.desc}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedFw === fw.id ? "bg-indigo-400 text-white" : "bg-gray-100 text-gray-400"}`}>
                          {fw.time}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedFw}
            className={`w-full font-semibold text-lg py-4 rounded-2xl transition-colors ${
              selectedFw
                ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {selectedFw
              ? `${isEn ? "Run" : "実行："} ${SITUATIONS.flatMap((s) => s.frameworks).find((f) => f.id === selectedFw)?.name ?? ""} →`
              : (isEn ? "Select a framework to continue" : "フレームワークを選んでください")}
          </button>
        </div>
      </main>
    );
  }

  // Step 1: Business info form
  return (
    <main className="min-h-screen bg-white flex flex-col" key={lang}>
      <section className="flex-1 px-6 py-12 max-w-lg mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">{isEn ? "← Back to Home" : "← ホームへ"}</Link>
            <LangToggle />
          </div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mt-4 mb-3">
            <span>📊</span> {isEn ? "AI Marketing Analysis" : "AIマーケティング分析"}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            {isEn ? "Analyze your business" : "あなたのビジネスを"}<br />
            <span className="text-indigo-500">{isEn ? "with proven frameworks" : "実績あるフレームワークで分析"}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-3 leading-relaxed">
            {isEn
              ? "Enter your business details and get a professional-level PEST, 3C, STP, 4P analysis generated by AI in minutes."
              : "ビジネス情報を入力するだけで、PEST・3C・STP・4PのプロレベルAI分析が数分で届きます。"}
          </p>
        </div>

        <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isEn ? "Business Name" : "ビジネス名"} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFormError(null); }}
              placeholder={isEn ? "e.g. Main Street Café / Acme Corp" : "例：メインストリートカフェ / 株式会社〇〇"}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isEn ? "Product / Service" : "商品・サービス"} <span className="text-red-400">*</span>
            </label>
            <textarea
              value={product}
              onChange={(e) => { setProduct(e.target.value); setFormError(null); }}
              placeholder={isEn ? "e.g. Lunch café using local vegetables. Takeout available." : "例：地元野菜を使ったランチカフェ。テイクアウトあり。"}
              required
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isEn ? "Target Customer" : "ターゲット顧客"} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => { setTarget(e.target.value); setFormError(null); }}
              placeholder={isEn ? "e.g. Office workers aged 30–50 who want healthy lunches" : "例：ヘルシーランチを求める30〜50代のオフィスワーカー"}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isEn ? "Price Range" : "価格帯"} <span className="text-gray-400 font-normal">({isEn ? "optional" : "任意"})</span>
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={isEn ? "e.g. avg. check $15 / monthly $50 / setup $800" : "例：平均客単価1500円 / 月額5000円 / 初期費用80000円"}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
            <p className="text-xs text-gray-400 mt-1">{isEn ? "Helps generate price-appropriate strategy and competitor analysis" : "価格に合った戦略と競合分析の精度が上がります"}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isEn ? "Website URL" : "ウェブサイトURL"} <span className="text-gray-400 font-normal">({isEn ? "optional" : "任意"})</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          {formError && (
            <div className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <button
            type="submit"
            className={`w-full font-semibold text-lg py-4 rounded-2xl transition-colors mt-2 ${
              name.trim() && product.trim() && target.trim()
                ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95"
                : "bg-gray-200 text-gray-500 hover:bg-gray-300 active:scale-95"
            }`}
          >
            {isEn ? "Choose a framework →" : "フレームワークを選ぶ →"}
          </button>
        </form>

        {/* Framework preview */}
        <div className="mt-10">
          <p className="text-xs text-gray-400 font-medium mb-4 text-center">{isEn ? "Available analysis frameworks (8 types)" : "利用可能なフレームワーク（8種類）"}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["PEST", "3C", "SWOT", "VRIO", "STP", "4P/4C", "ULSSAS", "AEO"].map((fw) => (
              <span key={fw} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{fw}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-gray-300 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="/privacy" className="hover:text-gray-500 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-500 transition-colors">Terms of Service</a>
          <a href="mailto:hello@growl-ai.com" className="hover:text-gray-500 transition-colors">Contact</a>
        </div>
        © 2026 Growl
      </footer>
    </main>
  );
}
