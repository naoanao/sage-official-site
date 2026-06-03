import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LINKS } from '../config/links';

const STEPS = [
    {
        num: '01',
        icon: '📧',
        title: 'Check your email',
        desc: 'Welcome email arrives within 5 minutes. It contains your repo access link and the full setup guide PDF.',
        time: '< 5 min',
    },
    {
        num: '02',
        icon: '📋',
        title: 'Duplicate your Notion Content Pool',
        desc: 'Open the Notion template link in the email → click Duplicate → it\'s in your workspace. This is where Sage reads your post queue from.',
        time: '2 min',
    },
    {
        num: '03',
        icon: '⚡',
        title: 'Run setup.py',
        desc: 'Clone the repo, then run: python setup.py — it walks you through every API key interactively (Groq, Notion, Bluesky, Telegram). No manual .env editing.',
        time: '~15 min',
    },
    {
        num: '04',
        icon: '☁️',
        title: 'Deploy 2 Cloudflare Workers',
        desc: 'cd workers/sage-sns-worker && wrangler deploy. Repeat for sage-content-replenisher. These are the always-on engines that post to social while you sleep.',
        time: '~10 min',
    },
    {
        num: '05',
        icon: '🚀',
        title: 'Your AI is live',
        desc: 'Tomorrow at 9 AM your first post goes out automatically. Open the Sage dashboard (localhost:5173) to manage your identity, content, and automations.',
        time: 'Total: ~30 min',
    },
];

const ThankYou = () => {
    return (
        <div className="min-h-screen bg-black text-white px-4 py-16">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="text-xs font-mono text-emerald-400 mb-3">PAYMENT CONFIRMED</div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
                            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                                You're in.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 mb-2">Your AI revenue operator is ready to deploy.</p>
                        <p className="text-sm text-slate-500">Follow the 5 steps below — you'll be live in about 30 minutes.</p>
                    </div>

                    {/* 5-step quickstart */}
                    <div className="mb-12 space-y-4">
                        {STEPS.map(({ num, icon, title, desc, time }, i) => (
                            <motion.div
                                key={num}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 + 0.2 }}
                                className="flex gap-4 p-5 rounded-xl border border-white/10 bg-white/[0.03]"
                            >
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-mono font-bold text-blue-400">
                                        {num}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{icon}</span>
                                        <span className="font-bold text-white text-sm">{title}</span>
                                        <span className="ml-auto text-xs font-mono text-slate-600 flex-shrink-0">{time}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Resources */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10"
                    >
                        <a
                            href="https://www.notion.so/3b6e24078de740c080b47f7be02965d5"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                        >
                            <span className="text-2xl">📋</span>
                            <div>
                                <div className="font-bold text-sm text-white">Notion Content Pool</div>
                                <div className="text-xs text-slate-500">Click → Duplicate into your workspace</div>
                            </div>
                        </a>
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                        >
                            <span className="text-2xl">🖥️</span>
                            <div>
                                <div className="font-bold text-sm text-white">Open Sage Dashboard</div>
                                <div className="text-xs text-slate-500">After setup — manage automations + content</div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Footer */}
                    <div className="text-center space-y-3 text-xs text-slate-600">
                        <p>
                            Manage or cancel your subscription →{' '}
                            <a href="/api/customer-portal" className="text-slate-500 hover:text-white underline transition-colors">
                                Stripe billing portal
                            </a>
                        </p>
                        <p>
                            Questions? Email{' '}
                            <a
                                href={`mailto:${LINKS.support.email}`}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                {LINKS.support.email}
                            </a>
                        </p>
                        <Link to="/" className="block text-slate-700 hover:text-slate-400 transition-colors">
                            ← Back to Sage AI
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ThankYou;
