import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
    FiArrowRight, FiShoppingCart, FiClock, FiZap,
    FiTrendingUp, FiGlobe, FiShield, FiCode,
    FiCheckCircle, FiActivity, FiTerminal
} from 'react-icons/fi';

// ── Blog posts (latest 3) ─────────────────────────────────────────────────────
const postModules = import.meta.glob('../blog/posts/*.mdx', { eager: true, query: '?raw', import: 'default' });
const allPosts = Object.entries(postModules).map(([path, raw]) => {
    const parts = raw.split('---');
    let fm = {};
    if (parts.length >= 3) {
        parts[1].split('\n').forEach(line => {
            const [key, ...vals] = line.split(':');
            if (key && vals.length > 0) fm[key.trim()] = vals.join(':').trim().replace(/^["']|["']$/g, '');
        });
    }
    const filename = path.split('/').pop().replace('.mdx', '');
    return { slug: fm.slug || filename, title: fm.title || filename, excerpt: fm.excerpt || '', date: fm.date || '' };
}).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

const DEMO_RESULTS = [
    { icon: '✦', label: 'Blog post generated', detail: '1,200 words · SEO optimized · ready to publish', color: '#059669' },
    { icon: '✦', label: '5 social captions ready', detail: 'Bluesky · Instagram · formatted & reviewed', color: '#1A56DB' },
    { icon: '✦', label: 'Gumroad package ready', detail: 'ZIP bundle · sales copy · ready to upload', color: '#D97706' },
    { icon: '✦', label: 'Posted to Bluesky', detail: 'Auto-published · Instagram draft ready', color: '#7C3AED' },
];

const DEMO_INPUTS = [
    "I want to sell AI tips for solopreneurs",
    "I'm a fitness coach looking for new clients",
    "I create digital art and want to monetize it",
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Type your idea', desc: 'Tell Sage what you want to build or sell. Plain English. No setup required.' },
    { step: '02', title: 'Sage builds it', desc: 'Blog post, 5 social captions, and a Gumroad package — in 90 seconds.' },
    { step: '03', title: 'Publish & earn', desc: 'Review the output, hit publish. Bluesky posts automatically.' },
];

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Bento Card: Pipeline Demo ─────────────────────────────────────────────────
const PipelineCard = ({ demoVisible, inputIndex }) => (
    <div className="bento-card card-accent-top md:col-span-7 p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <FiTerminal size={14} style={{ color: 'var(--c-subtle)' }} />
                <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)', letterSpacing: '0.08em' }}>
                    SAGE PIPELINE
                </span>
            </div>
            <div className="sage-badge" style={{ color: 'var(--c-emerald)', borderColor: 'rgba(5,150,105,0.2)' }}>
                <span className="live-dot" />
                Running
            </div>
        </div>

        {/* Input row */}
        <div className="flex gap-3 items-center">
            <div className="flex-1 rounded-lg px-4 py-2.5 text-sm font-mono overflow-hidden"
                style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                <span style={{ color: 'var(--c-subtle)' }}>$ </span>
                <Motion.span
                    key={inputIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35 }}
                    style={{ color: 'var(--c-text)' }}
                >
                    {DEMO_INPUTS[inputIndex]}
                </Motion.span>
                <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom animate-pulse"
                    style={{ background: 'var(--c-blue)' }} />
            </div>
        </div>

        {/* Results */}
        <div className="space-y-2">
            {DEMO_RESULTS.map((r, i) => (
                <Motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={demoVisible ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 + i * 0.2, duration: 0.4 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}
                >
                    <span style={{ color: r.color, fontSize: '0.7rem' }}>{r.icon}</span>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>{r.label}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--c-muted)' }}>{r.detail}</div>
                    </div>
                    <Motion.div
                        initial={{ scale: 0 }}
                        animate={demoVisible ? { scale: 1 } : {}}
                        transition={{ delay: 0.4 + i * 0.2, type: 'spring', stiffness: 350 }}
                    >
                        <FiCheckCircle size={15} style={{ color: r.color }} />
                    </Motion.div>
                </Motion.div>
            ))}
        </div>

        <div className="text-xs font-mono mt-auto" style={{ color: 'var(--c-subtle)' }}>
            ↳ completed in 87s
        </div>
    </div>
);

