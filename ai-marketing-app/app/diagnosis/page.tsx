"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { useLang } from "@/lib/i18n";
import { isPaidPlan } from "@/components/FreeProgressBar";

type Step = "quiz" | "loading" | "result";
type Answer = string;

interface Result {
  rank: string;
  rank_label: string;
  score: number;
  weakness: string;
  free_tip: string;
  share_text: string;
  share_text_en: string;
}

const questionsJa = [
  { key: "industry", q: "どんなお店・お仕事ですか？", options: ["飲食店", "美容サロン", "EC・通販", "士業・コンサル", "工務店・建設", "整体・ボディケア", "教室・スクール", "その他"] },
  { key: "post_frequency", q: "SNSの更新、できてますか？", options: ["ほぼ毎日", "週2〜3回", "週1回くらい", "月に数回", "ほとんどできてない"] },
  { key: "pain_type", q: "集客でいちばん悩んでることは？", options: ["新規のお客さんが来ない", "リピートしてくれない", "投稿が続かない・ネタ切れ", "広告費ばかりかさむ", "何から手をつければいいかわからない"] },
  { key: "review_managed", q: "お店のGoogleクチコミ、どうしてますか？", options: ["毎回ていねいに返信してる", "時間があるときだけ返してる", "見てるけど返せてない", "まだ見る余裕がない"] },
  { key: "goal", q: "3ヶ月後、どんな状態になっていたい？", options: ["売上をしっかり伸ばしたい", "新規のお客さんを増やしたい", "リピーター・常連を育てたい", "SNSでお店のファンを増やしたい", "いますぐ結果はわからないけど、前に進みたい"] },
];

const questionsEn = [
  { key: "industry", q: "What kind of business do you run?", options: ["Restaurant", "Beauty Salon", "E-commerce", "Consulting / Legal", "Construction", "Health & Body Care", "School / Classes", "Other"] },
  { key: "post_frequency", q: "How's your SNS posting going?", options: ["Almost every day", "2-3 times a week", "About once a week", "A few times a month", "Haven't really started"] },
  { key: "pain_type", q: "What's your biggest marketing headache?", options: ["Not enough new customers", "They come once, don't return", "I run out of things to post", "Ads cost too much for what I get", "Honestly, I don't know where to start"] },
  { key: "review_managed", q: "What do you do with Google reviews?", options: ["I reply to every single one", "I reply when I can", "I read them but haven't replied", "Haven't had time to look yet"] },
  { key: "goal", q: "Where do you want to be in 3 months?", options: ["Growing revenue steadily", "More new customers through the door", "A loyal group of regulars", "A following on social media", "Honestly just want things to feel better than now"] },
];

const rankEmoji: Record<string, string> = { A: "🏆", B: "🌟", C: "📈", D: "🔧", E: "🌱" };
const rankColor: Record<string, string> = {
  A: "from-emerald-400 to-green-500",
  B: "from-blue-400 to-indigo-500",
  C: "from-amber-400 to-orange-500",
  D: "from-orange-400 to-red-400",
  E: "from-gray-400 to-gray-500",
};

