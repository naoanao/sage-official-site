import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiPlay, FiX } from 'react-icons/fi';
import axios from 'axios';
import { BACKEND_URL } from '../config/backendUrl';

const api = axios.create({ baseURL: BACKEND_URL, timeout: 60000 });

const PLACEHOLDERS = {
    2: 'Ask Sage about content generation...',
    3: 'Give rewrite instructions...',
    4: 'Anything to check before publishing?',
};

const SageMiniChat = ({ phase, topic }) => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const send = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const phaseLabel = ['', 'TALK', 'CREATE', 'REFINE', 'PUBLISH'][phase] || '';
            const systemContext = `[Current Phase: ${phaseLabel}${topic ? ` | Topic: ${topic}` : ''}]`;
            const res = await api.post('/api/chat', { message: `${systemContext} ${userMsg}` });
            setMessages(prev => [...prev, { role: 'sage', content: res.data.response || 'No response.' }]);
        } catch (e) {
            const err = e?.response?.data?.error || e?.message || 'Unavailable';
            setMessages(prev => [...prev, { role: 'sage', content: `Sorry, Sage Chat is temporarily unavailable. (${err})` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Drawer */}
            {open && (
                <div className="w-80 h-96 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[var(--c-raised)] border-b border-[var(--c-border)]">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-sm font-bold text-[var(--c-text)]">Ask Sage</span>
                            <span className="text-xs text-[var(--c-subtle)] bg-[var(--c-raised)] px-2 py-0.5 rounded-full">
                                {['', 'TALK', 'CREATE', 'REFINE', 'PUBLISH'][phase]}
                            </span>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-[var(--c-subtle)] hover:text-[var(--c-text)] transition-colors">
                            <FiX />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center text-[var(--c-subtle)] text-xs mt-8">
                                {phase === 2 && '生成に関する質問をどうぞ'}
                                {phase === 3 && 'コンテンツの書き直し指示をどうぞ'}
                                {phase === 4 && '投稿前の確認は何でもどうぞ'}
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-[var(--c-raised)] text-[var(--c-text)] rounded-tl-none border border-[var(--c-border)]'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="px-3 py-2 rounded-xl bg-[var(--c-raised)] border border-[var(--c-border)]">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--c-muted)] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--c-muted)] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--c-muted)] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={send} className="p-3 border-t border-[var(--c-border)] bg-[var(--c-raised)]">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={PLACEHOLDERS[phase] || 'Sageに質問する...'}
                                className="flex-1 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-xs text-[var(--c-text)] focus:outline-none focus:border-blue-500 transition-colors placeholder:text-[var(--c-subtle)]"
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors"
                            >
                                <FiPlay className="w-3 h-3" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setOpen(p => !p)}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${open
                    ? 'bg-[var(--c-raised)] hover:bg-[var(--c-border)]'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                    }`}
                title="Ask Sage"
            >
                {open ? <FiX className="w-5 h-5 text-[var(--c-muted)]" /> : <FiMessageSquare className="w-5 h-5 text-white" />}
            </button>
        </div>
    );
};

export default SageMiniChat;
