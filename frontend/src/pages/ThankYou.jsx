import React from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiPackage, FiCloud, FiMonitor, FiMail, FiExternalLink, FiCheck } from 'react-icons/fi';

const STEPS = [
    {
        icon: FiMail,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        title: 'Check your Stripe receipt',
        desc: 'Stripe sends an automatic payment receipt to your email. Keep this for your records.',
    },
    {
        icon: FiPackage,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        title: 'Receive your setup package',
        desc: 'Nao will personally send you the Sage toolkit source code and setup guide within 24 hours. Check your email or join the Whop community to access it immediately.',
    },
    {
        icon: FiMonitor,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        title: 'Run the setup (~30 min)',
        desc: 'The setup guide walks you through configuring your API keys and deploying to Cloudflare. Requires Python + Node.js on your machine.',
    },
    {
        icon: FiCloud,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        title: 'Your SNS automation goes live',
        desc: 'Once deployed to your own Cloudflare account, your AI posts to Bluesky and Instagram every morning at 9AM — automatically, forever, no PC needed.',
    },
];

const ThankYou = () => {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-16 font-sans">
            <Motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl w-full"
            >
                {/* Success badge */}
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <FiCheck size={36} className="text-emerald-400" />
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-10">
                    <div className="text-xs font-mono text-emerald-400 mb-3 tracking-widest uppercase">Payment Confirmed</div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                        Welcome to{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Sage AI
                        </span>
                    </h1>
                    <p className="text-slate-400 text-base leading-relaxed max-w-lg mx-auto">
                        You now have access to the exact AI solopreneur stack Nao runs every day.
                        Here's what happens next — step by step.
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-4 mb-10">
                    {STEPS.map((step, i) => (
                        <div
                            key={i}
                            className={`flex gap-4 p-5 rounded-xl border ${step.bg}`}
                        >
                            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-black/40 ${step.color}`}>
                                <step.icon size={18} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-mono text-slate-600">STEP {i + 1}</span>
                                </div>
                                <div className="text-sm font-bold text-white mb-1">{step.title}</div>
                                <div className="text-sm text-slate-400 leading-relaxed">{step.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* What you actually get */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-8">
                    <div className="text-xs font-mono text-slate-500 mb-4 uppercase tracking-widest">What's in your toolkit</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {[
                            ['☁️', 'Cloudflare Workers (SNS auto-post 24/7)'],
                            ['☁️', 'Content replenisher (fills your Notion queue weekly)'],
                            ['🖥️', 'Flask backend + Admin dashboard'],
                            ['🖥️', 'Sage Chat AI (local LLM interface)'],
                            ['🖥️', 'Blog & course generation pipeline'],
                            ['📄', 'Full setup guide + API key checklist'],
                        ].map(([emoji, label], i) => (
                            <div key={i} className="flex items-start gap-2 text-slate-400">
                                <span>{emoji}</span>
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono mt-4">
                        ☁️ = runs on Cloudflare 24/7 (no PC needed) · 🖥️ = runs on your machine
                    </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <a
                        href="https://whop.com/segeai/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
                    >
                        <FiExternalLink size={16} />
                        Access via Whop Community
                    </a>
                    <a
                        href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}`}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl font-bold text-sm transition-all"
                    >
                        <FiMail size={16} />
                        Email Support
                    </a>
                </div>

                {/* Billing + footer */}
                <div className="text-center space-y-3 text-xs text-slate-600">
                    <p>
                        Manage or cancel your subscription →{' '}
                        <a href="https://billing.stripe.com/p/login/test_00000" className="text-slate-500 hover:text-white underline transition-colors">
                            Stripe billing portal
                        </a>
                    </p>
                    <p>Questions? Email <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}`} className="text-slate-500 hover:text-white transition-colors">{import.meta.env.VITE_SUPPORT_EMAIL || 'support@sage-ai.app'}</a></p>
                    <Link to="/" className="block text-slate-700 hover:text-slate-400 transition-colors">← Back to Sage AI</Link>
                </div>
            </Motion.div>
        </div>
    );
};

export default ThankYou;