export default function DiagnosisPage() {
  const { t, lang } = useLang();
  const isEn = lang === "en";
  const questions = isEn ? questionsEn : questionsJa;

  const [step, setStep] = useState<Step>("quiz");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => { setIsPaid(isPaidPlan()); }, []);

  // Dynamic page title for SEO
  useEffect(() => {
    if (step === "result" && result) {
      document.title = isEn
        ? `My SNS Score: ${result.rank} (${result.score}/100) - Growl Diagnosis`
        : `私のSNS集客力: ${result.rank} (${result.score}点) - Growl診断`;
    } else if (step === "quiz") {
      document.title = isEn
        ? "Free SNS Marketing Score - Diagnose Your Business in 5 Questions | Growl"
        : "SNS集客力診断 - 5問でわかるあなたのお店のマーケティング力 | Growl";
    }
  }, [step, result, isEn]);

  // Structured data for rich search results
  useEffect(() => {
    const existing = document.getElementById("seo-schema");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "seo-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: isEn ? "Free SNS Marketing Score Diagnostic" : "SNS集客力診断ツール",
      description: isEn
        ? "Answer 5 questions and get an A-E score for your small business social media marketing. Free, no signup."
        : "5問答えるだけであなたのビジネスのSNS集客力をA〜Eで診断。無料、登録不要。",
      url: "https://growl-ai.com/diagnosis",
      applicationCategory: "MarketingApplication",
      operatingSystem: "Web",
    });
    document.head.appendChild(script);
  }, [isEn]);

  useEffect(() => {
    if (step === "quiz" && !startedRef.current) {
      startedRef.current = true;
      track("diagnosis_start");
    }
  }, [step]);

  useEffect(() => {
    if (step === "quiz") {
      track("diagnosis_question_view", { question_num: currentQ + 1 });
    }
  }, [currentQ, step]);

  async function handleAnswer(option: string) {
    const key = questions[currentQ].key;
    const newAnswers = { ...answers, [key]: option };
    setAnswers(newAnswers);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("loading");
      try {
        const res = await fetch("/api/diagnosis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newAnswers, lang }),
        });
        const data = await res.json();
        if (data.rank) {
          setResult(data);
          setStep("result");
          track("diagnosis_complete", { score_rank: data.rank, weakness: data.weakness });
        } else {
          setResult(null);
          setStep("quiz");
        }
      } catch {
        setStep("quiz");
      }
    }
  }

  function handleBack() {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  }

  function handleCopy() {
    if (!result) return;
    const text = (isEn ? result.share_text_en : result.share_text) +
      "\nhttps://growl-ai.com/diagnosis/r/" + result.rank;
    navigator.clipboard.writeText(text);
    setCopied(true);
    track("diagnosis_share", { platform: "copy" });
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareX() {
    if (!result) return;
    const text = encodeURIComponent(result.share_text_en);
    const url = encodeURIComponent("https://growl-ai.com/diagnosis/r/" + result.rank);
    track("diagnosis_share", { platform: "x" });
    window.open(`https://twitter.com/intent/tweet?text=${text}%0A${url}`, "_blank");
  }

  if (step === "quiz") {
    const q = questions[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;

    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="text-sm text-gray-400 mb-2 text-center">
              {isEn ? `Question ${currentQ + 1} / ${questions.length}` : `質問 ${currentQ + 1} / ${questions.length}`}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <h1 className="text-xl font-bold text-gray-900 text-center mb-8">{q.q}</h1>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="w-full text-left px-5 py-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-gray-700 font-medium"
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Back */}
          {currentQ > 0 && (
            <button
              onClick={handleBack}
              className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← {isEn ? "Back" : "戻る"}
            </button>
          )}
        </div>
      </main>
    );
  }

  if (step === "loading") {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{isEn ? "Analyzing your answers..." : "あなたの集客力を分析中..."}</p>
        </div>
      </main>
    );
  }

  // Result screen
  if (step === "result" && result) {
    const { rank, rank_label: label, score, weakness, free_tip: tip } = result;
    const emoji = rankEmoji[rank] || rankEmoji.C;
    const gradient = rankColor[rank] || rankColor.C;

    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Rank circle */}
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${gradient} text-white text-5xl font-extrabold shadow-lg mb-4`}
            >
              {rank}
            </div>
            <p className="text-lg text-gray-700 font-semibold">{emoji} {label}</p>
            <p className="text-sm text-gray-400 mt-1">
              {isEn ? `Score: ${score} / 100` : `スコア: ${score} / 100`}
            </p>
          </div>

          {/* Weakness + Tip */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="mb-4">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wide">
                {isEn ? "Weak point" : "弱いポイント"}
              </span>
              <p className="text-gray-800 font-medium mt-1">{weakness}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">
                {isEn ? "Try this today" : "今すぐできること"}
              </span>
              <p className="text-gray-800 mt-1">{tip}</p>
            </div>
          </div>

          {/* Rank share card (rank-A..E.svg, restored 2026-06-10) */}
          <div className="mb-6">
            <img
              src={`/diagnosis/rank-${["A","B","C","D","E"].includes(rank) ? rank : "C"}.svg`}
              alt={isEn ? `Growl SNS Diagnosis - Rank ${rank}` : `Growl SNS診断 ランク${rank}`}
              className="w-full rounded-2xl border border-gray-100 shadow-sm"
            />
            <p className="text-center text-xs text-gray-400 mt-2">
              {isEn ? "Save this card & share it on your story" : "この画像を保存してストーリーズ等でシェアできます"}
            </p>
          </div>

          {/* Share buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? (isEn ? "Copied!" : "コピーしました！") : (isEn ? "Copy to share" : "シェア文をコピー")}
            </button>
            <button
              onClick={handleShareX}
              className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              {isEn ? "Share on 𝕏" : "𝕏 でシェア"}
            </button>
          </div>

          {/* CTA */}
          {isPaid ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
              <p className="text-indigo-900 font-bold text-lg mb-2">
                {isEn
                  ? `Your "${weakness}" gap? We fix exactly that.`
                  : `「${weakness}」を直すところから、はじめませんか。`}
              </p>
              <p className="text-indigo-700 text-sm mb-4">
                {isEn
                  ? "Every week, AI picks 3 marketing actions for your business — ready to copy and paste."
                  : "AIがあなたの業種と今の悩みに合わせて、今週やるべき3つの集客施策をお届けします。"}
              </p>
              <Link
                href="/onboarding/industry"
                onClick={() => track("diagnosis_cta_click", { weakness })}
                className="inline-block px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors"
              >
                {isEn ? "See my 3 actions this week →" : "今週やるべき3つを見る →"}
              </Link>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <p className="text-amber-900 font-bold text-lg mb-2">
                {isEn
                  ? `Your "${weakness}" is fixable — here's how`
                  : `「${weakness}」は直せます`}
              </p>
              <p className="text-amber-700 text-sm mb-4">
                {isEn
                  ? "Upgrade to Standard ($29/mo) to get 3 ready-to-use marketing actions every week, customized for your business."
                  : "スタンダードプラン(¥3,000/月)で、あなたの業種と悩みに合わせた今週の集客施策が毎週届きます。"}
              </p>
              <Link
                href="/upgrade"
                onClick={() => track("diagnosis_cta_click", { weakness })}
                className="inline-block px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
              >
                {isEn ? "Upgrade to Standard ($29/mo) →" : "スタンダードにアップグレード →"}
              </Link>
            </div>
          )}

        </div>
      </main>
    );
  }

  return null;
}
