"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, FileCode, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../context/ProjectContext";

type ActionItem = { name: string; path: string };
type Message = {
    role: string;
    content: string;
    actions?: ActionItem[];
};

// Renders markdown with code block and inline code support
function MessageContent({ content }: { content: string }) {
    // Split on fenced code blocks and inline code
    const parts = content.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
    return (
        <div className="text-sm space-y-2 leading-relaxed">
            {parts.map((part, i) => {
                if (part.startsWith("```")) {
                    const lines = part.split("\n");
                    const lang = lines[0].slice(3).trim() || "code";
                    const lastLine = lines[lines.length - 1];
                    const code = lines.slice(1, lastLine === "```" ? -1 : undefined).join("\n");
                    return (
                        <pre key={i} className="bg-[#050505] border border-[var(--border)] rounded-md overflow-x-auto text-xs font-mono text-gray-300">
                            <div className="flex items-center px-3 py-1.5 border-b border-[var(--border)] text-gray-500 text-xs">
                                <span>{lang}</span>
                            </div>
                            <code className="block p-3 whitespace-pre">{code}</code>
                        </pre>
                    );
                }
                if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
                    return (
                        <code key={i} className="bg-[#0a0a0a] text-blue-400 px-1.5 py-0.5 rounded text-xs font-mono border border-[var(--border)]">
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                return <span key={i} className="whitespace-pre-wrap">{part}</span>;
            })}
        </div>
    );
}

export function ChatInterface() {
    const { addTerminalLog, refreshFiles } = useProject();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "こんにちは！何を作りますか？\n\nコンポーネント、ページ、スタイル、何でも指示してください。" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [input]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isTyping) return;

        const userMessage: Message = { role: "user", content: trimmed };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: trimmed, history })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "API Error");
            }

            // Refresh file tree if files were created or deleted
            if (data.actions && data.actions.length > 0) {
                await refreshFiles();
                data.actions.forEach((action: ActionItem) => {
                    const verb = action.name === "delete_file" ? "削除" : "作成";
                    addTerminalLog(`${verb}: ${action.path}`);
                });
            }

            setMessages(prev => [...prev, {
                role: "assistant",
                content: data.content || "完了しました。",
                actions: data.actions?.length > 0 ? data.actions : undefined
            }]);

        } catch (e) {
            console.error(e);
            addTerminalLog("エラー: AIとの通信に失敗しました。");
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "申し訳ありません、エラーが発生しました。もう一度お試しください。"
            }]);
        } finally {
            setIsTyping(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends, Shift+Enter adds newline
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex w-[420px] flex-col border-r border-[var(--border)] bg-[var(--background)]">
            {/* Panel header */}
            <div className="flex h-10 items-center px-4 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AIアシスタント</span>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                            {/* Avatar */}
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.role === "assistant"
                                ? "bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white"
                                : "bg-[var(--accent)] border border-[var(--border)]"}`}>
                                {msg.role === "assistant" ? <Bot size={14} /> : <User size={14} />}
                            </div>

                            <div className="flex flex-col gap-1.5 max-w-[85%]">
                                {/* Bubble */}
                                <div className={`rounded-xl px-3 py-2.5 ${msg.role === "assistant"
                                    ? "bg-[var(--accent)] text-[var(--foreground)] rounded-tl-sm"
                                    : "bg-[var(--primary)] text-white rounded-tr-sm"}`}>
                                    {msg.role === "assistant"
                                        ? <MessageContent content={msg.content} />
                                        : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    }
                                </div>

                                {/* File action badges */}
                                {msg.actions && msg.actions.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {msg.actions.map((action, j) => (
                                            <div key={j} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs border ${action.name === "delete_file"
                                                ? "bg-red-950/30 border-red-900/50 text-red-400"
                                                : "bg-blue-950/30 border-blue-900/50 text-blue-400"}`}>
                                                {action.name === "delete_file"
                                                    ? <Trash2 size={10} />
                                                    : <FileCode size={10} />}
                                                <span className="font-mono truncate max-w-[180px]">{action.path}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Thinking indicator */}
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                    >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white">
                            <Sparkles size={14} className="animate-pulse" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl rounded-tl-sm bg-[var(--accent)] px-4 py-3">
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]" />
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]" />
                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500" />
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-[var(--border)] p-3">
                <div className="relative rounded-xl border border-[var(--border)] bg-[var(--accent)] focus-within:border-[var(--primary)] transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="AIに指示を出す...（Enterで送信、Shift+Enterで改行）"
                        disabled={isTyping}
                        rows={1}
                        className="w-full resize-none bg-transparent px-3 pt-3 pb-10 text-sm text-[var(--foreground)] placeholder-gray-600 focus:outline-none disabled:opacity-50"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                        {input.length > 0 && (
                            <span className="text-xs text-gray-600 select-none">{input.length}</span>
                        )}
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-white transition-all hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Send size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
