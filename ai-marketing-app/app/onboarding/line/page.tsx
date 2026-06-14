"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";

export default function LineOnboardingPage() {
  const router = useRouter();
  const { lang } = useLang();
  const isEn = lang === "en";

  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  // 英語圏ユーザー向け: メール配信の登録（LINEの代替チャネル）
  const [email, setEmail] = useState("");
  const [subEmailBusy, setSubEmailBusy] = useState(false);
  const [subEmailDone, setSubEmailDone] = useState(false);
  const [subEmailErr, setSubEmailErr] = useState("");

  async function subscribeEmail() {
    setSubEmailErr("");
    if (!email.includes("@")) { setSubEmailErr("Please enter a valid email."); return; }
    setSubEmailBusy(true);
    try {
      const deviceId = localStorage.getItem("growl_device_id") || "global";
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, email: email.trim(), lang: "en" }),
      });
      const data = await res.json();
      if (data.success) setSubEmailDone(true);
      else setSubEmailErr(String(data.error || "Failed"));
    } catch (e) { setSubEmailErr(String(e)); }
    setSubEmailBusy(false);
  }

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

  const checkLinked = useCallback(async () => {
    const deviceId = localStorage.getItem("growl_device_id");
    if (!deviceId) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/line/status?device_id=${deviceId}`);
      const data = await res.json();
      if (data.linked) setLinked(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!linkCode || linked) return;
    const interval = setInterval(checkLinked, 5000);
    return () => clearInterval(interval);
  }, [linkCode, linked, checkLinked]);

  async function copyCode() {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  // English users: LINE is Japan-only. Offer EMAIL delivery instead (region-appropriate channel).
  if (isEn) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          {subEmailDone ? (
            <>
              <div className="text-5xl mb-4">📬</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re subscribed!</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-8">
                We&apos;ll email your 3 ready-to-use marketing actions every Monday.
              </p>
              <button type="button" onClick={() => router.push("/dashboard")}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors">
                Go to Dashboard →
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">📧</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Get your 3 actions by email</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Every Monday, we&apos;ll email ready-to-use marketing actions tailored to your business. No app to install.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {subEmailErr && <p className="text-xs text-red-500 mb-2">{subEmailErr}</p>}
              <button type="button" onClick={subscribeEmail} disabled={subEmailBusy}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-4 rounded-2xl transition-colors">
                {subEmailBusy ? "..." : "Email me weekly →"}
              </button>
              <button type="button" onClick={() => router.push("/dashboard")}
                className="w-full mt-3 text-gray-400 hover:text-gray-600 text-sm py-2">
                Skip — just go to dashboard
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
          <p className="text-gray-400 text-sm">準備中...</p>
        </div>
      </main>
    );
  }

  if (linked) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-5">🎉</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isEn ? "LINE connected!" : "LINE連携完了！"}
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {isEn
              ? <>Your 3 weekly actions will arrive every Monday at 8am.<br />Nothing else to do!</>
              : <>毎週月曜の朝8時に、今週の3つが届きます。<br />あとは何もしなくて大丈夫です。</>}
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-colors"
          >
            {isEn ? "Go to Dashboard →" : "ダッシュボードへ →"}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isEn ? "Connect LINE" : "LINEと連携する"}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {isEn
              ? <>Get your 3 weekly actions delivered automatically<br />every Monday at 8am via LINE</>
              : <>毎週月曜の朝8時に、今週やること3つを<br />LINEで自動でお届けします</>}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 space-y-5">
          {/* Step 1 */}
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">1</div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {isEn ? "Add Growl on LINE" : "GrowlのLINEを友達追加"}
              </p>
              <a
                href={LINE_ADD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
                style={{ backgroundColor: "#00B900" }}
              >
                {isEn ? "Add as friend →" : "友達追加する →"}
              </a>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100" />

          {/* Step 2 */}
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">2</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                {isEn ? "Send this code on LINE" : "このコードをLINEに送信"}
              </p>
              {linkCode ? (
                <div className="space-y-2">
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl px-6 py-3 text-center">
                    <p className="text-3xl font-bold text-indigo-600 tracking-widest">{linkCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    }`}
                  >
                    {copied
                      ? (isEn ? "✓ Copied!" : "✓ コピーしました")
                      : (isEn ? "Tap to copy" : "タップしてコピー")}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {isEn ? "Getting code..." : "コード取得中..."}
                </p>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-gray-100" />

          {/* Step 3 */}
          <div className="flex gap-3 items-start">
            <div className={`w-7 h-7 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 ${checking ? "bg-indigo-400" : "bg-gray-200"}`}>
              {checking ? (
                <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
              ) : "3"}
            </div>
            <div>
              <p className={`text-sm font-semibold ${checking ? "text-indigo-600" : "text-gray-400"}`}>
                {checking
                  ? (isEn ? "Verifying connection..." : "連携を確認中...")
                  : (isEn ? "Connected → Weekly delivery starts" : "連携完了 → 毎週自動で届く")}
              </p>
              {checking && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {isEn ? "Did you send the code on LINE?" : "LINEでコードを送信しましたか？"}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          {isEn ? "Skip (you can set this up later)" : "スキップする（後で設定できます）"}
        </button>
      </div>
    </main>
  );
}
