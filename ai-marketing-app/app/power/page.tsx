"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

type Channel = { key: string; label: string; score: number; status: "good" | "weak" | "none"; note: string; url?: string | null };
type Result = {
  found: boolean;
  score: number;
  rank: string;
  channels: Channel[];
  good: string;
  weakness: string;
  advice: string;
  share_text: string;
  quotes?: { text: string; source: string }[];
  shop: string;
  area: string;
  slug?: string;
  sources: { title: string; url: string }[];
};

const rankColor: Record<string, string> = {
  A: "from-amber-400 to-yellow-500",
  B: "from-emerald-400 to-teal-500",
  C: "from-sky-400 to-blue-500",
  D: "from-orange-400 to-red-400",
  E: "from-violet-400 to-purple-500",
};
const rankLabelJa: Record<string, string> = { A: "圧倒的", B: "高い集客力", C: "伸びしろたっぷり", D: "改善のチャンス", E: "スタートライン" };
const rankLabelEn: Record<string, string> = { A: "Outstanding", B: "Strong", C: "Room to grow", D: "Needs work", E: "Starting line" };
const STATUS_ICON: Record<string, string> = { good: "✅", weak: "⚠️", none: "❌" };
const LOADING_JA = ["お店の実データを検索中…", "口コミを読んでいます…", "SNS・公式サイト・ECを確認中…", "採点しています…"];
const LOADING_EN = ["Searching real data about this business…", "Reading reviews…", "Checking social, website & ordering…", "Scoring…"];

function gtagEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag === "function") {
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", name, params || {});
  }
}

