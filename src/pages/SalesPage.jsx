import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiArrowRight, FiShoppingCart, FiCheck, FiShield, FiZap } from 'react-icons/fi';
import SpaceBackground from '../components/SpaceBackground';
import { BACKEND_URL } from '../config/backendUrl';

const API_BASE = BACKEND_URL;

// ── Static direct payment links ───────────────────────────────────────────────
const STATIC_LINKS = {
    whop:       'https://whop.com/segeai/',
    gumroad:    'https://naofumi3.gumroad.com/l/yvzrfjd',
    paypal:     'https://paypal.me/japanletgo/29.99',
    proMonthly: 'https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03',
    enterprise: 'https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04',
};

const PRODUCT_PRICE = '$29.99';
const PRODUCT_NAME  = '2026 AI Influencer Monetization Express';

// ── Subscription plans ─────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: '/ month',
        badge: null,
        description: 'Try core features, no credit card needed.',
        features: ['Sage Chat (5 messages/day)', 'Bluesky auto-post (1/day)', 'Basic content generation', 'Public dashboard access'],
        cta: 'Start Free',
        link: '/dashboard',
        style: 'border-white/10 bg-white/[0.02]',
        ctaStyle: 'bg-white/10 hover:bg-white/20 text-white',
    },
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

const FEATURES = [
    'Full AI Influencer Blueprint (step-by-step PDF)',
    'Autonomous SNS posting templates (Bluesky + Instagram)',
    'Monetization funnel — from idea to income',
    'Sage 3.0 setup guide & quick-start walkthrough',
    'Lifetime access + all future updates',
    '30-day money-back guarantee',
];

const PAYMENT_OPTIONS = [
    {
        id: 'stripe',
        label: 'Pay with Stripe',
        sublabel: 'Credit / Debit card',
        icon: '💳',
        bg: 'bg-indigo-600 hover:bg-indigo-500',
        border: 'border-indigo-500/40',
        badge: 'Most Secure',
        badgeColor: 'bg-indigo-500/20 text-indigo-300',
    },
    {
        id: 'paypal',
        label: 'Pay with PayPal',
        sublabel: 'PayPal balance or card',
        icon: '🅿',
        bg: 'bg-blue-500 hover:bg-blue-400',
        border: 'border-blue-400/40',
        badge: 'Buyer Protection',
        badgeColor: 'bg-blue-500/20 text-blue-300',
    },
    {
        id: 'gumroad',
        label: 'Buy on Gumroad',
        sublabel: 'Card · PayPal · 30-day refund',
        icon: '🛍',
        bg: 'bg-pink-600 hover:bg-pink-500',
        border: 'border-pink-500/40',
        badge: '30-Day Refund',
        badgeColor: 'bg-pink-500/20 text-pink-300',
    },
    {
        id: 'whop',
        label: 'Join on Whop',
        sublabel: 'Community + digital download',
        icon: '⚡',
        bg: 'bg-emerald-600 hover:bg-emerald-500',
        border: 'border-emerald-500/40',
        badge: 'Community Access',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
    },
];

const TESTIMONIALS = [
    { text: 'I went from zero to 3 published posts in one afternoon.', name: 'Solopreneur, Tokyo' },
    { text: 'The Bluesky auto-posting alone is worth it. My reach doubled in 2 weeks.', name: 'Content creator, Osaka' },
    { text: 'Finally a tool that actually finishes the work — not just starts it.', name: 'Digital marketer, Yokohama' },
];

