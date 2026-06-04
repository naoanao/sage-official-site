"use client";

import { useRouter } from "next/navigation";
import ProductMarketingPanel from "@/components/product/ProductMarketingPanel";
import { loadSession } from "@/lib/store";
import { useLang } from "@/lib/i18n";

export default function ProductPage() {
  const router = useRouter();
  const { lang } = useLang();
  const isEn = lang === "en";
  const session = typeof window !== "undefined" ? loadSession() : null;
  const industry = session?.user_profile?.industry ?? "other";

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ナビゲーション */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          {isEn ? "← Back to Dashboard" : "← ダッシュボードへ"}
        </button>
      </div>

      {/* メインパネル */}
      <ProductMarketingPanel industry={industry} />
    </main>
  );
}
