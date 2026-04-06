import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiArrowRight, FiShoppingCart, FiCheck, FiShield, FiZap } from 'react-icons/fi';
import SpaceBackground from '../components/SpaceBackground';
import { trackEvent } from '../utils/tracking';

// ── Static direct payment links ───────────────────────────────────────────────
const STATIC_LINKS = {
    whop:       'https://whop.com/segeai/',
    gumroad:    'https://naofumi3.gumroad.com/l/yvzrfjd',
    paypal:     'https://paypal.me/japanletgo/29.99',
    proMonthly: 'https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03',
    enterprise: 'https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04',
};

// ── Subscription plans ─────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'pro',
        name: 'Pro',
        price: '$20',
        period: '/ month',
        badge: '🔥 Most Popular',
        description: 'Full autonomous AI solopreneur stack.',
        features: ['Unlimited Sage Chat', 'SNS auto-posting (Bluesky + X + Instagram)', 'Course & product generation pipeline', 'Notion sync + Git daily log', 'Self-healing AI agent', 'All future updates'],
        cta: 'Start Pro — $20/mo',
        link: STATIC_LINKS.proMonthly,
        style: 'border-blue-500/50 bg-blue-500/[0.05] shadow-[0_0_40px_rgba(59,130,246,0.15)]',
        ctaStyle: 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        highlight: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: '$99',
        period: '/ month',
        badge: null,
        description: 'Full system + priority support + API access.',
        features: ['Everything in Pro', 'Direct API access', 'Priority email support', 'White-label option', 'Custom identity setup', 'Onboarding call (1×30min)'],
        cta: 'Go Enterprise — $99/mo',
        link: STATIC_LINKS.enterprise,
        style: 'border-purple-500/30 bg-purple-500/[0.03]',
        ctaStyle: 'bg-purple-700 hover:bg-purple-600 text-white',
    },
];



const STATS = [
    { value: '14+', label: 'SNS posts ready in your queue today' },
    { value: '9 AM', label: 'daily — auto-post fires every morning' },
    { value: '$0', label: 'server costs (runs on CF free tier)' },
    { value: '< 1s', label: 'content generation via Groq API' },
];

