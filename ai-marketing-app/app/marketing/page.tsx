"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadOnboarding } from "@/lib/store";

// ────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────
const SITUATIONS = [
  {
    id: "s1",
    icon: "🔭",
    title: "市場を知る",
    sub: "環境分析・勝ち筋発見",
    frameworks: [
      { id: "pest", name: "PEST分析", desc: "政治・経済・社会・技術の大きな流れを掴む", time: "5分" },
      { id: "3c", name: "3C分析", desc: "顧客・競合・自社の3視点で現状を整理する", time: "5分" },
      { id: "swot", name: "SWOT分析", desc: "強み・弱みと外部の機会・脅威を整理する", time: "5分" },
    ],
  },
  {
    id: "s2",
    icon: "💎",
    title: "差別化する",
    sub: "価値設計・強み発見",
    frameworks: [
      { id: "vrio", name: "VRIO分析", desc: "持続的競争優位を生む自社の強みを評価する", time: "5分" },
    ],
  },
  {
    id: "s3",
    icon: "🎯",
    title: "戦略を立てる",
    sub: "ターゲティング・設計",
    frameworks: [
      { id: "stp", name: "STP分析", desc: "市場を絞り、自社のポジションを確立する", time: "5分" },
      { id: "4p", name: "4P / 4C分析", desc: "商品・価格・場所・プロモーションを設計する", time: "5分" },
    ],
  },
  {
    id: "s4",
    icon: "🚀",
    title: "Web集客・AI検索対応",
    sub: "2026年最新戦略",
    frameworks: [
      { id: "ulssas", name: "ULSSAS分析", desc: "SNS時代の拡散モデルで集客の循環を設計する", time: "5分" },
      { id: "aeo", name: "AEO戦略", desc: "ChatGPT・Geminiに推薦されるブランドになる", time: "5分" },
    ],
  },
];

const CONTENT_TYPE_ICONS: Record<string, string> = {
  "Instagram投稿文": "📸",
  "Googleレビュー返信文": "⭐",
  "LINE配信文": "💬",
  "ブログ記事冒頭": "✍️",
  "メール文": "📧",
  "告知文": "📢",
  "チラシ文": "📄",
};

// ────────────────────────────────────────────
// 型
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

// AI市場調査結果の型
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
    usp_candidates: string[];
    recommended_actions: string[];
    sources: string[];
  };
  summary: string;
  generated_at: string;
}

type Step = "form" | "situation" | "loading" | "result" | "research-loading" | "research-result";

