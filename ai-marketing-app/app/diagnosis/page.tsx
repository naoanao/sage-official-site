"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

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
  { key: "industry", q: "業種を選んでください", options: ["飲食店", "美容サロン", "EC・通販", "士業・コンサル", "工務店・建設", "健康・ボディケア", "教育・スクール", "その他"] },
  { key: "post_frequency", q: "SNSの更新頻度は？", options: ["ほぼ毎日", "週2〜3回", "週1回", "月に数回", "ほとんど投稿していない"] },
  { key: "pain_type", q: "集客で一番の悩みは？", options: ["新規客が来ない", "リピート率が低い", "SNS投稿が続かない", "広告費が高い", "何から手をつければいいか分からない"] },
  { key: "review_managed", q: "GoogleマップやSNSのレビュー対応は？", options: ["毎回返信している", "たまに返信する", "見ているが返信しない", "見ていない"] },
  { key: "goal", q: "3ヶ月後に達成したいことは？", options: ["売上を10%上げたい", "新規顧客を増やしたい", "常連を増やしたい", "SNSのフォロワーを増やしたい", "とにかく今より良くしたい"] },
];

const questionsEn = [
  { key: "industry", q: "What's your industry?", options: ["Restaurant", "Beauty Salon", "E-commerce", "Consulting / Legal", "Construction", "Health & Body", "Education / School", "Other"] },
  { key: "post_frequency", q: "How often do you post on SNS?", options: ["Almost daily", "2-3 times / week", "Once a week", "Few times / month", "Almost never"] },
  { key: "pain_type", q: "Your biggest marketing pain?", options: ["Not enough new customers", "Low repeat rate", "Can't keep up with SNS", "Ads cost too much", "Don't know where to start"] },
  { key: "review_managed", q: "Do you respond to Google/SNS reviews?", options: ["Always reply", "Sometimes reply", "Read but don't reply", "Don't check them"] },
  { key: "goal", q: "What do you want in 3 months?", options: ["10% more revenue", "More new customers", "More repeat customers", "More SNS followers", "Just want it to be better"] },
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
    const text = isEn ? result.share_text_en : result.share_text;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareX() {
    if (!result) return;
    const text = encodeURIComponent(result.share_text_en);
    const url = encodeURIComponent("https://growl-app.vercel.app/diagnosis");
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
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
            <p className="text-indigo-900 font-bold text-lg mb-2">
              {isEn ? "Want to improve this score?" : "このスコア、上げませんか？"}
            </p>
            <p className="text-indigo-700 text-sm mb-4">
              {isEn
                ? "Get 3 marketing actions every week, customized for your business."
                : "あなたの業種と悩みに合わせた「今週やるべき3つの集客施策」をAIが届けます。"}
            </p>
            <Link
              href="/onboarding/industry"
              className="inline-block px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors"
            >
              {isEn ? "Start free →" : "無料で始める →"}
            </Link>
          </div>

        </div>
      </main>
    );
  }

  return null;
}
