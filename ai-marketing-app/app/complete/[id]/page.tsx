"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { loadSession } from "@/lib/store";
import { useLang } from "@/lib/i18n";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-app.vercel.app";

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
  const { lang } = useLang();
  const isEn = lang === "en";

  const session = loadSession();
  const actionIndex = Number(params.get("action") ?? 0);
  const action = session?.actions?.[actionIndex];
  const doneCount = session?.actions?.filter((a) => a.completed).length ?? 0;
  const allDone = doneCount === 3;

  const [sharedX, setSharedX] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [lineLinked, setLineLinked] = useState<boolean | null>(null);

  useState(() => {
    if (!allDone) return;
    const deviceId = typeof window !== "undefined"
      ? localStorage.getItem("growl_device_id")
      : null;
    if (!deviceId) { setLineLinked(false); return; }
    fetch(`/api/line/status?device_id=${encodeURIComponent(deviceId)}`)
      .then((r) => r.json())
      .then((d) => setLineLinked(!!d.linked))
      .catch(() => setLineLinked(false));
  });

  const FEEDBACK_OPTIONS = isEn ? [
    { value: "効果あり", label: "👍 It worked well",    color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" },
    { value: "普通",     label: "😐 It was average",    color: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100" },
    { value: "効果なし", label: "👎 Didn't really work", color: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" },
  ] : [
    { value: "効果あり", label: "👍 反応が良かった",        color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" },
    { value: "普通",     label: "😐 普通だった",            color: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100" },
    { value: "効果なし", label: "👎 あまり効果がなかった",  color: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" },
  ];

  const businessType = session?.user_profile?.industry ?? "";
  const industryLabelJA: Record<string, string> = {
    restaurant: "飲食店オーナー", salon: "サロンオーナー", ec: "EC・通販オーナー",
    professional: "士業・コンサルの方", construction: "工務店オーナー",
    health: "整体・エステオーナー", education: "教室・スクールオーナー",
  };
  const industryLabelEN: Record<string, string> = {
    restaurant: "restaurant owners", salon: "salon owners", ec: "e-commerce sellers",
    professional: "consultants and professionals", construction: "contractors",
    health: "wellness business owners", education: "educators and tutors",
  };

  const shareText = isEn
    ? allDone
      ? `I let AI handle all my marketing this week ✅\n\nInstagram posts, Google review replies, social content —\nAI wrote them all. I just copied and pasted.\n\nGreat for ${industryLabelEN[businessType] ?? "small business owners"} 👇\n${APP_URL}`
      : `Just finished one marketing task with AI ✅\nAI created the content — I just copied and posted.\n\n${APP_URL}`
    : allDone
      ? `今週のマーケ、AIにぜんぶ任せました✅\n\nInstagram投稿文・Googleレビュー返信・LINE配信——\n全部AIが考えて、コピーするだけ。\n\n${industryLabelJA[businessType] ?? "個人事業主・店舗オーナー"}さんに試してほしいです👇\n${APP_URL}`
      : `マーケのタスク、1つ終わりました✅\nAIが作ったコンテンツをそのままコピーして投稿するだけ。\n\n${APP_URL}`;

  async function submitFeedback(value: string) {
    if (!session?.id || feedbackSending) return;
    setFeedbackSending(true);
    try {
      await fetch("/api/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, actionIndex, resultMemo: value }),
      });
    } catch {
      // フィードバック保存失敗は無視
    } finally {
      setFeedbackSending(false);
      setFeedback(value);
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
            {allDone
              ? (isEn ? "All marketing done this week!" : "今週のマーケ、全完了！")
              : (isEn ? "Action completed!" : "1つ終わりました")}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {allDone
              ? (isEn
                  ? "Just use the AI-created content.\nThat's all it takes to move your marketing forward."
                  : "AIが作ったコンテンツを使うだけ。\nそれだけでマーケが前進します。")
              : (isEn
                  ? "Keep going with the rest when you're ready 👍"
                  : "残りもできたら、またやってみてください 👍")}
          </p>
        </div>

        {/* Feedback card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          {feedbackSending ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <span className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-400">{isEn ? "Sending..." : "送信中..."}</span>
            </div>
          ) : feedback ? (
            feedback === "効果なし" ? (
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-orange-500 mb-1">
                  {isEn ? "Got it!" : "承知しました！"}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {isEn
                    ? "Next week we'll try a different channel or tone 🔄"
                    : "来週は媒体やトーンを変えた\n別のアプローチを提案します 🔄"}
                </p>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-green-600 mb-1">
                  {isEn ? "Thanks for your feedback!" : "フィードバックありがとうございます！"}
                </p>
                <p className="text-xs text-gray-400">
                  {isEn ? "We'll use this to improve next week's suggestions 🎯" : "来週のAI提案に活かします 🎯"}
                </p>
              </div>
            )
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {isEn
                  ? `How did "${action?.title ?? "this action"}" go?`
                  : `「${action?.title ?? "この施策"}」、実際どうでしたか？`}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {isEn
                  ? "Your answer helps AI give better suggestions next week"
                  : "あなたの回答が来週のAI提案をより的確にします"}
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

        {/* All done: LINE banner */}
        {allDone && (
          <div className="mb-4">
            {lineLinked === false ? (
              <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "linear-gradient(135deg, #00B900 0%, #00D900 100%)" }}>
                <div className="px-5 py-4">
                  <p className="font-bold text-white text-sm mb-1">
                    {isEn ? "📲 Get next week's plan automatically" : "📲 来週も自動で届く仕組みを作ろう"}
                  </p>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.9)" }}>
                    {isEn
                      ? "Connect LINE and get your new actions delivered every Monday at 8am. Growl learns from your feedback and gets better each week."
                      : "LINEを連携すると、来週月曜8時に新しい施策が届きます。\nGrowlがあなたのフィードバックを学習して、さらに精度を上げます。"}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/onboarding/line")}
                    className="bg-white font-bold text-sm px-4 py-2 rounded-xl"
                    style={{ color: "#00B900" }}
                  >
                    {isEn ? "Connect LINE →" : "LINEを連携する →"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
                <p className="text-sm font-semibold text-indigo-700 mb-1">
                  {isEn ? "🧠 AI is learning from you" : "🧠 AIが学習しています"}
                </p>
                <p className="text-xs text-indigo-500 leading-relaxed">
                  {isEn
                    ? "Based on this week's feedback, next Monday's LINE notification will have even better actions tailored to your business."
                    : "今週のフィードバックをもとに、来週月曜8時のLINE通知では\nさらにあなたのお店に合った施策を届けます。"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Viral share card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {isEn ? "Know someone who'd benefit?" : "同じ悩みを持つ人に教えてあげませんか？"}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {isEn
              ? `Share with ${industryLabelEN[businessType] ?? "small business owners"} who struggle with marketing`
              : "飲食店・サロンのオーナーで「集客が大変」と言っている人に届けてください"}
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleShareX}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                sharedX ? "bg-gray-100 text-gray-500" : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              <span>𝕏</span>
              <span>{sharedX ? (isEn ? "Shared!" : "シェアしました！") : (isEn ? "Share on X" : "Xでシェアする")}</span>
            </button>

            <button
              onClick={handleShareLine}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm text-white transition-all active:scale-95"
              style={{ backgroundColor: "#00B900" }}
            >
              <span>💬</span>
              <span>{isEn ? "Share on LINE" : "LINEでシェアする"}</span>
            </button>
          </div>
        </div>

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          {isEn ? "← Back to Dashboard" : "ダッシュボードに戻る"}
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
