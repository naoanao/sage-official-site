"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadSession } from "@/lib/store";
import { getUsageData } from "@/components/FreeProgressBar";
import { Action } from "@/lib/types";

const FREE_LIMIT = 3;

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
  const usage = typeof window !== "undefined" ? getUsageData() : { count: 0, month: "" };
  const isFree = usage.count < FREE_LIMIT;

  useEffect(() => {
    const s = loadSession();
    if (s) setActions(s.actions);
  }, []);

  const done = actions.filter((a) => a.completed);
  const completionRate = actions.length > 0 ? Math.round((done.length / actions.length) * 100) : 0;

  const DUMMY_WEEKS = [
    { week: "4/21〜4/27", done: 3, total: 3 },
    { week: "4/14〜4/20", done: 2, total: 3 },
    { week: "4/7〜4/13", done: 3, total: 3 },
    { week: "3/31〜4/6", done: 1, total: 3 },
  ];

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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past weeks — blurred for free users */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-600 mb-4">過去4週間の実績</p>
            <div className="flex flex-col gap-3">
              {DUMMY_WEEKS.map((w) => (
                <div key={w.week} className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{w.week}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: w.total }).map((_, j) => (
                        <div
                          key={j}
                          className={`w-4 h-4 rounded-sm ${j < w.done ? "bg-indigo-400" : "bg-gray-100"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{w.done}/{w.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isFree && <BlurOverlay />}
        </div>

        {isFree && (
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
