"use client";

import { useState } from "react";
import { Action } from "@/lib/types";
import { useLang } from "@/lib/i18n";

interface Props {
  action: Action;
  index: number;
  sessionId: string;
  onComplete: (index: number) => void | Promise<void>;
  completing?: boolean; // 処理中フラグ（二重押し防止・スピナー表示）
}

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣"];

// Japanese role styles
const ROLE_STYLES_JA: Record<string, { label: string; bg: string; text: string }> = {
  "共感獲得": { label: "💗 共感獲得", bg: "bg-rose-50", text: "text-rose-600" },
  "行動促進": { label: "⚡ 行動促進", bg: "bg-amber-50", text: "text-amber-600" },
  "信頼構築": { label: "🛡️ 信頼構築", bg: "bg-sky-50",  text: "text-sky-600"  },
};

// English role styles
const ROLE_STYLES_EN: Record<string, { label: string; bg: string; text: string }> = {
  "Empathy": { label: "💗 Empathy",     bg: "bg-rose-50",  text: "text-rose-600"  },
  "Action":  { label: "⚡ Action",      bg: "bg-amber-50", text: "text-amber-600" },
  "Trust":   { label: "🛡️ Trust",      bg: "bg-sky-50",   text: "text-sky-600"   },
};

// Content type icons — both Japanese and English
const CONTENT_TYPE_ICONS: Record<string, string> = {
  // Japanese
  "Instagram投稿文": "📸",
  "Googleレビュー返信文": "⭐",
  "LINE配信文": "💬",
  "ブログ記事冒頭": "✍️",
  "メール文": "📧",
  "告知文": "📢",
  "X(Twitter)投稿文": "🐦",
  "チラシ文": "📄",
  // English
  "Instagram Post": "📸",
  "Google Review Reply": "⭐",
  "LINE Message": "💬",
  "Blog Intro": "✍️",
  "Email": "📧",
  "Announcement": "📢",
  "X (Twitter) Post": "🐦",
  "Flyer Copy": "📄",
};

// Content types that are ready to use directly
const DIRECTLY_USABLE_TYPES_JA = [
  "Instagram投稿文", "X(Twitter)投稿文", "LINE配信文", "メール文", "告知文", "チラシ文"
];
const DIRECTLY_USABLE_TYPES_EN = [
  "Instagram Post", "X (Twitter) Post", "LINE Message", "Email", "Announcement", "Flyer Copy"
];

const ATTRIBUTION_JA = "\n\n📊 Growlで作成";
const ATTRIBUTION_EN = "\n\n📊 Made with Growl";

// Translation maps for AI outputs (EN -> JA)
const EN_TO_JA_ROLE: Record<string, string> = {
  "Empathy": "共感獲得",
  "Action": "行動促進",
  "Trust": "信頼構築"
};

const EN_TO_JA_CONTENT_TYPE: Record<string, string> = {
  "Instagram Post": "Instagram投稿文",
  "Google Review Reply": "Googleレビュー返信文",
  "LINE Message": "LINE配信文",
  "Blog Intro": "ブログ記事冒頭",
  "Email": "メール文",
  "Announcement": "告知文",
  "X (Twitter) Post": "X(Twitter)投稿文",
  "Flyer Copy": "チラシ文"
};

function getIcon(contentType: string): string {
  return CONTENT_TYPE_ICONS[contentType] ?? "📝";
}

/**
 * AIが同じ段落・ハッシュタグブロックを複数回生成してしまった場合に除去する
 * ① 段落レベル（空行区切り）の重複除去
 * ② インラインの末尾繰り返し除去（例: 「...#abc #def #abc #def #abc #def」→「...#abc #def」）
 */
function deduplicateContent(text: string): string {
  if (!text) return text;

  // ① 段落レベル重複除去
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length > 1) {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const para of paragraphs) {
      const normalized = para.trim();
      if (!normalized) continue;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduped.push(normalized);
      }
    }
    if (deduped.length < paragraphs.filter(p => p.trim()).length) {
      return deduped.join("\n\n");
    }
  }

  // ② インライン末尾繰り返し除去
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length >= 6) {
    for (let groupSize = Math.floor(tokens.length / 2); groupSize >= 3; groupSize--) {
      const lastGroup = tokens.slice(-groupSize).join(" ");
      const prevGroup = tokens.slice(-groupSize * 2, -groupSize).join(" ");
      if (lastGroup === prevGroup) {
        return deduplicateContent(tokens.slice(0, -groupSize).join(" "));
      }
    }
  }

  return text;
}

export default function ActionCard({ action, index, sessionId, onComplete, completing = false }: Props) {
  void sessionId;
  const { lang } = useLang();
  const isEn = lang === "en";

  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const ROLE_STYLES = isEn ? ROLE_STYLES_EN : ROLE_STYLES_JA;
  // 言語間ロール名のフォールバック（AIがJA名をENモードで返す、または逆の場合も表示可能に）
  const ALL_ROLES = { ...ROLE_STYLES_JA, ...ROLE_STYLES_EN };
  
  function getRoleStyle(role: string) {
    if (!isEn && EN_TO_JA_ROLE[role]) {
      role = EN_TO_JA_ROLE[role];
    }
    return ROLE_STYLES[role] || ALL_ROLES[role];
  }

  function getDisplayContentType(type: string) {
    if (!type) return isEn ? "Content" : "コンテンツ";
    if (!isEn && EN_TO_JA_CONTENT_TYPE[type]) {
      return EN_TO_JA_CONTENT_TYPE[type];
    }
    return type;
  }

  const DIRECTLY_USABLE_TYPES = isEn ? DIRECTLY_USABLE_TYPES_EN : DIRECTLY_USABLE_TYPES_JA;
  const ATTRIBUTION = isEn ? ATTRIBUTION_EN : ATTRIBUTION_JA;

  async function handleCopy() {
    const text = deduplicateContent(action.content ?? "") + ATTRIBUTION;
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
            {action.role && (() => { const rs = getRoleStyle(action.role); return rs ? (
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${rs.bg} ${rs.text}`}>
                {rs.label}
              </span>
            ) : null; })()}
            <p className="font-bold text-gray-800 text-base leading-snug">{String(action.title ?? "")}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{String(action.detail ?? "")}</p>
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
              {isEn ? "Done!" : "やった！"}
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
              <span className="text-base">{getIcon(String(action.content_type ?? ""))}</span>
              <span className="text-xs font-semibold text-indigo-700 tracking-wide">
                {getDisplayContentType(String(action.content_type ?? ""))}
              </span>
              {DIRECTLY_USABLE_TYPES.includes(getDisplayContentType(String(action.content_type ?? ""))) && (
                <span className="text-xs text-indigo-500 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">
                  {isEn ? "Ready to use" : "そのまま使える"}
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
                  {deduplicateContent(String(action.content ?? ""))}
                </p>
                <p className="text-xs text-gray-300 mt-2">{ATTRIBUTION.trim()}</p>
              </div>

              {/* 事実確認バナー（コピー前の注意） */}
              {!action.completed && (
                <div className="mx-4 mb-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-amber-500 text-xs mt-0.5 shrink-0">⚠️</span>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {isEn
                      ? "Before copying: make sure there are no fictional product names, services, or promotions included."
                      : "コピー前に確認：存在しない商品名・サービス名・キャンペーンが含まれていないか必ずチェックしてください"}
                  </p>
                </div>
              )}

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
                      <span>{isEn ? "Copied!" : "コピーしました"}</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>{isEn ? "Copy" : "コピーする"}</span>
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
