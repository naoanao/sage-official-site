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
  // LINE連携状態（null=チェック中 / true=連携済み / false=未連携）
  const [lineLinked, setLineLinked] = useState<boolean | null>(null);

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
    window.addEventListener("focus", reloadSession);
    window.addEventListener("pageshow", reloadSession);
    return () => {
      window.removeEventListener("focus", reloadSession);
      window.removeEventListener("pageshow", reloadSession);
    };
  }, [router]);

  // LINE連携状態を非同期チェック（未連携ならバナー表示）
  useEffect(() => {
    const deviceId = typeof window !== "undefined"
      ? localStorage.getItem("growl_device_id")
      : null;
    if (!deviceId) {
      setLineLinked(false);
      return;
    }
    fetch(`/api/line/status?device_id=${encodeURIComponent(deviceId)}`)
      .then((r) => r.json())
      .then((d) => setLineLinked(!!d.linked))
      .catch(() => setLineLinked(false));
  }, []);

  async function handleComplete(index: number) {
    const sessionId = session?.id;
    if (!sessionId || completingIndex !== null) return;

    setCompletingIndex(index);

    updateActionComplete(index);
    const updated = loadSession();
    setSession(updated ? { ...updated } : null);

    router.push(`/complete/${sessionId}?action=${index}`);

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

        {/* ナビゲーションヘッダー */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500 transition-colors font-medium py-1"
          >
            <span>←</span>
            <span>ホームへ</span>
          </button>
          <span className="text-sm font-bold text-indigo-500 tracking-wide">Growl</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">
              今週のマーケプラン
            </p>
            <h1 className="text-2xl font-bold text-gray-900">今週やること 3つ</h1>
            <p className="text-sm text-gray-400 mt-1">
              コピーして投稿・送信するだけ。それだけでマーケが動きます
            </p>
          </div>
        </div>

        {session.strategy_note && (
          <div className="mb-5 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1.5">
              🧠 今週の戦略
            </p>
            <p className="text-sm text-indigo-800 leading-relaxed">
              {session.strategy_note}
            </p>
          </div>
        )}

        {doneCount > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">今週の進捗</span>
              <span className="text-sm font-bold text-indigo-600">{doneCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

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

        <FreeProgressBar />

        {/* LINE未連携バナー: アプリを開かなくても毎週月曜に自動で届く価値を伝える */}
        {lineLinked === false && (
          <div className="mt-6 rounded-2xl overflow-hidden shadow-md" style={{ background: "linear-gradient(135deg, #00B900 0%, #00D900 100%)" }}>
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="text-3xl shrink-0">💬</div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm mb-0.5">毎週月曜8時に自動で届く</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
                  LINEを連携すると今週の3つが月曜朝に届きます。<br />
                  アプリを開かなくてもコピペするだけ。
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding/line")}
                  className="bg-white font-bold text-sm px-4 py-2 rounded-xl transition-all active:scale-95"
                  style={{ color: "#00B900" }}
                >
                  LINEを連携する →
                </button>
              </div>
            </div>
          </div>
        )}

        {doneCount === totalCount && (
          <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="font-bold text-indigo-800 text-lg">今週のマーケ、完了！</p>
            <p className="text-sm text-indigo-600 mt-1">来週もAIが新しいコンテンツを用意します。</p>
          </div>
        )}

        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push("/product")}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3.5 rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>📈</span>
            <span>販売・リピートを伸ばす — 商品マーケAI →</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/marketing")}
            className="w-full bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 font-medium py-3 rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>📊</span>
            <span>PEST・3C・SWOT — 市場を深く分析する →</span>
          </button>
          <div className="flex justify-between items-center pt-1">
            <a
              href="/learn"
              className="text-xs text-gray-300 hover:text-indigo-400 transition-colors"
            >
              📚 マーケの基礎を学ぶ →
            </a>
            <button
              type="button"
              onClick={() => router.push("/report")}
              className="text-xs text-gray-300 hover:text-indigo-400 transition-colors"
            >
              📋 月次レポート →
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          >
            最初からやり直す
          </button>
        </div>
      </div>

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
