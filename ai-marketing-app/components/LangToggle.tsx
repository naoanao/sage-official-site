"use client";

import { useLang } from "@/lib/i18n";

export default function LangToggle() {
  const { lang, toggleLang } = useLang();

  return (
    <button
      type="button"
      onClick={toggleLang}
      className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
      aria-label="Switch language"
    >
      {lang === "ja" ? "EN" : "日本語"}
    </button>
  );
}