// ── Bento Card: Market Scan ───────────────────────────────────────────────────
const MarketScanCard = () => (
    <div className="bento-card card-accent-emerald md:col-span-5 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiTrendingUp size={14} style={{ color: 'var(--c-emerald)' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)', letterSpacing: '0.08em' }}>
                MARKETSCAN AGENT
            </span>
        </div>
        <div>
            <p className="font-bold text-base mb-0.5" style={{ color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
                Sage finds your next opportunity
            </p>
            <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
                Autonomous market research — every morning at 6 AM
            </p>
        </div>

        {/* Scan result card */}
        <div className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.15)' }}>
            <div className="text-xs font-mono" style={{ color: 'var(--c-emerald)' }}>Latest scan</div>
            <div className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>
                AI productivity tools for freelancers
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                {[
                    { label: 'Demand', value: '92', unit: '/100' },
                    { label: 'Competition', value: 'Low', unit: '' },
                    { label: 'AI-ready', value: '✓', unit: '' },
                ].map((s) => (
                    <div key={s.label} className="rounded py-2 px-1"
                        style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                        <div className="text-sm font-bold" style={{ color: 'var(--c-emerald)' }}>
                            {s.value}<span className="text-[10px] font-normal" style={{ color: 'var(--c-subtle)' }}>{s.unit}</span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--c-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>
            <div className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: 'var(--c-muted)' }}>
                <FiCheckCircle size={10} style={{ color: 'var(--c-emerald)' }} />
                Added to content queue → Blog scheduled
            </div>
        </div>

        <p className="text-xs mt-auto" style={{ color: 'var(--c-subtle)' }}>
            Google Trends · Reddit · DuckDuckGo — scored with Groq LLM
        </p>
    </div>
);

// ── Bento Card: Auto-Publish ──────────────────────────────────────────────────
const AutoPublishCard = () => (
    <div className="bento-card card-accent-top md:col-span-4 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiGlobe size={13} style={{ color: 'var(--c-blue)' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)', letterSpacing: '0.08em' }}>
                AUTO-PUBLISH
            </span>
        </div>
        <p className="font-bold text-sm leading-snug" style={{ color: 'var(--c-text)' }}>
            Posts while you sleep
        </p>
        <div className="space-y-2">
            {[
                { name: 'Bluesky', active: true },
                { name: 'Instagram', active: true },
                { name: 'Notion', active: true },
                { name: 'Medium', active: false },
                { name: 'WordPress', active: false },
            ].map((p) => (
                <div key={p.name} className="flex items-center justify-between py-1.5 px-3 rounded"
                    style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                    <span className="text-xs" style={{ color: p.active ? 'var(--c-text)' : 'var(--c-subtle)' }}>{p.name}</span>
                    <div className="flex items-center gap-1.5">
                        {p.active
                            ? <><span className="live-dot" style={{ width: 5, height: 5 }} /><span className="text-[10px] font-mono" style={{ color: 'var(--c-emerald)' }}>live</span></>
                            : <span className="text-[10px] font-mono" style={{ color: 'var(--c-subtle)' }}>off</span>}
                    </div>
                </div>
            ))}
        </div>
        <p className="text-[10px] font-mono mt-auto" style={{ color: 'var(--c-subtle)' }}>
            40+ platforms available
        </p>
    </div>
);

// ── Bento Card: OODA Self-Monitor ─────────────────────────────────────────────
const OodaCard = () => (
    <div className="bento-card card-accent-violet md:col-span-4 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiShield size={13} style={{ color: 'var(--c-violet)' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)', letterSpacing: '0.08em' }}>
                OODA SELF-MONITOR
            </span>
        </div>
        <p className="font-bold text-sm leading-snug" style={{ color: 'var(--c-text)' }}>
            Always on, always watching
        </p>
        <div className="space-y-2">
            {[
                { tier: 'Tier 1', label: 'Internal checks', interval: '30 min', status: 'PASS' },
                { tier: 'Tier 2', label: 'Service health', interval: '2 hr', status: 'PASS' },
                { tier: 'Tier 3', label: 'E2E pipeline', interval: '24 hr', status: 'PASS' },
            ].map((t) => (
                <div key={t.tier} className="flex items-center justify-between py-1.5 px-3 rounded"
                    style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                    <div>
                        <div className="text-xs font-medium" style={{ color: 'var(--c-text)' }}>{t.tier}</div>
                        <div className="text-[10px]" style={{ color: 'var(--c-muted)' }}>{t.label} · {t.interval}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="live-dot" style={{ background: 'var(--c-violet)', width: 5, height: 5 }} />
                        <span className="text-[10px] font-mono" style={{ color: 'var(--c-violet)' }}>{t.status}</span>
                    </div>
                </div>
            ))}
        </div>
        <p className="text-[10px] font-mono mt-auto" style={{ color: 'var(--c-subtle)' }}>
            Telegram alert on 2× consecutive FAIL
        </p>
    </div>
);

// ── Bento Card: Whop Integration ──────────────────────────────────────────────
const WhopCard = () => (
    <div className="bento-card card-accent-amber md:col-span-4 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiShoppingCart size={13} style={{ color: 'var(--c-amber)' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)', letterSpacing: '0.08em' }}>
                WHOP INTEGRATION
            </span>
        </div>
        <p className="font-bold text-sm leading-snug" style={{ color: 'var(--c-text)' }}>
            One command to publish your product
        </p>
        <div className="rounded-lg p-3 flex flex-col gap-2"
            style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}>
            <div className="text-[10px] font-mono" style={{ color: 'var(--c-muted)' }}>
                &gt; "Publish my AI tips guide for $29.99"
            </div>
            <div className="w-full h-px" style={{ background: 'var(--c-border)' }} />
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--c-text)' }}>AI Tips 2026</div>
                    <div className="text-[10px]" style={{ color: 'var(--c-muted)' }}>$29.99 · Whop</div>
                </div>
                <div className="sage-badge" style={{ color: 'var(--c-amber)', borderColor: 'rgba(217,119,6,0.25)' }}>
                    <span className="live-dot" style={{ background: 'var(--c-amber)', width: 4, height: 4 }} />
                    Live
                </div>
            </div>
        </div>
        <p className="text-[10px] font-mono mt-auto" style={{ color: 'var(--c-subtle)' }}>
            Gumroad · Stripe · PayPal also supported
        </p>
    </div>
);

