import React, { useState, useEffect } from 'react';
import SpaceBackground from '../components/SpaceBackground';

const BUILDER_URL = import.meta.env.VITE_BUILDER_URL || 'http://localhost:3001';

const Builder = () => {
    const [online, setOnline] = useState(null); // null=checking, true=online, false=offline

    useEffect(() => {
        const check = () => {
            fetch(`${BUILDER_URL}/api/files`, { method: 'GET', signal: AbortSignal.timeout(2000) })
                .then(() => setOnline(true))
                .catch(() => setOnline(false));
        };
        check();
    }, []);

    // If builder is running locally, redirect into it via iframe-style full screen
    if (online === true) {
        return (
            <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
                <iframe
                    src={BUILDER_URL}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="SAGE Builder"
                />
            </div>
        );
    }

    // Not running — show launch guide
    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
            <SpaceBackground />

            {/* Header */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-black/50">
                <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    SAGE 3.0
                </div>
                <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
                    ← Home
                </a>
            </nav>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
                {/* Orbs */}
                <div className="pointer-events-none fixed inset-0">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
                    <div className="absolute bottom-1/3 left-1/3 w-64 h-64 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
                </div>

                <div className="max-w-2xl w-full">
                    {/* Icon */}
                    <div className="flex justify-center mb-8">
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #00d4ff)' }}>
                            <span className="text-4xl">⚡</span>
                            <div className="absolute inset-0 rounded-2xl animate-pulse"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #00d4ff)', opacity: 0.3 }} />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight"
                        style={{ background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        SAGE Builder
                    </h1>
                    <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                        AIと対話しながらコードを生成するローカルツール。<br />
                        Gemini Agent Loopで複数ファイルを自動生成。
                    </p>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-2 mb-10 text-sm">
                        {online === null ? (
                            <span className="text-slate-500">接続確認中...</span>
                        ) : (
                            <>
                                <span className="h-2 w-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
                                <span className="text-red-400">Builder はオフラインです</span>
                                <span className="text-slate-600">— ローカルで起動してください</span>
                            </>
                        )}
                    </div>

                    {/* Launch instructions */}
                    <div className="rounded-2xl border text-left p-6 mb-6"
                        style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.05)' }}>
                        <p className="text-xs uppercase tracking-widest text-purple-400 mb-4">起動手順</p>
                        <ol className="space-y-3 text-sm text-slate-300">
                            <li className="flex gap-3">
                                <span className="text-purple-400 font-mono font-bold shrink-0">1.</span>
                                <span>このリポジトリの <code className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded">builder/</code> ディレクトリへ移動</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-purple-400 font-mono font-bold shrink-0">2.</span>
                                <span><code className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded">.env.local.example</code> を <code className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded">.env.local</code> にコピーして <code className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded">GEMINI_API_KEY</code> を設定</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-purple-400 font-mono font-bold shrink-0">3.</span>
                                <span><code className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded">npm install &amp;&amp; npm run dev -- --port 3001</code> を実行</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-purple-400 font-mono font-bold shrink-0">4.</span>
                                <span>このページをリロードすると自動で起動します</span>
                            </li>
                        </ol>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button onClick={() => window.location.reload()}
                            className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                            再確認する
                        </button>
                        <a href={BUILDER_URL} target="_blank" rel="noreferrer"
                            className="px-6 py-3 rounded-xl font-semibold text-sm text-slate-300 border border-white/10 hover:border-purple-500/50 transition-all">
                            直接開く ↗
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Builder;
