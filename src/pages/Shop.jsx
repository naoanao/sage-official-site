import React from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiShoppingCart, FiArrowRight, FiZap, FiCheck, FiBook } from 'react-icons/fi';
import { LINKS } from '../config/links';

// ── Subscription plans (Stripe) ────────────────────────────────────────────────
const PLANS = [
    {
        id: 'pro',
        title: 'Sage AI Pro',
        price: '$20',
        period: '/mo',
        badge: 'MOST POPULAR',
        badgeStyle: { color: '#1A56DB', borderColor: 'rgba(26,86,219,0.25)', background: 'rgba(26,86,219,0.08)' },
        accentColor: 'from-blue-500 to-indigo-600',
        desc: 'Full autonomous AI pipeline — blog posts, SNS auto-posting, and content generation on autopilot.',
        features: [
            'Bluesky + Dev.to auto-posting (daily)',
            'Blog & course generation pipeline',
            'Unlimited AI conversations & content generation',
            'All future updates included',
        ],
        buttonLabel: 'Start Pro — $20/mo',
        url: LINKS.stripe.pro,
        highlight: true,
    },
    {
        id: 'enterprise',
        title: 'Sage AI Enterprise',
        price: '$99',
        period: '/mo',
        badge: 'ENTERPRISE',
        badgeStyle: { color: '#D97706', borderColor: 'rgba(217,119,6,0.25)', background: 'rgba(217,119,6,0.08)' },
        accentColor: 'from-amber-500 to-orange-600',
        desc: 'Everything in Pro plus direct API access, white-label option, and a personal onboarding call.',
        features: [
            'Everything in Pro',
            'Direct API access',
            'White-label option',
            'Onboarding call (1×30 min)',
        ],
        buttonLabel: 'Go Enterprise — $99/mo',
        url: LINKS.stripe.enterprise,
        highlight: false,
    },
];

// ── One-time digital products (Gumroad) ────────────────────────────────────────
const DIGITAL_PRODUCTS = [
    {
        id: 'guide',
        title: '2026 AI Influencer Monetization Express',
        price: '$49',
        badge: 'ONE-TIME PURCHASE',
        badgeStyle: { color: '#059669', borderColor: 'rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.08)' },
        accentColor: 'from-emerald-500 to-teal-600',
        desc: 'The complete playbook for building an AI-powered influencer business in 2026. Templates, blueprints, and a step-by-step monetization funnel.',
        features: [
            'Full AI Influencer Blueprint (PDF + Video)',
            'Autonomous SNS posting templates',
            'Monetization funnel step-by-step',
            'Lifetime access + future updates',
        ],
        buttonLabel: 'Buy on Gumroad — $49',
        url: LINKS.gumroad.monetization,
    },
];

// ── Plan card ──────────────────────────────────────────────────────────────────
const PlanCard = ({ plan, index }) => (
    <Motion.div
        key={plan.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative group p-8 rounded-2xl transition-all overflow-hidden flex flex-col"
        style={{
            background: plan.highlight ? 'rgba(26,86,219,0.04)' : 'var(--c-surface)',
            border: plan.highlight ? '1px solid rgba(26,86,219,0.3)' : '1px solid var(--c-border)',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-hv)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = plan.highlight ? 'rgba(26,86,219,0.3)' : 'var(--c-border)'}
    >
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${plan.accentColor}`} />
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono mb-5"
            style={plan.badgeStyle}>
            {plan.badge}
        </div>
        <h2 className="text-xl font-bold mb-1 leading-snug" style={{ color: 'var(--c-text)' }}>
            {plan.title}
        </h2>
        <div className="flex items-end gap-1 mb-4">
            <span className="text-4xl font-black" style={{ color: 'var(--c-text)' }}>{plan.price}</span>
            <span className="text-base mb-1" style={{ color: 'var(--c-muted)' }}>{plan.period}</span>
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--c-muted)' }}>
            {plan.desc}
        </p>
        <ul className="space-y-2 mb-8 flex-1">
            {plan.features.map((f, fi) => (
                <li key={fi} className="flex items-start gap-2 text-sm" style={{ color: 'var(--c-text)' }}>
                    <FiCheck size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#059669' }} />
                    {f}
                </li>
            ))}
        </ul>
        <Motion.a
            href={plan.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold text-sm transition-all"
            style={{
                background: 'linear-gradient(135deg, #1A56DB, #0284C7)',
                boxShadow: '0 4px 16px rgba(26,86,219,0.25)',
            }}
        >
            <FiZap size={16} />
            {plan.buttonLabel}
        </Motion.a>
    </Motion.div>
);

// ── Digital product card ────────────────────────────────────────────────────────
const DigitalCard = ({ product, index }) => (
    <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative group p-8 rounded-2xl transition-all overflow-hidden flex flex-col"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-hv)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
    >
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${product.accentColor}`} />
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono mb-5"
            style={product.badgeStyle}>
            <FiBook size={10} />
            {product.badge}
        </div>
        <h2 className="text-xl font-bold mb-1 leading-snug" style={{ color: 'var(--c-text)' }}>
            {product.title}
        </h2>
        <div className="text-3xl font-black mb-4" style={{ color: 'var(--c-text)' }}>
            {product.price}
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--c-muted)' }}>
            {product.desc}
        </p>
        <ul className="space-y-2 mb-8 flex-1">
            {product.features.map((f, fi) => (
                <li key={fi} className="flex items-start gap-2 text-sm" style={{ color: 'var(--c-text)' }}>
                    <FiCheck size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#059669' }} />
                    {f}
                </li>
            ))}
        </ul>
        <Motion.a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold text-sm transition-all"
            style={{
                background: 'linear-gradient(135deg, #059669, #0d9488)',
                boxShadow: '0 4px 16px rgba(5,150,105,0.2)',
            }}
        >
            <FiShoppingCart size={16} />
            {product.buttonLabel}
            <FiArrowRight size={16} />
        </Motion.a>
    </Motion.div>
);