// ── Bento Card: SAGE Builder ──────────────────────────────────────────────────
const BuilderCard = () => (
    <div className="bento-card bento-card-accent card-accent-top md:col-span-12 p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
                <FiCode size={13} style={{ color: 'var(--c-blue)' }} />
                <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)', letterSpacing: '0.08em' }}>
                    SAGE BUILDER — AI CODE GENERATION
                </span>
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--c-text)', letterSpacing: '-0.02em' }}>
                Build apps by talking to them
            </h3>
            <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
                Gemini 2.0 Flash + function calling. 3-panel editor: file explorer, AI chat, live preview.
                Create, edit, and delete files — all from the chat window.
            </p>
        </div>
        <div className="rounded-lg px-4 py-3 font-mono text-xs flex-shrink-0 w-full md:w-72"
            style={{ background: 'rgba(26,86,219,0.05)', border: '1px solid rgba(26,86,219,0.12)' }}>
            <div style={{ color: 'var(--c-subtle)' }}>// sage builder</div>
            <div className="mt-1">
                <span style={{ color: 'var(--c-violet)' }}>create_file</span>
                <span style={{ color: 'var(--c-muted)' }}>(</span>
                <span style={{ color: 'var(--c-amber)' }}>"landing.jsx"</span>
                <span style={{ color: 'var(--c-muted)' }}>)</span>
            </div>
            <div>
                <span style={{ color: 'var(--c-violet)' }}>read_file</span>
                <span style={{ color: 'var(--c-muted)' }}>(</span>
                <span style={{ color: 'var(--c-amber)' }}>"package.json"</span>
                <span style={{ color: 'var(--c-muted)' }}>)</span>
            </div>
            <div className="mt-1" style={{ color: 'var(--c-emerald)' }}>✓ 3 files created</div>
        </div>
    </div>
);