export default function PowerPage() {
  const { lang } = useLang();
  const isEn = lang === "en";
  const [shop, setShop] = useState("");
  const [area, setArea] = useState("");
  const [step, setStep] = useState<"input" | "loading" | "result" | "error">("input");
  const [result, setResult] = useState<Result | null>(null);
  const [loadIdx, setLoadIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const LOADING = isEn ? LOADING_EN : LOADING_JA;

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get("shop"); const a = sp.get("area");
      if (s) setShop(s);
      if (a) setArea(a);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "loading") return;
    const t = setInterval(() => setLoadIdx((i) => i + 1), 2200);
    return () => clearInterval(t);
  }, [step]);

  async function diagnose() {
    if (!shop.trim()) return;
    setLoadIdx(0);
    setStep("loading");
    gtagEvent("power_start", { shop, lang });
    try {
      const res = await fetch("/api/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, area, lang: isEn ? "en" : "ja" }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as Result;
      setResult(data);
      setStep("result");
      gtagEvent("power_complete", { rank: data.rank, score: data.score, lang });
    } catch {
      setStep("error");
    }
  }

  function shareUrl() {
    const r = result && ["A", "B", "C", "D", "E"].includes(result.rank) ? result.rank : "C";
    return "https://growl-app.vercel.app/diagnosis/r/" + r;
  }
  function handleCopy() {
    if (!result) return;
    const tag = isEn ? "#ShopPowerCheck" : "#お店パワー診断";
    navigator.clipboard.writeText(result.share_text + "\n" + tag + "\n" + shareUrl());
    setCopied(true);
    gtagEvent("power_share", { platform: "copy" });
    setTimeout(() => setCopied(false), 2000);
  }
  function handleShareX() {
    if (!result) return;
    gtagEvent("power_share", { platform: "x" });
    const tag = isEn ? "#ShopPowerCheck" : "#お店パワー診断";
    const text = encodeURIComponent(result.share_text + "\n" + tag);
    window.location.href = "https://twitter.com/intent/tweet?text=" + text + "%0A" + encodeURIComponent(shareUrl());
  }

  if (step === "loading") {
    const steps = isEn ? ["Searching real data", "AI analysis", "Scoring"] : ["実データ検索", "AI分析", "採点"];
    const cur = loadIdx < 3 ? 0 : loadIdx < 7 ? 1 : 2;
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="flex items-start gap-3 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < cur ? "bg-indigo-500 border-indigo-500 text-white" : i === cur ? "border-indigo-500 text-indigo-500" : "border-gray-200 text-gray-300"}`}>
                  {i < cur ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] mt-1 ${i <= cur ? "text-indigo-500 font-medium" : "text-gray-300"}`}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 mt-4 ${i < cur ? "bg-indigo-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">{LOADING[loadIdx % LOADING.length]}</p>
        <p className="text-xs text-gray-400 mt-2">
          {isEn ? "Real public web data only (about 20s)" : "実在するWeb情報だけで採点します（約20秒）"}
        </p>
      </main>
    );
  }

  if (step === "result" && result) {
    const rank = ["A", "B", "C", "D", "E"].includes(result.rank) ? result.rank : "C";
    const rLabel = isEn ? rankLabelEn[rank] : rankLabelJa[rank];
    return (
      <main className="min-h-screen bg-white px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white mb-6 shadow-xl">
            <p className="text-[11px] font-medium text-indigo-300 uppercase tracking-widest mb-1">
              {isEn ? "Shop Power Check — real data" : "お店パワー診断・実データ"}
            </p>
            <p className="text-sm text-slate-300 mb-5">{result.shop}{result.area ? `（${result.area}）` : ""}</p>
            <div className="flex items-center gap-5 mb-6">
              <div className={`flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br ${rankColor[rank]} text-white text-5xl font-extrabold shadow-lg shrink-0`}>
                {rank}
              </div>
              <div>
                <p className="text-lg font-semibold">{rLabel}</p>
                <p className="text-4xl font-extrabold mt-1">{result.score}<span className="text-base font-normal text-slate-400"> / 100</span></p>
              </div>
            </div>
            <div className="flex gap-1.5 items-end">
              {["E", "D", "C", "B", "A"].map((g) => (
                <div key={g} className="flex-1 text-center">
                  <div className={`h-1.5 rounded-full mb-1 ${g === rank ? "bg-white" : "bg-slate-700"}`} />
                  <span className={`text-[10px] ${g === rank ? "text-white font-bold" : "text-slate-500"}`}>{g}</span>
                </div>
              ))}
            </div>
            <p className="text-right text-[10px] text-slate-500 mt-4">powered by Growl</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6">
            {(result.channels ?? []).map((c) => (
              <div key={c.key} className="mb-4 last:mb-0">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{STATUS_ICON[c.status] ?? "⚠️"} {c.label}</span>
                  <span>{c.score} / 20</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(Math.max(0, Math.min(20, c.score)) / 20) * 100}%` }} />
                </div>
                <div className="flex items-center gap-2">
                  {c.note && <p className="text-xs text-gray-400">{c.note}</p>}
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-400 underline shrink-0">
                      {isEn ? "open →" : "開く →"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {result.quotes && result.quotes.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-5 mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                {isEn ? "Real voices found online" : "ネット上の実際の声"}
              </p>
              {result.quotes.map((q) => (
                <blockquote key={q.text} className="border-l-2 border-indigo-300 pl-3 mb-3 last:mb-0">
                  <p className="text-sm text-gray-700">“{q.text}”</p>
                  <p className="text-xs text-gray-400 mt-1">— {q.source}</p>
                </blockquote>
              ))}
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="mb-4">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">{isEn ? "Strength" : "強み"}</span>
              <p className="text-gray-800 mt-1 text-sm">{result.good}</p>
            </div>
            <div className="mb-4">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wide">{isEn ? "Weak spot" : "弱点"}</span>
              <p className="text-gray-800 mt-1 text-sm">{result.weakness}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">
                {isEn ? "Do this today (30 min)" : "今日30分でできること"}
              </span>
              <p className="text-gray-800 mt-1 text-sm">{result.advice}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button onClick={handleCopy} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {copied ? (isEn ? "Copied!" : "コピーしました！") : (isEn ? "Copy to share" : "シェア文をコピー")}
            </button>
            <button onClick={handleShareX} className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800">
              {isEn ? "Share on 𝕏" : "𝕏 でシェア"}
            </button>
          </div>

          {result.slug && (
            <Link href={"/power/" + result.slug} className="block text-center text-xs text-indigo-400 underline mb-6">
              {isEn ? "View this shop's score history page" : "この店の診断ページ（スコア履歴）を見る"}
            </Link>
          )}

          {result.sources?.length > 0 && (
            <details className="mb-8 text-xs text-gray-400">
              <summary className="cursor-pointer">
                {isEn ? `Real data used for scoring (${result.sources.length})` : `採点に使った実データ（${result.sources.length}件）`}
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {result.sources.map((s) => (
                  <li key={s.url} className="truncate"><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a></li>
                ))}
              </ul>
            </details>
          )}

          <div className="bg-indigo-600 rounded-2xl p-6 text-center mb-6">
            <p className="text-white font-bold mb-2">
              {isEn ? "Your weak spots are fixable." : `「${result.weakness?.slice(0, 18)}…」は直せます`}
            </p>
            <p className="text-indigo-200 text-sm mb-4">
              {isEn
                ? "Growl hands you 3 ready-to-use marketing actions for your shop every week. Free to start."
                : "Growlが毎週、あなたのお店専用の集客アクションを3つ届けます。無料で試せます。"}
            </p>
            <Link href="/onboarding/industry" className="inline-block bg-white text-indigo-600 font-semibold text-sm px-6 py-3 rounded-xl">
              {isEn ? "Get my 3 free actions" : "無料で3アクションを受け取る"}
            </Link>
          </div>

          <button onClick={() => { setStep("input"); setResult(null); }} className="w-full text-sm text-gray-400 hover:text-indigo-500">
            {isEn ? "← Check another shop (try a competitor)" : "← 別のお店を診断する（ライバル店もどうぞ）"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col px-4 py-6">
      <div className="flex justify-end"><LangToggle /></div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-3">
            {isEn ? "Free · No signup · Real data" : "無料・登録不要・実データ採点"}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{isEn ? "Shop Power Check" : "お店パワー診断"}</h1>
          <p className="text-gray-500 text-sm mb-8">
            {isEn ? (
              <>Type your shop name. AI gathers <b>real public web data</b> (Google, Yelp, TripAdvisor, social, delivery apps) and scores your online customer-attraction power across 5 channels. Works on competitors too.</>
            ) : (
              <>店名を入れるだけ。Google・食べログ・SNSなどの<b>実在するWeb情報</b>をAIがその場で集めて、評価・口コミ・SNS・公式サイト・EC対応の5チャネルを100点満点で採点します。ライバル店の診断もできます。</>
            )}
          </p>
          {step === "error" && (
            <p className="text-sm text-red-500 mb-4">
              {isEn ? "Diagnosis failed. Please try again in a moment." : "診断に失敗しました。少し時間をおいてもう一度お試しください。"}
            </p>
          )}
          <input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder={isEn ? "Shop name (e.g. Joe's Pizza)" : "店名（例: カフェ・ド・ナオ）"}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-indigo-400"
          />
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={isEn ? "City / area (optional)" : "地域（例: 横浜・任意）"}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={diagnose}
            disabled={!shop.trim()}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-lg py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200 active:scale-95"
          >
            {isEn ? "Check with real data →" : "実データで診断する →"}
          </button>
          <p className="text-xs text-gray-400 mt-3">
            {isEn ? "About 20 seconds · public information only" : "約20秒・公開されている情報のみを使用します"}
          </p>
          <p className="text-xs text-gray-300 mt-8">
            {isEn ? <>Prefer a 5-question quick check? <Link href="/diagnosis" className="underline">Quick diagnosis</Link></> : <>かんたん5問で診断したい方は <Link href="/diagnosis" className="underline">クイック診断</Link> へ</>}
          </p>
        </div>
      </div>
    </main>
  );
}