// ── Page ───────────────────────────────────────────────────────────────────────
const Shop = () => (
    <div className="min-h-screen mesh-bg noise font-sans overflow-x-hidden" style={{ color: 'var(--c-text)' }}>

        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center"
            style={{
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                background: 'rgba(244, 248, 255, 0.88)',
                borderBottom: '1px solid var(--c-border)',
            }}>
            <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-blue)' }} />
                SAGE 3.0
            </Link>
            <div className="flex gap-4 sm:gap-6 text-sm font-medium flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--c-muted)' }}>
                <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
                <Link to="/shop" className="font-bold transition-colors" style={{ color: 'var(--c-blue)' }}>Shop</Link>
                <Link to="/sales" className="hover:text-blue-600 transition-colors">Pricing</Link>
            </div>
        </nav>

        {/* Hero */}
        <section className="pt-40 pb-16 px-4 text-center">
            <Motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6"
                    style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)', color: 'var(--c-subtle)' }}>
                    <FiShoppingCart size={12} />
                    SAGE STORE
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
                    <span style={{ color: 'var(--c-text)' }}>Ship Your{' '}</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #0284C7 0%, #1A56DB 50%, #1E40AF 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Empire.
                    </span>
                </h1>
                <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--c-muted)' }}>
                    Automate your entire content business with Sage — or grab a one-time guide to get started.
                </p>
            </Motion.div>
        </section>

        {/* Section 1: Monthly Service */}
        <section className="pb-16 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Section label */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1" style={{ background: 'var(--c-border)' }} />
                    <div className="flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full"
                        style={{ background: 'rgba(26,86,219,0.08)', color: '#1A56DB', border: '1px solid rgba(26,86,219,0.2)' }}>
                        <FiZap size={11} />
                        MONTHLY SUBSCRIPTION — CANCEL ANYTIME
                    </div>
                    <div className="h-px flex-1" style={{ background: 'var(--c-border)' }} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {PLANS.map((plan, i) => <PlanCard key={plan.id} plan={plan} index={i} />)}
                </div>

                <p className="text-center text-xs mt-6" style={{ color: 'var(--c-subtle)' }}>
                    🔒 Secure checkout via Stripe · Cancel anytime · No contracts ·{' '}
                    <Link to="/sales" className="hover:text-blue-600 transition-colors underline">
                        View full plan details →
                    </Link>
                </p>
            </div>
        </section>

        {/* Section 2: Digital Products */}
        <section className="pb-32 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Section label */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1" style={{ background: 'var(--c-border)' }} />
                    <div className="flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full"
                        style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
                        <FiBook size={11} />
                        DIGITAL PRODUCTS — ONE-TIME PURCHASE
                    </div>
                    <div className="h-px flex-1" style={{ background: 'var(--c-border)' }} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {DIGITAL_PRODUCTS.map((p, i) => <DigitalCard key={p.id} product={p} index={i} />)}
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-6" style={{ borderTop: '1px solid var(--c-border)' }}>
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-6 text-xs font-mono" style={{ color: 'var(--c-subtle)' }}>
                    <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
                    <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--c-subtle)' }}>
                    © 2026 SAGE AI | Autonomous Architect Protocol
                </p>
            </div>
        </footer>
    </div>
);

export default Shop;