const FAQ_ITEMS = [
    { q: "I'm not technical. Can I actually use this?", a: "Yes. Type what you want in plain English. Sage handles the content, the formatting, and the publishing. No code, no complex setup, no configuration required." },
    { q: "What exactly gets automated?", a: "Content generation (blog posts, social captions, sales copy), Bluesky auto-posting, Instagram posting, and product copy — all tailored to your specific niche and tone. Set your identity profile once, and every output is personalized from that point on." },
    { q: "How is this different from ChatGPT or other AI tools?", a: "ChatGPT gives you text you still have to format, schedule, and publish yourself. Sage connects the full pipeline: idea → blog post → 5 social captions → sales copy → auto-published to Bluesky. One workflow, one tool, done." },
    { q: "What if I want to cancel?", a: "Cancel anytime in one click from your Stripe customer portal. No contracts, no questions asked. Your subscription stops at the end of the current billing period." },
    { q: "Do I need to install anything?", a: "Nothing. Sage is 100% cloud-based and works in any browser on any device — desktop, tablet, or mobile. No downloads, no local setup, no Windows requirement." },
    { q: "How does the personalization work?", a: "Set your Identity profile once (your niche, tone, and persona). From that point, every blog post, social caption, and sales copy Sage generates is written for your specific audience — not a generic template." },
];

