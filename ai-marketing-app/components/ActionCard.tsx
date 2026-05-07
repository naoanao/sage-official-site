"use client";

import { useState } from "react";
import { Action } from "@/lib/types";

interface Props {
  action: Action;
  index: number;
  sessionId: string;
  onComplete: (index: number) => void | Promise<void>;
  completing?: boolean; // 処理中フラグ（二重押し防止・スピナー表示）
}

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣"];

const DIRECTLY_USABLE_TYPES = [
  "Instagram投稿文", "X(Twitter)投稿文", "LINE配信文", "メール文", "告知文", "チラシ文"
];

const CONTENT_TYPE_ICONS: Record<string, string> = {
  "Instagram投稿文": "📸",
  "Googleレビュー返信文": "⭐",
  "LINE配信文": "💬",
  "ブログ記事冒頭": "✍️",
  "メール文": "📧",
  "告知文": "📢",
  "X(Twitter)投稿文": "🐦",
  "チラシ文": "📄",
};

const ATTRIBUTION = "\n\n📊 Growlで作成";

function getIcon(contentType: string): string {
  return CONTENT_TYPE_ICONS[contentType] ?? "📝";
}

export default function ActionCard({ action, index, sessionId, onComplete, completing = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function handleCopy() {
    const text = (action.content ?? "") + ATTRIBUTION;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        action.completed
          ? "bg-green-50 border-green-200 opacity-80"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5 shrink-0">{NUMBER_EMOJIS[index]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-base leading-snug">{action.title}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{action.detail}</p>
          </div>
          {action.completed ? (
            <span className="shrink-0 text-green-500 text-xl mt-1">✅</span>
          ) : completing ? (
            <span className="shrink-0 flex items-center gap-1.5 bg-indigo-100 text-indigo-400 text-sm font-medium px-4 py-2 rounded-xl">
              <span className="animate-spin w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full" />
            </span>
          ) : (
            <button
              onClick={() => onComplete(index)}
              disabled={completing}
              className="shrink-0 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              やった！
            </button>
          )}
        </div>
      </div>

      {/* Content Box */}
      {action.content && (
        <div className="mx-4 mb-4 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
          {/* Label row */}
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 cursor-pointer select-none"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{getIcon(action.content_type)}</span>
              <span className="text-xs font-semibold text-indigo-700 tracking-wide">
                {action.content_type || "コンテンツ"}
              </span>
              {DIRECTLY_USABLE_TYPES.includes(action.content_type) && (
                <span className="text-xs text-indigo-500 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">
                  そのまま使える
                </span>
              )}
            </div>
            <span className="text-indigo-400 text-xs">{expanded ? "▲" : "▼"}</span>
          </div>

          {expanded && (
            <>
              {/* Content text */}
              <div className="px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {action.content}
                </p>
                <p className="text-xs text-gray-300 mt-2">{ATTRIBUTION.trim()}</p>
              </div>

              {/* Copy button */}
              <div className="px-4 pb-3 flex justify-end">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all active:scale-95 ${
                    copied
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-indigo-500 hover:bg-indigo-600 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>コピーしました</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>コピーする</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