const SalesPage = () => {
    useEffect(() => { trackEvent('sales_visit'); }, []);
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <SpaceBackground />

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-black/50">
                <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    SAGE 3.0
                </Link>
                <div className="flex gap-4 items-center">
                    <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
                        Dashboard
                    </Link>
                    <a
                        href="#buy"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all"
                    >
                        Get Access →
                    </a>
                </div>
            </nav>

            {/* ① Hero ──────────────────────────────────────────────────────── */}
            <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 pt-24 pb-16 z-10 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        🤖 LIVE — Auto-posting fires every morning at 9 AM
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
                        Your AI posts<br />
                        <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                            while you sleep.
                        </span>
                    </h1>
                    <p className="text-xl text-slate-500 font-light mb-4">No PC needed. No babysitting. Just results.</p>

                    <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-6 font-light leading-relaxed">
                        Sage AI runs 24/7 on Cloudflare's global edge network. Every morning it pulls from your Notion content pool,
                        generates AI-written posts, and publishes to Bluesky and Instagram — automatically. Set it up once. Walk away.
                    </p>

                    {/* Stats bar */}
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10 text-sm">
                        {STATS.map(s => (
                            <span key={s.label} className="flex items-center gap-1.5 text-slate-400">
                                <span className="font-black text-white">{s.value}</span>
                                <span>{s.label}</span>
                            </span>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href={STATIC_LINKS.proMonthly}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg font-bold shadow-[0_0_60px_rgba(37,99,235,0.4)] transition-all"
                        >
                            <FiZap size={20} />
                            Start Pro — $20/mo
                        </a>
                        <a
                            href="#pricing"
                            className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-lg font-bold transition-all border border-white/10"
                        >
                            See Plans <FiArrowRight size={18} />
                        </a>
                    </div>
                    <p className="text-xs text-slate-600 mt-3">Cancel anytime · 30-day money-back guarantee</p>
                </Motion.div>
            </section>

            {/* ② Pricing Plans ────────────────────────────────────────────── */}
            <section id="pricing" className="relative z-10 py-20 px-4 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="text-xs font-mono text-blue-400 mb-2">CHOOSE YOUR PLAN</div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Simple, Transparent Pricing</h2>
                        <p className="text-slate-400 mt-3 text-sm">Cancel anytime. Upgrade or downgrade at any time.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {PLANS.map((plan) => (
                            <Motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className={`relative p-6 rounded-2xl border ${plan.style} flex flex-col`}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-xs font-bold text-white whitespace-nowrap">
                                        {plan.badge}
                                    </div>
                                )}
                                <div className="mb-4">
                                    <div className="text-xs font-mono text-slate-400 mb-1">{plan.name.toUpperCase()}</div>
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-black">{plan.price}</span>
                                        <span className="text-slate-400 text-sm mb-1">{plan.period}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                                </div>
                                <ul className="space-y-2 mb-6 flex-1">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <FiCheck size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href={plan.link}
                                    target={plan.link.startsWith('http') ? '_blank' : undefined}
                                    rel="noreferrer"
                                    onClick={() => trackEvent('payment_click', { plan: plan.id })}
                                    className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all ${plan.ctaStyle}`}
                                >
                                    {plan.cta}
                                </a>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ③ Early Adopter CTA ─────────────────────────────────────── */}
            <section className="relative z-10 py-20 px-4 border-t border-white/5">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="text-xs font-mono text-blue-400 mb-2">EARLY ACCESS</div>
                    <h2 className="text-3xl font-black tracking-tighter mb-4">Be one of the first.</h2>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xl mx-auto">
                        Sage is in active development. Early adopters get locked-in pricing and direct access to the builder.
                        Your feedback shapes what gets built next.
                    </p>
                </div>
            </section>

            {/* ④ Final CTA ────────────────────────────────────────────────── */}
            <section id="buy" className="relative z-10 py-24 px-4 border-t border-white/5 scroll-mt-20">
                <div className="max-w-2xl mx-auto text-center">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="text-xs font-mono text-emerald-400 mb-4">GET STARTED TODAY</div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            Your AI starts<br />
                            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                working tonight.
                            </span>
                        </h2>
                        <p className="text-slate-400 mb-10 text-sm">
                            Setup takes about 90 seconds. After that, Sage AI posts to social media every single day — automatically.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                            <a
                                href={STATIC_LINKS.proMonthly}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl text-lg font-bold shadow-[0_0_60px_rgba(37,99,235,0.4)] transition-all"
                            >
                                <FiZap size={20} /> Start Pro — $20/mo
                            </a>
                            <a
                                href={STATIC_LINKS.enterprise}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-lg font-bold border border-white/10 transition-all"
                            >
                                <FiShield size={18} /> Enterprise — $99/mo
                            </a>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><FiCheck size={11} className="text-emerald-400" /> Cancel anytime</span>
                            <span className="flex items-center gap-1"><FiCheck size={11} className="text-emerald-400" /> 30-day money-back guarantee</span>
                            <span className="flex items-center gap-1"><FiCheck size={11} className="text-emerald-400" /> Instant access</span>
                            <span className="flex items-center gap-1"><FiCheck size={11} className="text-emerald-400" /> Free plan — no credit card needed</span>
                        </div>
                    </Motion.div>
                </div>
            </section>


            {/* Footer */}
            <footer className="relative z-10 py-10 px-6 border-t border-white/5 bg-black">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <Link to="/" className="text-slate-500 text-sm hover:text-white transition-colors">← Back to Home</Link>
                    <div className="flex gap-5 text-xs font-mono text-slate-600">
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <a href="mailto:naofumi0930@gmail.com" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    <p className="text-slate-700 text-xs font-mono">© 2026 SAGE AI · Yokohama, Japan</p>
                </div>
            </footer>
        </div>
    );
};

export default SalesPage;
