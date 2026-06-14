"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

// データ削除リクエストページ（Meta / TikTok App Review 必須要件）。
// ユーザーが自分のデータ削除を要求できる。送信で /api/data-deletion に記録＋管理者通知。
export default function DataDeletionPage() {
  const { lang } = useLang();
  const isEn = lang === "en";
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!email.includes("@")) { setErr(isEn ? "Please enter a valid email." : "有効なメールアドレスを入力してください。"); return; }
    setBusy(true);
    try {
      const deviceId = typeof window !== "undefined" ? (localStorage.getItem("growl_device_id") || "") : "";
      const res = await fetch("/api/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), device_id: deviceId, lang: isEn ? "en" : "ja" }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setErr(String(data.error || "Failed"));
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">{isEn ? "← Home" : "← ホーム"}</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">{isEn ? "Data Deletion Request" : "データ削除のリクエスト"}</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          {isEn
            ? "You can request deletion of the personal data Growl holds about you. We store data such as your email, business profile, generated content, and any connected ad-account tokens."
            : "Growlが保持するあなたの個人データの削除をリクエストできます。当社はメールアドレス、事業プロフィール、生成コンテンツ、連携した広告アカウントのトークン等を保存しています。"}
        </p>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-6 shadow-sm">
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-gray-900">{isEn ? "Request received" : "リクエストを受け付けました"}</p>
              <p className="text-sm text-gray-500 mt-2">
                {isEn
                  ? "We'll delete your data within 30 days and email you a confirmation. Connected ad-account tokens are revoked immediately."
                  : "30日以内にデータを削除し、確認メールをお送りします。連携中の広告アカウントのトークンは即時無効化されます。"}
              </p>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isEn ? "Your email" : "メールアドレス"}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {busy ? "..." : (isEn ? "Request data deletion" : "データ削除をリクエストする")}
              </button>
              <p className="text-xs text-gray-400 mt-3">
                {isEn
                  ? "Or email us directly at contact@growl-ai.com with the subject \"Data Deletion\"."
                  : "または contact@growl-ai.com に件名「データ削除」でご連絡ください。"}
              </p>
            </>
          )}
        </div>

        <div className="mt-8 text-xs text-gray-500 leading-relaxed">
          <p className="font-semibold text-gray-700 mb-1">{isEn ? "What gets deleted" : "削除される内容"}</p>
          <p>{isEn
            ? "Your profile, email subscription, generated content history, ad-agency requests, and any stored Meta/TikTok access tokens (which are also revoked). Aggregate, non-identifying analytics may be retained."
            : "プロフィール、メール購読、生成コンテンツ履歴、広告代行の申込、保存済みのMeta/TikTokアクセストークン（無効化も実施）。個人を特定しない集計データは保持される場合があります。"}</p>
        </div>

        <p className="mt-8 text-center text-[11px] text-gray-400">
          <Link href="/privacy" className="underline">{isEn ? "Privacy Policy" : "プライバシーポリシー"}</Link> ·
          <Link href="/terms" className="underline">{isEn ? "Terms" : "利用規約"}</Link>
        </p>
      </div>
    </main>
  );
}
