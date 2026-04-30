"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { loadSession } from "@/lib/store";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-marke-bucho.vercel.app";

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

  const shareText = allDone
    ? `今週の集客、AIにぜんぶ任せました✅\n\nInstagram投稿文・Googleレビュー返信・LINE配信——\n全部AIが考えて、コピーするだけ。\n\n飲食店・サロンのオーナーさんに試してほしいです👇\n${APP_URL}`
    : `マーケのタスク、1つ終わりました✅\nAIが作ったコンテンツをそのままコピーして投稿するだけ。\n\n${APP_URL}`;

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
        <div className="text-center mb-10">
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
