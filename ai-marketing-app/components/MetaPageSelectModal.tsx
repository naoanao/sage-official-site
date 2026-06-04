"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadUserId } from "@/lib/store";
import { useLang } from "@/lib/i18n";

export default function MetaPageSelectModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useLang();
  const isEn = lang === "en";

  const [modal, setModal] = useState<{
    pages: { id: string; name: string }[];
    accounts: { id: string; name: string }[];
    deviceId: string;
  } | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get("select_page") === "1") {
      try {
        const pages = JSON.parse(decodeURIComponent(searchParams.get("pages") || "[]"));
        const accounts = JSON.parse(decodeURIComponent(searchParams.get("accounts") || "[]"));
        const deviceId = searchParams.get("device_id") || loadUserId() || "global";
        if (pages.length > 0) {
          setModal({ pages, accounts, deviceId });
          setSelectedPageId(pages[0].id);
          setSelectedAccountId(accounts[0]?.id || "");
        }
      } catch {}
    }
  }, [searchParams]);

  async function handleSave() {
    if (!modal || !selectedPageId) return;
    setSaving(true);
    try {
      const page = modal.pages.find(p => p.id === selectedPageId);
      await fetch("/api/meta-ads/select-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: modal.deviceId,
          page_id: selectedPageId,
          page_name: page?.name || "",
          ad_account_id: selectedAccountId || null,
        }),
      });
      setModal(null);
      router.replace("/dashboard?meta_connected=1");
    } catch {}
    setSaving(false);
  }

  if (!modal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-base font-bold text-gray-900 mb-1">
          {isEn ? "Select your Facebook Page" : "Facebookページを選択"}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {isEn ? "Choose the page your ads will run from." : "広告を出稿するページを選んでください。"}
        </p>

        <div className="space-y-2 mb-4">
          <label className="block text-xs font-bold text-gray-700">
            {isEn ? "Facebook Page" : "Facebookページ"}
          </label>
          <select
            value={selectedPageId}
            onChange={e => setSelectedPageId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            {modal.pages.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {modal.accounts.length > 0 && (
          <div className="space-y-2 mb-4">
            <label className="block text-xs font-bold text-gray-700">
              {isEn ? "Ad Account" : "広告アカウント"}
            </label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {modal.accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !selectedPageId}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all text-sm"
        >
          {saving ? (isEn ? "Saving..." : "保存中...") : (isEn ? "Save & Continue" : "保存して続ける")}
        </button>
      </div>
    </div>
  );
}