const FaqAccordion = () => {
    const [open, setOpen] = useState(null);
    return (
        <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
                <Motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bento-card overflow-hidden"
                >
                    <button
                        onClick={() => setOpen(open === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                    >
                        <span className="font-bold pr-4" style={{ fontSize: '0.9rem', color: 'var(--c-text)' }}>{item.q}</span>
                        <span className="shrink-0 text-lg font-light" style={{ color: 'var(--c-muted)', lineHeight: 1 }}>
                            {open === i ? '×' : '+'}
                        </span>
                    </button>
                    {open === i && (
                        <div className="px-5 pb-4">
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--c-muted)' }}>{item.a}</p>
                        </div>
                    )}
                </Motion.div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
const Landing = () => {
    const [demoVisible, setDemoVisible] = useState(false);
    const [inputIndex, setInputIndex] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setInputIndex(i => (i + 1) % DEMO_INPUTS.length), 3200);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen mesh-bg noise font-sans selection:bg-blue-500/20 overflow-x-hidden"
            style={{ color: 'var(--c-text)' }}>

            {/* ── Navbar ────────────────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center"
                style={{
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    background: 'rgba(244, 248, 255, 0.88)',
                    borderBottom: '1px solid var(--c-border)',
                }}>
                <div className="text-base font-bold tracking-tight flex items-center gap-2.5" style={{ color: 'var(--c-text)' }}>
                    <span className="live-dot" />
                    SAGE 3.0
                </div>
                <div className="flex items-center gap-5">
                    <div className="hidden sm:flex gap-5 text-sm" style={{ color: 'var(--c-muted)' }}>
                        <Link to="/blog" className="transition-colors duration-150 hover:text-blue-700"
                            style={{ color: 'var(--c-muted)' }}>Blog</Link>
                        <Link to="/shop" className="transition-colors duration-150 hover:text-blue-700"
                            style={{ color: 'var(--c-muted)' }}>Shop</Link>
                    </div>
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition-all duration-150"
                        style={{
                            background: 'linear-gradient(135deg, #1A56DB, #1E3A8A)',
                            boxShadow: '0 2px 8px rgba(26,86,219,0.25)',
                        }}
                    >
                        Dashboard <FiArrowRight size={12} />
                    </Link>
                </div>
            </nav>

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 z-10 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-5xl mx-auto"
                >
                    {/* Status badge */}
                    <div className="inline-flex items-center gap-2 mb-8 sage-badge">
                        <span className="live-dot" />
                        LIVE · YOUR AI REVENUE OPERATOR · 🌐 GLOBAL
                    </div>

                    {/* Headline */}
                    <h1 className="mb-6 font-black"
                        style={{
                            fontSize: 'clamp(2.8rem, 8.5vw, 6rem)',
                            letterSpacing: '-0.045em',
                            lineHeight: '0.92',
                            background: 'linear-gradient(135deg, #0284C7 0%, #1A56DB 50%, #1E40AF 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                        One Idea.<br />
                        Full Revenue Pipeline.
                    </h1>

                    {/* Sub */}
                    <p className="mb-10 font-light"
                        style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'var(--c-muted)', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                        Type your idea. Sage builds a{' '}
                        <span style={{ color: 'var(--c-text)', fontWeight: 500 }}>blog post</span>,{' '}
                        <span style={{ color: 'var(--c-text)', fontWeight: 500 }}>5 social captions</span>, and{' '}
                        <span style={{ color: 'var(--c-text)', fontWeight: 500 }}>sales copy</span> — tailored to your niche, in 90 seconds.
                        Then publishes automatically.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
                        <Motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold transition-all duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, #1A56DB, #C0392B)',
                                    boxShadow: '0 4px 20px rgba(26,86,219,0.3)',
                                    fontSize: '0.95rem',
                                }}
                            >
                                Launch Dashboard <FiArrowRight size={16} />
                            </Link>
                        </Motion.div>
                        <Motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                to="/sales"
                                className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all duration-200"
                                style={{
                                    background: 'transparent',
                                    border: '1.5px solid var(--c-red)',
                                    color: 'var(--c-red)',
                                    fontSize: '0.95rem',
                                }}
                            >
                                Get Full Access <FiShoppingCart size={15} />
                            </Link>
                        </Motion.div>
                    </div>
                </Motion.div>

                {/* Scroll cue */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30">
                    <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, transparent, var(--c-muted))' }} />
                    <span style={{ fontSize: '0.6rem', fontFamily: 'Fira Code', color: 'var(--c-muted)', letterSpacing: '0.12em' }}>SCROLL</span>
                </div>
            </section>

            {/* ── Stats Bar ─────────────────────────────────────────────── */}
            <div className="relative z-10 section-divider py-8 px-4">
                <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-8 text-center">
                    {[
                        { value: 'LIVE', label: 'Now Available' },
                        { value: '$20/mo', label: 'Pro Plan · Cancel Anytime' },
                        { value: '90s', label: 'Idea to Revenue' },
                        { value: '🌐', label: 'Global · Works Everywhere' },
                    ].map((stat, i, arr) => (
                        <React.Fragment key={stat.label}>
                            <div>
                                <p className="font-black text-xl" style={{ color: 'var(--c-text)', letterSpacing: '-0.02em' }}>
                                    {stat.value}
                                </p>
                                <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: 'var(--c-muted)' }}>
                                    {stat.label}
                                </p>
                            </div>
                            {i < arr.length - 1 && (
                                <div className="hidden sm:block w-px h-7" style={{ background: 'var(--c-border)' }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ── Bento Grid ────────────────────────────────────────────── */}
            <section className="relative z-10 py-20 px-4 section-divider">
                <div className="max-w-6xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: 'var(--c-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            Everything included
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.03em', color: '#1A56DB' }}>
                            The complete autonomous system
                        </h2>
                    </Motion.div>

                    <Motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        onViewportEnter={() => setDemoVisible(true)}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3"
                    >
                        <PipelineCard demoVisible={demoVisible} inputIndex={inputIndex} />
                        <MarketScanCard />
                        <AutoPublishCard />
                        <OodaCard />
                        <WhopCard />
                        <BuilderCard />
                    </Motion.div>
                </div>
            </section>

            {/* ── How It Works ──────────────────────────────────────────── */}
            <section className="relative z-10 py-20 px-4 section-divider">
                <div className="max-w-4xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-14"
                    >
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: 'var(--c-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            How it works
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.03em', color: '#1A56DB' }}>
                            Three steps to your first AI income
                        </h2>
                    </Motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
                            <Motion.div
                                key={step}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.12, duration: 0.4 }}
                                className="bento-card p-6"
                            >
                                <div className="font-mono text-5xl font-black mb-4" style={{ color: 'rgba(13,27,53,0.06)', lineHeight: 1 }}>
                                    {step}
                                </div>
                                <h3 className="font-bold mb-2" style={{ color: 'var(--c-text)', fontSize: '1rem' }}>{title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-muted)' }}>{desc}</p>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Blog ──────────────────────────────────────────────────── */}
            {allPosts.length > 0 && (
                <section className="relative z-10 py-20 px-4 section-divider">
                    <div className="max-w-6xl mx-auto">
                        <Motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="flex items-center justify-between mb-10"
                        >
                            <div>
                                <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: 'var(--c-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    Auto-published content
                                </p>
                                <h2 className="font-black" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.02em', color: '#1A56DB' }}>
                                    Latest from Sage
                                </h2>
                            </div>
                            <Link to="/blog" className="flex items-center gap-1 text-sm transition-colors duration-150"
                                style={{ color: 'var(--c-blue)' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#1E3A8A'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--c-blue)'}>
                                All posts <FiArrowRight size={13} />
                            </Link>
                        </Motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {allPosts.map((post, i) => (
                                <Motion.div
                                    key={post.slug}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                >
                                    <Link to={`/blog/${post.slug}`}
                                        className="bento-card block p-6 h-full group">
                                        {post.date && (
                                            <div className="flex items-center gap-1 mb-3"
                                                style={{ fontSize: '0.65rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)' }}>
                                                <FiClock size={9} /> {formatDate(post.date)}
                                            </div>
                                        )}
                                        <h3 className="font-bold leading-snug mb-2 line-clamp-2 transition-colors duration-150"
                                            style={{ fontSize: '0.9rem', color: 'var(--c-text)' }}>
                                            {post.title}
                                        </h3>
                                        {post.excerpt && (
                                            <p className="text-xs leading-relaxed line-clamp-3"
                                                style={{ color: 'var(--c-muted)' }}>
                                                {post.excerpt}
                                            </p>
                                        )}
                                    </Link>
                                </Motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <section className="relative z-10 py-20 px-4 section-divider">
                <div className="max-w-3xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: 'var(--c-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            FAQ
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.03em', color: '#1A56DB' }}>
                            Common questions
                        </h2>
                    </Motion.div>
                    <FaqAccordion />
                </div>
            </section>

            {/* ── Shop / CTA ────────────────────────────────────────────── */}
            <section className="relative z-10 py-20 px-4 section-divider">
                <div className="max-w-4xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="mb-10"
                    >
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: 'var(--c-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            Start today
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.03em', color: '#1A56DB' }}>
                            Stop creating manually.<br />Start running a pipeline.
                        </h2>
                        <p className="mt-2 text-sm" style={{ color: 'var(--c-muted)' }}>
                            Your niche. Your tone. Automated every day. Cancel anytime.
                        </p>
                    </Motion.div>

                    <Motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex flex-col sm:flex-row gap-5 max-w-2xl"
                    >
                        {/* Pro Plan Card */}
                        <div className="bento-card bento-card-accent card-accent-top p-7 flex-1">
                            <div className="sage-badge mb-4" style={{ color: 'var(--c-blue)', borderColor: 'rgba(26,86,219,0.2)' }}>
                                Most Popular
                            </div>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
                                Pro
                            </h3>
                            <div className="font-black text-3xl my-3" style={{ color: 'var(--c-text)', letterSpacing: '-0.03em' }}>
                                $20<span className="text-base font-normal" style={{ color: 'var(--c-muted)' }}>/mo</span>
                            </div>
                            <ul className="space-y-2 mb-6">
                                {[
                                    '1 idea → blog + 5 posts + sales copy in 90s',
                                    'Content personalized to your niche & tone',
                                    'Daily Bluesky & Instagram auto-posting',
                                    'AI chat advisor + all future features',
                                ].map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-muted)' }}>
                                        <FiCheckCircle size={13} style={{ color: 'var(--c-emerald)', flexShrink: 0 }} />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href="https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, #1A56DB, #7C3AED)',
                                    boxShadow: '0 4px 16px rgba(26,86,219,0.3)',
                                }}
                            >
                                <FiZap size={14} /> Start Pro — $20/mo
                            </a>
                        </div>

                        {/* Enterprise Plan Card */}
                        <div className="bento-card p-7 flex-1">
                            <div className="sage-badge mb-4" style={{ color: 'var(--c-amber)', borderColor: 'rgba(217,119,6,0.2)' }}>
                                Enterprise
                            </div>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
                                Enterprise
                            </h3>
                            <div className="font-black text-3xl my-3" style={{ color: 'var(--c-text)', letterSpacing: '-0.03em' }}>
                                $99<span className="text-base font-normal" style={{ color: 'var(--c-muted)' }}>/mo</span>
                            </div>
                            <ul className="space-y-2 mb-6">
                                {[
                                    'Everything in Pro (5× higher limits)',
                                    'Direct API access for custom workflows',
                                    'White-label — ship under your own brand',
                                    'Personal onboarding call (30 min)',
                                ].map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-muted)' }}>
                                        <FiCheckCircle size={13} style={{ color: 'var(--c-emerald)', flexShrink: 0 }} />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href="https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, #D97706, #C0392B)',
                                    boxShadow: '0 4px 16px rgba(217,119,6,0.2)',
                                }}
                            >
                                <FiShoppingCart size={14} /> Go Enterprise — $99/mo
                            </a>
                        </div>
                    </Motion.div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="relative z-10 py-12 px-6 section-divider">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-wrap gap-5">
                        {[
                            { label: 'Getting Started', to: '/welcome-guide.html', internal: false },
                            { label: 'Privacy Policy', to: '/privacy', internal: true },
                            { label: 'Terms of Service', to: '/terms', internal: true },
                            { label: 'Contact', to: 'mailto:sage@onelovepeople.com', internal: false },
                            { label: 'Bluesky', to: 'https://bsky.app/profile/naofumi.bsky.social', internal: false },
                            { label: 'Instagram', to: 'https://www.instagram.com/sege.ai/', internal: false },
                        ].map((link) =>
                            link.internal ? (
                                <Link key={link.label} to={link.to}
                                    className="text-xs font-mono transition-colors duration-150"
                                    style={{ color: 'var(--c-subtle)' }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--c-muted)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--c-subtle)'}>
                                    {link.label}
                                </Link>
                            ) : (
                                <a key={link.label} href={link.to}
                                    target={link.to.startsWith('http') ? '_blank' : undefined}
                                    rel={link.to.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    className="text-xs font-mono transition-colors duration-150"
                                    style={{ color: 'var(--c-subtle)' }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--c-muted)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--c-subtle)'}>
                                    {link.label}
                                </a>
                            )
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-mono" style={{ color: 'var(--c-subtle)' }}>
                            © 2026 SAGE AI · Autonomous Architect Protocol
                        </p>
                        <p style={{ fontSize: '0.65rem', fontFamily: 'Fira Code', color: 'var(--c-subtle)', marginTop: '0.2rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Made with Sage in Yokohama, Japan
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