const SalesPage = () => {
    const [loading, setLoading] = useState(null); // 'stripe' | 'paypal' | null

    // ── Dynamic checkout handlers ───────────────────────────────────────────
    async function handleStripe() {
        setLoading('stripe');
        try {
            const res = await fetch(`${API_BASE}/api/stripe/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_name: PRODUCT_NAME, price: 29.99 }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch {
            // Backend unreachable — fallback to Gumroad
            window.open(STATIC_LINKS.gumroad, '_blank');
        } finally {
            setLoading(null);
        }
    }

    async function handlePayPal() {
        setLoading('paypal');
        try {
            const res = await fetch(`${API_BASE}/api/paypal/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: '29.99', currency: 'USD', description: PRODUCT_NAME }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch {
            // Backend unreachable — fallback to PayPal.me
            window.open(STATIC_LINKS.paypal, '_blank');
        } finally {
            setLoading(null);
        }
    }

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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        FREE PLAN · PRO $20/MO · ENTERPRISE $99/MO
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6">
                        Build Your<br />
                        <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                            AI Income Stream
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-4 font-light leading-relaxed">
                        The exact system I use to auto-publish content daily, build Gumroad products,
                        and grow an audience — starting from one chat message.
                    </p>

                    <div className="flex items-center justify-center gap-6 mb-10 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" size={14} /> 90-second setup</span>
                        <span className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" size={14} /> No code required</span>
                        <span className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" size={14} /> Windows-ready</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href={STATIC_LINKS.proMonthly}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg font-bold shadow-[0_0_60px_rgba(37,99,235,0.4)] transition-all"
                        >
                            <FiZap size={20} />
                            Start Pro — $20/month
                        </a>
                        <a
                            href="#buy"
                            className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-lg font-bold transition-all border border-white/10"
                        >
                            <FiShoppingCart size={20} />
                            One-time — {PRODUCT_PRICE}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                    className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all ${plan.ctaStyle}`}
                                >
                                    {plan.cta}
                                </a>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ③ What You Get ─────────────────────────────────────────────── */}
            <section id="buy" className="relative z-10 py-20 px-4 border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="p-8 rounded-2xl bg-white/[0.03] border border-white/10"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl" />
                        <div className="text-xs font-mono text-blue-400 mb-2">INCLUDED IN YOUR PURCHASE</div>
                        <h2 className="text-2xl font-bold mb-2">{PRODUCT_NAME}</h2>
                        <div className="text-4xl font-black text-white mb-8">{PRODUCT_PRICE}</div>
                        <ul className="space-y-3">
                            {FEATURES.map((f, i) => (
                                <Motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                    className="flex items-start gap-3 text-sm text-slate-300"
                                >
                                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <FiCheck size={11} className="text-emerald-400" />
                                    </span>
                                    {f}
                                </Motion.li>
                            ))}
                        </ul>
                    </Motion.div>
                </div>
            </section>

            {/* ③ Payment Options ──────────────────────────────────────────── */}
            <section id="buy" className="relative z-10 py-24 px-4 border-t border-white/5 scroll-mt-20">
                <div className="max-w-3xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-3">Choose Your Payment Method</h2>
                        <p className="text-slate-500 text-sm">All options give you the same instant access. Pick whatever is easiest.</p>
                    </Motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PAYMENT_OPTIONS.map((opt, i) => {
                            const isDynamic = opt.id === 'stripe' || opt.id === 'paypal'; // stripe=API, paypal=direct window.open
                            const isLoading = loading === opt.id;
                            const href = STATIC_LINKS[opt.id];

                            const cardClass = `block p-6 rounded-2xl border ${opt.border} bg-white/[0.03] hover:bg-white/[0.07] transition-all group relative overflow-hidden cursor-pointer`;

                            const inner = (
                                <>
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl ${opt.bg.split(' ')[0]}/10`} />
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="text-3xl">{opt.icon}</span>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${opt.badgeColor}`}>
                                                {opt.badge}
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-white mb-1">{opt.label}</div>
                                        <div className="text-xs text-slate-500 mb-5">{opt.sublabel}</div>
                                        <div className={`w-full py-3 rounded-xl ${opt.bg} text-white font-bold text-sm text-center flex items-center justify-center gap-2 transition-all ${isLoading ? 'opacity-70' : ''}`}>
                                            {isLoading ? (
                                                <><span className="animate-spin">⟳</span> Processing...</>
                                            ) : (
                                                <><span>{PRODUCT_PRICE}</span><FiArrowRight size={14} /></>
                                            )}
                                        </div>
                                    </div>
                                </>
                            );

                            return (
                                <Motion.div
                                    key={opt.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    {isDynamic ? (
                                        <button
                                            onClick={opt.id === 'stripe' ? handleStripe : handlePayPal}
                                            disabled={!!loading && loading === opt.id}
                                            className={`w-full text-left ${cardClass}`}
                                        >
                                            {inner}
                                        </button>
                                    ) : (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cardClass}
                                        >
                                            {inner}
                                        </a>
                                    )}
                                </Motion.div>
                            );
                        })}
                    </div>

                    {/* Trust signals */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <FiShield size={12} className="text-emerald-400" /> SSL Encrypted
                        </span>
                        <span className="flex items-center gap-1.5">
                            <FiCheck size={12} className="text-emerald-400" /> Instant delivery
                        </span>
                        <span className="flex items-center gap-1.5">
                            <FiZap size={12} className="text-blue-400" /> Lifetime access
                        </span>
                        <span className="flex items-center gap-1.5">
                            <FiShield size={12} className="text-purple-400" /> 30-day refund
                        </span>
                    </div>
                </div>
            </section>

            {/* ④ Testimonials ─────────────────────────────────────────────── */}
            <section className="relative z-10 py-20 px-4 border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-2xl font-bold">What early users say</h2>
                    </Motion.div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {TESTIMONIALS.map((t, i) => (
                            <Motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.12 }}
                                className="p-5 rounded-xl bg-white/[0.03] border border-white/5"
                            >
                                <p className="text-sm text-slate-300 leading-relaxed mb-4">"{t.text}"</p>
                                <p className="text-xs text-slate-600 font-mono">— {t.name}</p>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ⑤ Final CTA ─────────────────────────────────────────────────── */}
            <section className="relative z-10 py-24 px-4 border-t border-white/5">
                <div className="max-w-xl mx-auto text-center">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="text-4xl mb-4">🚀</div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                            Ready to automate your first income stream?
                        </h2>
                        <p className="text-slate-500 text-sm mb-8">
                            One chat. One click. Full business in 90 seconds.
                        </p>
                        <a
                            href="#buy"
                            className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg font-bold shadow-[0_0_60px_rgba(37,99,235,0.3)] transition-all"
                        >
                            <FiShoppingCart size={20} />
                            Get Instant Access — {PRODUCT_PRICE}
                        </a>
                        <p className="text-xs text-slate-600 mt-3">30-day money-back guarantee · No subscription · Instant download</p>
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
                        <a href="mailto:sage@onelovepeople.com" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    <p className="text-slate-700 text-xs font-mono">© 2026 SAGE AI · Yokohama, Japan</p>
                </div>
            </footer>
        </div>
    );
};

export default SalesPage;
