"use client";

import { useState } from "react";

// 管理者用: 「おまかせ代行」申込リードの一覧画面。
// ADMIN_SECRET を入れると /api/admin/leads を取得して表示する。
type Lead = {
  key?: string;
  created_at?: string;
  email?: string;
  note?: string | null;
  budget?: number | null;
  business?: { industry?: string; business_desc?: string; final_goal?: string; booking_url?: string } | null;
  ad_copy?: { headline?: string; primary_text_full?: string; cta?: string } | null;
  status?: string;
};

export default function AdminLeadsPage() {
  const [secret, setSecret] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/leads", { headers: { "x-admin-secret": secret } });
      const data = await res.json();
      if (res.ok) setLeads(data.leads || []);
      else setErr(data.error || "取得に失敗しました");
    } catch (e) {
      setErr(String(e));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">代行の申込一覧（管理者）</h1>
        <p className="text-sm text-gray-500 mb-5">「おまかせで配信を依頼」された申込を確認できます。</p>

        <div className="flex gap-2 mb-6">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={load}
            disabled={loading || !secret}
            className="bg-indigo-600 text-white font-bold text-sm px-5 rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
          >
            {loading ? "..." : "表示"}
          </button>
        </div>

        {err && <p className="text-sm text-red-500 mb-4">❌ {err}</p>}

        {leads && (
          <p className="text-xs text-gray-400 mb-3">{leads.length} 件</p>
        )}

        <div className="space-y-3">
          {leads?.map((l) => (
            <div key={l.key} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-gray-900 text-sm">{l.email || "(メール未取得)"}</p>
                <span className="text-[11px] text-gray-400">{l.created_at?.slice(0, 16).replace("T", " ")}</span>
              </div>
              <p className="text-xs text-gray-500">
                {l.business?.industry || "業種不明"}
                {l.business?.final_goal ? `／目標: ${l.business.final_goal}` : ""}
                {l.budget ? `／予算: ¥${l.budget}/日` : ""}
              </p>
              {l.ad_copy?.headline && (
                <p className="text-sm text-gray-800 mt-2">📣 {l.ad_copy.headline}</p>
              )}
              {l.note && <p className="text-xs text-gray-500 mt-1">📝 {l.note}</p>}
              {l.business?.booking_url && (
                <p className="text-xs text-indigo-500 mt-1 break-all">🔗 {l.business.booking_url}</p>
              )}
              <span className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {l.status || "new"}
              </span>
            </div>
          ))}
          {leads && leads.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">まだ申込はありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}
