"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { loadSession } from "@/lib/store";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-app.vercel.app";

const FEEDBACK_OPTIONS = [
  { value: "効果あり", label: "👍 反応が良かった", color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" },
  { value: "普通", label: "😐 普通だった", color: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100" },
  { value: "効果なし", label: "👎 あまり効果がなかった", color: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" },
];

function shareToX(text: string) {
  const encoded = encodeURIComponent(text);
  window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank");
}

function shareToLine(text: string) {
  const encoded = encodeURIComponent(text);
  window.open(`https://social-plugins.line.me/lineit/share?text=${encoded}`, "_blank");
}

function CompleteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const session = loadSession();
  const actionIndex = Number(params.get("action") ?? 0);
  const action = session?.actions?.[actionIndex];
  const doneCount = session?.actions?.filter((a) => a.completed).length ?? 0;
  const allDone = doneCount === 3;

  const [sharedX, setSharedX] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);

  const shareText = allDone
    ? `今週の集客、AIにぜんぶ任せました✅\n\nInstagram投稿文・Googleレビュー返信・LINE配信——\n全部AIが考えて、コピーするだけ。\n\n飲食店・サロンのオーナーさんに試してほしいです👇\n${APP_URL}`
    : `マーケのタスク、1つ終わりました✅\nAIが作ったコンテンツをそのままコピーして投稿するだけ。\n\n${APP_URL}`;

  async function submitFeedback(value: string) {
    if (!session?.id || feedbackSending) return;
    setFeedbackSending(true);
    // スピナーを見せてからAPIを叩く（「受け取ってくれた感」の演出）
    try {
      await fetch("/api/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, actionIndex, resultMemo: value }),
      });
    } catch {
      // フィードバック保存失敗は無視（UXに影響させない）
    } finally {
      setFeedbackSending(false);
      setFeedback(value); // API完了後に切り替え（急な画面変化を防ぐ）
    }
  }

  function handleShareX() {
    shareToX(shareText);
    setSharedX(true);
  }

  function handleShareLine() {
    shareToLine(shareText);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Main message */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-5">{allDone ? "🏆" : "✅"}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            {allDone ? "今週のマーケ、全完了！" : "1つ終わりました"}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {allDone
              ? "AIが作ったコンテンツを使うだけ。\nそれだけでマーケが前進します。"
              : "残りもできたら、またやってみてください 👍"}
          </p>
        </div>

        {/* Feedback card — この施策どうでしたか？ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          {feedbackSending ? (
            /* 送信中スピナー */
            <div className="flex items-center justify-center gap-2 py-4">
              <span className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-400">送信中...</span>
            </div>
          ) : feedback ? (
            /* 送信完了 — 値によってメッセージを出し分け */
            feedback === "効果なし" ? (
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-orange-500 mb-1">承知しました！</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  来週は媒体やトーンを変えた<br />別のアプローチを提案します 🔄
                </p>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-green-600 mb-1">フィードバックありがとうございます！</p>
                <p className="text-xs text-gray-400">来週のAI提案に活かします 🎯</p>
              </div>
            )
          ) : (
            /* 未回答 — ボタン表示 */
            <>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {action ? `「${action.title}」` : "この施策"}、実際どうでしたか？
              </p>
              <p className="text-xs text-gray-400 mb-3">
                あなたの回答が来週のAI提案をより的確にします
              </p>
              <div className="flex flex-col gap-2">
                {FEEDBACK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => submitFeedback(opt.value)}
                    disabled={feedbackSending}
                    className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium transition-all active:scale-95 ${opt.color}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Viral share card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            同じ悩みを持つ人に教えてあげませんか？
          </p>
          <p className="text-xs text-gray-400 mb-4">
            飲食店・サロンのオーナーで「集客が大変」と言っている人に届けてください
          </p>

          <div className="flex flex-col gap-2">
            {/* X (Twitter) */}
            <button
              onClick={handleShareX}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                sharedX
                  ? "bg-gray-100 text-gray-500"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              <span>𝕏</span>
              <span>{sharedX ? "シェアしました！" : "Xでシェアする"}</span>
            </button>

            {/* LINE */}
            <button
              onClick={handleShareLine}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm bg-green-500 hover:bg-green-600 text-white transition-all active:scale-95"
              style={{ backgroundColor: "#00B900" }}
            >
              <span>💬</span>
              <span>LINEでシェアする</span>
            </button>
          </div>
        </div>

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          ダッシュボードに戻る
        </button>
      </div>
    </main>
  );
}

export default function CompletePage() {
  return (
    <Suspense>
      <CompleteContent />
    </Suspense>
  );
}
