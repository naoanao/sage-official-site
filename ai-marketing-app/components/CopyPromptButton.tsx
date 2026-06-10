"use client";

import { useState } from "react";

export default function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="w-full py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors active:scale-95"
    >
      {copied ? "Copied! Paste it into ChatGPT / Claude / Gemini" : "Copy this prompt"}
    </button>
  );
}
