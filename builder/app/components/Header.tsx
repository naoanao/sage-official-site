"use client";

import { Sparkles, Cpu, ExternalLink } from "lucide-react";

export function Header() {
    return (
        <header
            className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b px-5"
            style={{ borderColor: "var(--border)", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)" }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div
                    className="relative flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #00d4ff)" }}
                >
                    <Sparkles size={14} className="text-white" />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold tracking-widest uppercase gradient-text">SAGE</span>
                    <span className="text-xs text-gray-500 font-mono">/ Builder</span>
                </div>
            </div>

            {/* Center */}
            <div
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono"
                style={{ borderColor: "var(--border)", background: "rgba(124,58,237,0.06)" }}
            >
                <Cpu size={11} className="text-purple-400" />
                <span className="text-gray-400">Gemini</span>
                <span className="text-gray-600 mx-1">&middot;</span>
                <span className="text-gray-400">Agent Loop</span>
                <span
                    className="ml-2 h-1.5 w-1.5 rounded-full bg-green-400"
                    style={{ boxShadow: "0 0 6px rgba(74,222,128,0.8)" }}
                />
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
                <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    style={{ border: "1px solid var(--border)" }}
                >
                    <ExternalLink size={11} />
                    <span>SAGE Home</span>
                </a>
            </div>
        </header>
    );
}
