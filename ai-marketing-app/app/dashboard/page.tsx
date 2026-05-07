"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession, updateActionComplete, StoredSession, clearOnboarding, clearSession } from "@/lib/store";
import ActionCard from "@/components/ActionCard";
import FreeProgressBar from "@/components/FreeProgressBar";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [completingIndex, setCompletingIndex] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    function reloadSession() {
      const s = loadSession();
      if (!s) {
        router.replace("/");
        return;
      }
      setSession({ ...s });
    }
    reloadSession();
    // ブラウザの「戻る」操作でページに戻ってきたときも状態を再読み込みする
    window.addEventListener("focus", reloadSession);
    window.addEventListener("pageshow", reloadSession);
    return () => {
      window.removeEventListener("focus", reloadSession);
      window.removeEventListener("pageshow", reloadSession);
    };
  }, [router]);

  async function handleComplete(index: number) {
    const sessionId = session?.id;
    if (!sessionId || completingIndex !== null) return; // 二重押し防止

    setCompletingIndex(index);

    // localStorageを即時更新（楽観的UI）
    updateActionComplete(index);
    const updated = loadSession();
    setSession(updated ? { ...updated } : null);

    // 画面遷移を先に実行 — APIはバックグラウンドで同期
    router.push(`/complete/${sessionId}?action=${index}`);

    // fire-and-forget（遅い回線でも画面遷移を妨げない）
    fetch("/api/complete-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, actionIndex: index, resultMemo: null }),
    }).catch((err) => {
      console.error("complete-action failed (non-fatal):", err);
    });
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  const doneCount = session.actions.filter((a) => a.completed).length;
  const totalCount = session.actions.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">
              Growlからの指示
            </p>
            <h1 className="text-2xl font-bold text-gray-900">今週やること 3つ</h1>
            <p className="text-sm text-gray-400 mt-1">
              各コンテンツをコピーして、そのまま投稿・送信するだけです
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-gray-300 hover:text-indigo-400 transition-colors font-medium"
          >
            Growl
          </button>
        </div>

        {/* Free usage progress */}
        <FreeProgressBar />

        {/* Progress bar */}
        {doneCount > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">今週の進捗</span>
              <span className="text-sm font-bold text-indigo-600">{doneCount}/{totalCount} 完了</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action cards */}
        <div className="flex flex-col gap-4">
          {session.actions.map((action, i) => (
            <ActionCard
              key={i}
              action={action}
              index={i}
              sessionId={session.id}
              onComplete={handleComplete}
              completing={completingIndex === i}
            />
          ))}
        </div>

        {/* All done */}
        {doneCount === totalCount && (
          <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="font-bold text-indigo-800 text-lg">今週のマーケ、完了！</p>
            <p className="text-sm text-indigo-600 mt-1">
              来週もAIが新しいコンテンツを用意します。
            </p>
          </div>
        )}

        {/* Footer links */}
        <div className="mt-10 border-t border-gray-100 pt-6 flex justify-between items-center">
          <button
            type="button"
            onClick={() => router.push("/report")}
            className="text-sm text-gray-400 hover:text-indigo-500 transition-colors"
          >
            📊 月次レポート
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            最初からやり直す
          </button>
        </div>
      </div>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="text-3xl text-center mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
              本当にやり直しますか？
            </h2>
            <p className="text-sm text-gray-500 text-center leading-relaxed mb-6">
              今週の施策・入力内容がすべて消えます。<br />
              この操作は取り消せません。
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  clearOnboarding();
                  clearSession();
                  router.push("/onboarding/industry");
                }}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
              >
                消して最初からやり直す
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
