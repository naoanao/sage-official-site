"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadSession, loadSessionHistory, SessionSummary } from "@/lib/store";
import { getUsageData } from "@/components/FreeProgressBar";
import { Action } from "@/lib/types";

const FREE_LIMIT = 5;

function formatWeekLabel(weekStart: string): string {
  try {
    const d = new Date(weekStart);
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    const fmt = (dt: Date) =>
      `${dt.getMonth() + 1}/${dt.getDate()}`;
    return `${fmt(d)}〜${fmt(end)}`;
  } catch {
    return weekStart;
  }
}

function BlurOverlay() {
  const router = useRouter();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl z-10"
      style={{ backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.7)" }}>
      <div className="text-center px-6">
        <div className="text-3xl mb-3">🔒</div>
        <p className="font-bold text-gray-800 text-base mb-2">月次レポートはスタンダード以上</p>
        <p className="text-sm text-gray-500 mb-5">
          完了したコンテンツ・効果・傾向が<br />まとめて見られます
        </p>
        <button
          onClick={() => router.push("/upgrade")}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all active:scale-95"
        >
          プランを見る →
        </button>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [actions, setActions] = useState<Action[]>([]);
  const [pastWeeks, setPastWeeks] = useState<SessionSummary[]>([]);
  const usage = typeof window !== "undefined" ? getUsageData() : { count: 0, month: "" };
  const isDevMode = typeof window !== "undefined" && localStorage.getItem("growl_dev") === "true";
  const isFree = isDevMode ? false : usage.count < FREE_LIMIT;

  useEffect(() => {
    const s = loadSession();
    if (s) setActions(s.actions);

    // 過去週の履歴（今週を除いた直近4週分）
    const history = loadSessionHistory();
    const currentWeek = s?.week_start;
    const filtered = history
      .filter((h) => h.week_start !== currentWeek)
      .slice(0, 4);
    setPastWeeks(filtered);
  }, []);

  const done = actions.filter((a) => a.completed);
  const completionRate = actions.length > 0 ? Math.round((done.length / actions.length) * 100) : 0;

  // 累計完了タスク数（今週 + 過去週）
  const totalDoneAllTime =
    done.length + pastWeeks.reduce((sum, w) => sum + w.done_count, 0);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">
            月次レポート
          </p>
          <h1 className="text-2xl font-bold text-gray-900">今月のマーケ実績</h1>
          <p className="text-sm text-gray-400 mt-1">AIが動かした活動のまとめ</p>
        </div>

        {/* 累計バッジ */}
        {totalDoneAllTime >= 3 && (
          <div className="bg-indigo-600 text-white rounded-2xl p-4 mb-4 flex items-center gap-4">
            <div className="text-3xl">🔥</div>
            <div>
              <p className="font-bold text-lg">累計 {totalDoneAllTime} タスク完了</p>
              <p className="text-xs text-indigo-200 mt-0.5">継続がマーケの最大の武器です</p>
            </div>
          </div>
        )}

        {/* This week summary */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 mb-4">
          <p className="text-sm font-semibold text-gray-600 mb-4">今週の実績</p>
          <div className="flex gap-4">
            <div className="flex-1 text-center bg-indigo-50 rounded-xl p-3">
              <p className="text-3xl font-bold text-indigo-600">{done.length}</p>
              <p className="text-xs text-gray-400 mt-1">完了したタスク</p>
            </div>
            <div className="flex-1 text-center bg-green-50 rounded-xl p-3">
              <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
              <p className="text-xs text-gray-400 mt-1">実行率</p>
            </div>
          </div>
          {done.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {done.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-green-500">✓</span>
                  <span>{a.content_type}</span>
                  <span className="text-gray-300">—</span>
                  <span className="text-gray-500 truncate">{a.title}</span>
                  {a.result_memo && (
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                      a.result_memo === "効果あり"
                        ? "bg-green-100 text-green-600"
                        : a.result_memo === "効果なし"
                        ? "bg-red-100 text-red-500"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {a.result_memo}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past weeks — real data or placeholder */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-600 mb-4">過去4週間の実績</p>
            {pastWeeks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {pastWeeks.map((w) => (
                  <div key={w.week_start} className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">{formatWeekLabel(w.week_start)}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {Array.from({ length: w.total_count }).map((_, j) => (
                          <div
                            key={j}
                            className={`w-4 h-4 rounded-sm ${j < w.done_count ? "bg-indigo-400" : "bg-gray-100"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{w.done_count}/{w.total_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">来週以降、ここに実績が積み上がります</p>
                <p className="text-gray-300 text-xs mt-1">継続するほどAIの提案も精度が上がります 📈</p>
              </div>
            )}
          </div>
          {isFree && pastWeeks.length > 0 && <BlurOverlay />}
        </div>

        {isFree && pastWeeks.length > 0 && (
          <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-indigo-700">
              月次レポートの全データはスタンダードプランで
            </p>
            <button
              onClick={() => router.push("/upgrade")}
              className="mt-2 text-sm font-bold text-indigo-600 underline"
            >
              プランを確認する →
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-400 hover:text-indigo-500 transition-colors"
          >
            ← ダッシュボードに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