// ────────────────────────────────────────────
// ユーティリティ
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
// STP ポジショニングマップ
// ────────────────────────────────────────────
function PositioningMapChart({ data }: { data: PositioningMap }) {
  // -1〜1 の値を 0〜100% に変換
  const toPercent = (v: number) => Math.min(Math.max(((v + 1) / 2) * 100, 5), 95);

  const COLORS = ["#a78bfa", "#f472b6", "#34d399", "#fb923c", "#60a5fa"];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
      <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">ポジショニングマップ（競合比較）</p>
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>
        <div className="absolute inset-0">
          {/* 背景グリッド */}
          <div className="absolute inset-0 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            {/* 縦横の軸線 */}
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-gray-300" style={{ transform: "translateX(-50%)" }} />
            <div className="absolute top-1/2 left-0 right-0 border-t border-gray-300" style={{ transform: "translateY(-50%)" }} />
          </div>

          {/* 軸ラベル */}
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

          {/* 競合プロット */}
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
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span
                className="text-[9px] font-medium mt-0.5 text-center leading-tight whitespace-nowrap"
                style={{ color: COLORS[i % COLORS.length], maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {c.label}
              </span>
            </div>
          ))}

          {/* 自社プロット */}
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

      {/* 凡例 */}
      <div className="flex flex-wrap gap-2 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-[10px] text-gray-600 font-medium">自社</span>
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
// コンポーネント
// ────────────────────────────────────────────
export default function MarketingPage() {
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

  // AI市場調査
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  // 投稿文生成
  const [posts, setPosts] = useState<PostResult[] | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsCopied, setPostsCopied] = useState<Record<number, boolean>>({});

  const situation = SITUATIONS.find((s) => s.id === selectedSituation);

  // オンボーディングデータがあれば業種を自動取得
  useEffect(() => {
    const data = loadOnboarding();
    if (data.industry) setIndustry(data.industry);
  }, []);

  function isValidInput(str: string): boolean {
    const trimmed = str.trim();
    if (trimmed.length < 2) return false;
    // \p{L} = Unicode文字（日本語・英語どちらも含む）が1文字以上あるかチェック
    return /\p{L}/u.test(trimmed);
  }

  function scrollTop() {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
  }

  // ── Step1 → Step2
  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidInput(name) || !isValidInput(product) || !isValidInput(target)) {
      setFormError("会社名・商品・ターゲット顧客は2文字以上の具体的な内容を入力してください");
      return;
    }
    setFormError(null);
    scrollTop();
    setStep("situation");
  }

  // ── 分析実行
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      setResult(data.result);
      setStep("result");
      scrollTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("situation");
    }
  }

  // ── AI市場調査（リアルタイムWeb検索 + 3C統合）
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      setResearchResult(data);
      setStep("research-result");
      scrollTop();
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("situation");
    }
  }

  // ── 投稿文生成
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      setPosts(data.posts);
    } catch {
      // エラーは無視してUIに戻る
    } finally {
      setPostsLoading(false);
    }
  }

  // ── 分析結果コピー
  async function handleCopy() {
    if (!result) return;
    const text = [
      `■ ${result.framework}`,
      `【なぜ重要か】\n${stripMarkdown(result.why)}`,
      ...Object.entries(result.items).map(
        ([k, vs]) => `【${k}】\n${vs.map((v) => `・${stripMarkdown(v)}`).join("\n")}`
      ),
      `【インサイト】\n${stripMarkdown(result.insight)}`,
      `【今週のアクション】\n${result.actions.map((a, i) => `${i + 1}. ${stripMarkdown(a)}`).join("\n")}`,
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

  // ── 投稿文コピー
  async function handleCopyPost(index: number, content: string) {
    const text = `${content}\n\n📊 Growlで作成`;
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

  // ── リサーチローディング
  if (step === "research-loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-6" />
        <p className="text-gray-600 font-medium text-lg">AIがウェブ市場調査中です…</p>
        <p className="text-gray-400 text-sm mt-2 text-center">競合・レビュー・広告・市場規模・政府統計を並列検索中</p>
        <p className="text-gray-300 text-xs mt-1">（30〜60秒かかります）</p>
      </main>
    );
  }

  // ── AI市場調査結果
  if (step === "research-result" && researchResult) {
    const r = researchResult.research;
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setStep("situation"); setResearchResult(null); scrollTop(); }}
              className="text-gray-400 text-sm hover:text-gray-600"
            >
              ← 戻る
            </button>
            <h1 className="text-xl font-bold text-gray-900">🔍 AI市場調査レポート</h1>
          </div>

          {/* サマリーバッジ */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl px-4 py-4 mb-5 text-white shadow-lg">
            <p className="text-xs font-bold text-emerald-100 mb-1 tracking-widest uppercase">調査完了</p>
            <p className="text-sm font-semibold leading-snug">{researchResult.summary}</p>
            <p className="text-xs text-emerald-200 mt-2">Gemini 2.0 + Google Search リアルタイム調査</p>
          </div>

          {/* 顧客分析 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">👤 Customer（顧客）</p>
            {r.customer.purchase_motives.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">購買動機（★5レビューから）</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.purchase_motives.map((m, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-emerald-400 flex-shrink-0">✓</span>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.customer.pain_points.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">離脱理由・不満（★2〜3レビューから）</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.pain_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-red-400 flex-shrink-0">✗</span>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.customer.latent_needs.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">潜在ニーズ（SNS・UGCから）</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.latent_needs.map((n, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-amber-400 flex-shrink-0">💬</span>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.customer.quantitative.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">定量データ（政府統計）</p>
                <ul className="flex flex-col gap-1">
                  {r.customer.quantitative.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-blue-400 flex-shrink-0">📊</span>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 競合分析 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">⚔️ Competitor（競合）</p>
            {r.competitor.top_competitors.map((c, i) => (
              <div key={i} className="mb-3 pb-3 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                <p className="text-sm font-bold text-gray-800 mb-1">{c.name}</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">強み</p>
                    <p className="text-xs text-gray-700">{c.strength}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">弱み（チャンス）</p>
                    <p className="text-xs text-emerald-700">{c.weakness}</p>
                  </div>
                </div>
                {c.ad_count && <p className="text-xs text-gray-400 mt-1">広告: {c.ad_count}</p>}
              </div>
            ))}
            {r.competitor.ad_landscape && (
              <div className="mt-2 pt-2 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-1">広告動向</p>
                <p className="text-sm text-gray-700">{r.competitor.ad_landscape}</p>
              </div>
            )}
            {r.competitor.white_space && (
              <div className="mt-2 pt-2 border-t border-gray-50">
                <p className="text-xs font-semibold text-emerald-600 mb-1">🎯 競合の手が届いていないギャップ</p>
                <p className="text-sm text-emerald-800 font-medium">{r.competitor.white_space}</p>
              </div>
            )}
          </div>

          {/* 自社の機会 */}
          {r.company_gaps.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">🏢 Company 差別化チャンス</p>
              {r.company_gaps.map((g, i) => (
                <div key={i} className="mb-3 pb-3 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">ポイント: {g.gap}</p>
                  <p className="text-sm text-indigo-700">→ {g.opportunity}</p>
                </div>
              ))}
            </div>
          )}

          {/* 市場データ */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs font-bold text-indigo-500 mb-3 uppercase tracking-wide">📈 Market（市場）</p>
            {r.market.market_size && <p className="text-sm text-gray-700 mb-1"><span className="text-xs text-gray-400">市場規模: </span>{r.market.market_size}</p>}
            {r.market.trend && <p className="text-sm text-gray-700 mb-2"><span className="text-xs text-gray-400">トレンド: </span>{r.market.trend}</p>}
            {r.market.key_statistics.length > 0 && (
              <ul className="flex flex-col gap-1">
                {r.market.key_statistics.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-blue-300">・</span>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* USP候補 */}
          {r.usp_candidates.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-4">
              <p className="text-xs font-semibold text-amber-600 mb-2">💡 USP（差別化）候補</p>
              {r.usp_candidates.map((u, i) => (
                <p key={i} className="text-sm text-amber-900 mb-1">✦ {u}</p>
              ))}
            </div>
          )}

          {/* 今週のアクション */}
          {r.recommended_actions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">今週できるアクション（スマホ1台・30分以内）</p>
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

          {/* 情報源 */}
          {r.sources.length > 0 && (
            <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-6">
              <p className="text-xs text-gray-400 font-semibold mb-1">📚 情報源</p>
              {r.sources.map((s, i) => <p key={i} className="text-xs text-gray-500">・{s}</p>)}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-6">
            <p className="text-xs text-amber-700 leading-relaxed">
              ⚠️ この調査はAI＋ウェブ検索による自動収集です。数値・競合情報は必ずご自身で一次情報を確認の上、意思決定にご活用ください。
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setStep("situation"); setResearchResult(null); scrollTop(); }}
              className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              フレームワーク分析に戻る
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── ローディング
  if (step === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-6" />
        <p className="text-gray-600 font-medium text-lg">AIが分析中です…</p>
        <p className="text-gray-400 text-sm mt-2">
          {situation?.frameworks.find((f) => f.id === selectedFw)?.name ?? "フレームワーク"}を生成しています
        </p>
      </main>
    );
  }

  // ── 結果
  if (step === "result" && result) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setStep("situation"); setResult(null); setPosts(null); scrollTop(); }}
              className="text-gray-400 text-sm hover:text-gray-600"
            >
              ← 戻る
            </button>
            <h1 className="text-xl font-bold text-gray-900">{result.framework}</h1>
          </div>

          {/* 戦略サマリー */}
          {result.strategy_summary && (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl px-4 py-4 mb-5 text-white shadow-lg shadow-indigo-200">
              <p className="text-xs font-bold text-indigo-200 mb-3 tracking-widest uppercase">📋 戦略サマリー（1枚）</p>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-20 flex-shrink-0 pt-0.5">ターゲット</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.target}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-20 flex-shrink-0 pt-0.5">USP</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.usp}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-20 flex-shrink-0 pt-0.5">主戦場</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.main_channel}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-indigo-300 w-20 flex-shrink-0 pt-0.5">最優先施策</span>
                  <span className="text-sm font-semibold leading-snug">{result.strategy_summary.top_priority}</span>
                </div>
                <div className="mt-1 pt-2.5 border-t border-indigo-500">
                  <p className="text-xs text-indigo-300 mb-1">刺さるメッセージ</p>
                  <p className="text-base font-bold leading-snug">{result.strategy_summary.winning_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* なぜ重要か */}
          <div className="bg-indigo-50 rounded-2xl px-4 py-3 mb-5">
            <p className="text-xs text-indigo-400 font-medium mb-1">なぜこの分析が重要か</p>
            <p className="text-indigo-800 text-sm leading-relaxed">{stripMarkdown(result.why)}</p>
          </div>

          {/* フレームワーク本体 */}
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

          {/* STPポジショニングマップ */}
          {result.positioning && (
            <PositioningMapChart data={result.positioning} />
          )}

          {/* インサイト */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-5">
            <p className="text-xs font-semibold text-amber-500 mb-1">💡 インサイト</p>
            <p className="text-amber-900 text-sm leading-relaxed">{stripMarkdown(result.insight)}</p>
          </div>

          {/* 今週のアクション */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <p className="text-xs font-semibold text-gray-500 mb-3">今週できるアクション（30分以内・費用ゼロ）</p>
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

          {/* 免責注記 */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5">
            <p className="text-xs text-amber-700 leading-relaxed">
              ⚠️ この分析はAIが生成した「たたき台」です。最新の法規制・市場データは必ずご自身で確認の上、意思決定にご活用ください。経営判断の最終責任はご自身にあります。
            </p>
            {selectedFw === "pest" && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">📌 PEST分析：最新情報の確認先</p>
                <div className="flex flex-col gap-1 mt-1">
                  <a href="https://elaws.e-gov.go.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・e-Gov法令検索（P：最新の法律・規制）</a>
                  <a href="https://www.chusho.meti.go.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・中小企業庁（P：補助金・政策情報）</a>
                  <a href="https://www.meti.go.jp/statistics/index.html" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・経済産業省 統計（E：市場動向データ）</a>
                  <a href="https://www.stat.go.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・総務省 統計局（S：人口動態・消費データ）</a>
                </div>
              </div>
            )}
            {selectedFw === "3c" && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">📌 3C分析：競合・市場調査の参考先</p>
                <div className="flex flex-col gap-1 mt-1">
                  <a href="https://trends.google.co.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・Google トレンド（競合の検索需要を確認）</a>
                  <a href="https://www.j-platpat.inpit.go.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・J-PlatPat（特許・商標で競合の強みを確認）</a>
                  <a href="https://www.meti.go.jp/statistics/tyo/syougyo/index.html" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・経産省 商業動態統計（業界売上データ）</a>
                </div>
              </div>
            )}
            {selectedFw === "swot" && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">📌 SWOT分析：外部環境データの参考先</p>
                <div className="flex flex-col gap-1 mt-1">
                  <a href="https://www.chusho.meti.go.jp/pamflet/hakusyo/" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・中小企業白書（機会・脅威の業界データ）</a>
                  <a href="https://www.nri.com/jp/knowledge/report" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・野村総研 レポート（社会トレンドデータ）</a>
                  <a href="https://www.soumu.go.jp/johotsusintokei/" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・総務省 情報通信白書（T：技術トレンド）</a>
                </div>
              </div>
            )}
            {selectedFw === "stp" && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">📌 STP分析：ターゲット・市場規模の参考先</p>
                <div className="flex flex-col gap-1 mt-1">
                  <a href="https://www.stat.go.jp/data/shugyou/index.html" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・総務省 就業構造基本調査（ターゲット人口）</a>
                  <a href="https://trends.google.co.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・Google トレンド（セグメントの検索需要）</a>
                  <a href="https://www.yano.co.jp/market_reports/" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・矢野経済研究所（業界市場規模データ）</a>
                </div>
              </div>
            )}
            {selectedFw === "4p" && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">📌 4P/4C分析：価格・流通データの参考先</p>
                <div className="flex flex-col gap-1 mt-1">
                  <a href="https://www.jftc.go.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・公正取引委員会（Price：景品・価格表示規制）</a>
                  <a href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・厚生労働省（Product：食品・健康商品規制）</a>
                  <a href="https://www.caa.go.jp" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・消費者庁（Promotion：広告・表示規制）</a>
                </div>
              </div>
            )}
            {selectedFw === "aeo" && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">📌 AEO戦略：実装・検証の参考先</p>
                <div className="flex flex-col gap-1 mt-1">
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・Google Search Console（検索パフォーマンス確認）</a>
                  <a href="https://developers.google.com/search/docs/appearance/structured-data" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・Google 構造化データガイドライン</a>
                  <a href="https://schema.org/FAQPage" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・Schema.org FAQPage（Q&A構造化データ仕様）</a>
                </div>
              </div>
            )}
            {selectedFw === "ulssas" && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">📌 ULSSAS分析：SNS・UGCデータの参考先</p>
                <div className="flex flex-col gap-1 mt-1">
                  <a href="https://business.instagram.com/blog" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・Instagram ビジネスブログ（最新アルゴリズム動向）</a>
                  <a href="https://www.dentsu.co.jp/news/release/2024/index.html" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・電通 情報メディア白書（SNS利用データ）</a>
                  <a href="https://www.soumu.go.jp/johotsusintokei/statistics/statistics05b1.html" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 underline hover:text-amber-900">・総務省 SNS利用状況調査</a>
                </div>
              </div>
            )}
          </div>

          {/* ─── 投稿文生成セクション ─── */}
          <div className="mb-6">
            {!posts && !postsLoading && (
              <button
                onClick={handleGeneratePosts}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-100"
              >
                📱 この分析から投稿文を3本作る →
              </button>
            )}

            {postsLoading && (
              <div className="w-full flex flex-col items-center justify-center py-8 bg-white rounded-2xl border border-gray-100">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
                <p className="text-gray-500 text-sm">投稿文を生成中…</p>
              </div>
            )}

            {posts && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-800">📱 今日使える投稿文</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">投稿前に要事実確認</span>
                </div>

                {/* ── ハルシネーション警告チェックリスト ── */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-2">⚠️ コピーする前に必ず確認してください</p>
                  <ul className="flex flex-col gap-1.5">
                    <li className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">□</span>
                      <span>実際に存在しない<strong>商品名・メニュー名・サービス名</strong>が含まれていないか？</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">□</span>
                      <span>架空の<strong>割引率・金額・期間限定特典・キャンペーン</strong>が含まれていないか？</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">□</span>
                      <span>書かれている内容が<strong>現時点で実際に提供できる</strong>サービス・商品のみか？</span>
                    </li>
                  </ul>
                  <p className="text-xs text-amber-600 mt-2 leading-relaxed">
                    AIは入力情報をもとに文章を生成しますが、存在しない情報を追加してしまう場合があります。投稿前に必ず内容を読み返してください。
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
                        {postsCopied[i] ? "✓ コピーしました" : "📋 コピーする"}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => { setPosts(null); handleGeneratePosts(); }}
                  className="text-xs text-center text-gray-400 hover:text-indigo-500 py-2"
                >
                  🔄 別のパターンで再生成する
                </button>
              </div>
            )}
          </div>

          {/* ボタン群 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCopy}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl transition-colors active:scale-95"
            >
              {copied ? "✅ コピーしました" : "📋 分析結果をコピー"}
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
              別のフレームワークを分析する
            </button>
            <Link
              href="/onboarding/industry"
              className="w-full border border-indigo-100 text-indigo-500 font-medium py-3 rounded-2xl hover:bg-indigo-50 transition-colors text-center"
            >
              週次アクションプランを作る →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Step2: シチュエーション・FW選択
  if (step === "situation") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => { setStep("form"); setSelectedSituation(null); setSelectedFw(null); scrollTop(); }}
            className="text-gray-400 text-sm mb-4 hover:text-gray-600"
          >
            ← 自社情報を修正
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">どの分析をしますか？</h1>
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

          {/* AI リアルタイム市場調査バナー */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">AIリアルタイム市場調査</p>
                <p className="text-xs text-gray-500 mt-0.5">Amazon・楽天ランキング、レビュー、Meta/Google広告、矢野経済、政府統計をAIが自動収集して3C分析を生成</p>
              </div>
            </div>
            <button
              onClick={handleResearch}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-sm"
            >
              🌐 ウェブ情報をAIで自動収集して3C分析 →
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">所要時間: 30〜60秒</p>
          </div>

          <p className="text-xs text-gray-400 font-semibold mb-3">または：フレームワークを選んで即時AI分析</p>

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
              ? `${SITUATIONS.flatMap((s) => s.frameworks).find((f) => f.id === selectedFw)?.name ?? ""}を分析する →`
              : "フレームワークを選んでください"}
          </button>
        </div>
      </main>
    );
  }

  // ── Step1: 自社情報フォーム
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <section className="flex-1 px-6 py-12 max-w-lg mx-auto w-full">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">← ホームに戻る</Link>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mt-4 mb-3">
            <span>📊</span> AIマーケティング分析
          </div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            あなたのビジネスを<br />
            <span className="text-indigo-500">フレームワークで分析</span>
          </h1>
          <p className="text-gray-500 text-sm mt-3 leading-relaxed">
            自社情報を入力するだけで、PEST・3C・STP・4Pなど<br />プロレベルのマーケティング分析をAIが自動生成します。
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              会社名・屋号 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFormError(null); }}
              placeholder="例: 田中カフェ / 株式会社〇〇"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              商品・サービス <span className="text-red-400">*</span>
            </label>
            <textarea
              value={product}
              onChange={(e) => { setProduct(e.target.value); setFormError(null); }}
              placeholder="例: 地元野菜を使ったランチカフェ。テイクアウトも対応。"
              required
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ターゲット顧客 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => { setTarget(e.target.value); setFormError(null); }}
              placeholder="例: 30〜50代の会社員、ランチに健康的な食事を求める人"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              価格帯・客単価 <span className="text-gray-400 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="例: 客単価1,200円 / 月額5万円 / 初期費用80万円"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
            />
            <p className="text-xs text-gray-400 mt-1">入力すると価格帯に合った戦略・競合分析が出ます</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Webサイト URL <span className="text-gray-400 font-normal">（任意）</span>
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
            フレームワークを選ぶ →
          </button>
        </form>

        {/* フレームワーク一覧プレビュー */}
        <div className="mt-10">
          <p className="text-xs text-gray-400 font-medium mb-4 text-center">利用できる分析フレームワーク（8種類）</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["PEST分析", "3C分析", "SWOT分析", "VRIO分析", "STP分析", "4P/4C分析", "ULSSAS", "AEO戦略"].map((fw) => (
              <span key={fw} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{fw}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-gray-300 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="/privacy" className="hover:text-gray-500 transition-colors">プライバシーポリシー</a>
          <a href="/terms" className="hover:text-gray-500 transition-colors">利用規約</a>
          <a href="mailto:contact@growl-app.vercel.app" className="hover:text-gray-500 transition-colors">お問い合わせ</a>
        </div>
        © 2026 Growl
      </footer>
    </main>
  );
}
