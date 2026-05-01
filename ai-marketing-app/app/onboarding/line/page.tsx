"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LineOnboardingPage() {
  const router = useRouter();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);

  const LINE_ADD_URL = process.env.NEXT_PUBLIC_LINE_BOT_URL ?? "https://line.me/R/ti/p/@growl";

  useEffect(() => {
    const deviceId = localStorage.getItem("growl_device_id");
    if (!deviceId) { router.push("/dashboard"); return; }

    fetch("/api/line/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.link_code) setLinkCode(d.link_code); })
      .finally(() => setLoading(false));
  }, [router]);

  // 20秒おきにリンク完了チェック
  useEffect(() => {
    if (!linkCode) return;
    const interval = setInterval(async () => {
      const deviceId = localStorage.getItem("growl_device_id");
      if (!deviceId) return;
      // ユーザーのline_user_idが設定されたか確認
      const res = await fetch(`/api/line/status?device_id=${deviceId}`);
      const data = await res.json();
      if (data.linked) {
        setLinked(true);
        clearInterval(interval);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [linkCode]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">準備中...</p>
      </main>
    );
  }

  if (linked) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-5">🎉</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">LINE連携完了！</h1>
          <p className="text-sm text-gray-500 mb-8">
            毎週月曜の朝8時に、今週の3つが届きます。<br />あとは何もしなくて大丈夫です。
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl"
          >
            ダッシュボードへ →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">LINEと連携する</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            毎週月曜の朝8時に、今週やること3つを<br />LINEで自動でお届けします
          </p>
        </div>

        {/* ステップ */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 space-y-4">
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">1</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">GrowlのLINEを友達追加</p>
              <a
                href={LINE_ADD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
              >
                友達追加する →
              </a>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">2</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">以下のコードをLINEで送信</p>
              {linkCode ? (
                <div className="mt-2 bg-indigo-50 border-2 border-indigo-200 rounded-xl px-6 py-3 text-center">
                  <p className="text-3xl font-bold text-indigo-600 tracking-widest">{linkCode}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-1">コード取得中...</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 bg-gray-300 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">3</div>
            <div>
              <p className="text-sm font-semibold text-gray-500">連携完了 → 毎週自動で届く</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          スキップする（後で設定できます）
        </button>
      </div>
    </main>
  );
}
