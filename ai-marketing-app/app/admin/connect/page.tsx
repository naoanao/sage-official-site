"use client";

import { useState } from "react";

// 管理者用: 自分(代行先)のMeta広告アカウントを接続する。
// Graph API Explorer等で発行したトークンを貼るだけ。広告アカウント/ページは自動取得。
// トークンはサーバー側でのみ扱い、user_meta_tokens に保存される。
export default function AdminConnectPage() {
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [deviceId, setDeviceId] = useState("nao-agency");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function handleConnect() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, token: token.trim(), device_id: deviceId.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, error: String(e) });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">広告アカウントを接続（管理者）</h1>
          <p className="text-sm text-gray-500 mt-1">
            Graph API Explorer 等で発行したアクセストークンを貼るだけ。広告アカウントとページは自動で取得して保存します。
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">管理者シークレット（ADMIN_SECRET）</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Vercelに設定した ADMIN_SECRET"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">アクセストークン</label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={4}
            placeholder="EAAB... (ads_management / pages_show_list / pages_read_engagement / pages_manage_ads スコープ)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 resize-none font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">device_id（接続の識別子・通常はこのまま）</label>
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>

        <button
          onClick={handleConnect}
          disabled={loading || !secret || !token}
          className="w-full bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
        >
          {loading ? "接続中..." : "接続する"}
        </button>

        {result && (
          <div className={`rounded-xl p-3 text-sm ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
            {result.success ? (
              <div className="space-y-1">
                <p className="font-bold">✅ 接続しました</p>
                <p className="text-xs">広告アカウント: {String((result.connected_ad_account as { name?: string; id?: string })?.name || "")} ({String((result.connected_ad_account as { id?: string })?.id || "")})</p>
                <p className="text-xs">ページ: {String((result.connected_page as { name?: string })?.name || "（ページ未取得）")}</p>
                <p className="text-xs text-green-600">device_id: {String(result.device_id || "")}</p>
              </div>
            ) : (
              <p>❌ {String(result.error || "接続に失敗しました")}</p>
            )}
          </div>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          トークンは認証情報です。この画面は管理者専用です。トークンはサーバーで60日の長期トークンに変換して安全に保存され、画面には表示されません。
        </p>
      </div>
    </div>
  );
}
