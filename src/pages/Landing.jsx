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
    { icon: '✦', label: '5 social captions ready', detail: 'Bluesky · Instagram · formatted & reviewed', color: '#0284C7' },
    { icon: '✦', label: 'Gumroad package ready', detail: 'ZIP bundle · sales copy · ready to upload', color: '#B45309' },
    { icon: '✦', label: 'Posted to Bluesky', detail: 'Auto-published · Instagram draft ready', color: '#6D28D9' },
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
                <FiTerminal size={14} style={{ color: '#7BA5C0' }} />
                <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.08em' }}>
                    SAGE PIPELINE
                </span>
            </div>
            <div className="sage-badge" style={{ color: '#059669', borderColor: 'rgba(5,150,105,0.2)' }}>
                <span className="live-dot" />
                Running
            </div>
        </div>

        {/* Input row */}
        <div className="flex gap-3 items-center">
            <div className="flex-1 rounded-lg px-4 py-2.5 text-sm font-mono overflow-hidden"
                style={{ background: 'rgba(2,132,199,0.05)', border: '1px solid rgba(2,132,199,0.12)' }}>
                <span style={{ color: '#7BA5C0' }}>$ </span>
                <Motion.span
                    key={inputIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35 }}
                    style={{ color: '#0D1B35' }}
                >
                    {DEMO_INPUTS[inputIndex]}
                </Motion.span>
                <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom animate-pulse"
                    style={{ background: '#0284C7' }} />
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
                    style={{ background: 'rgba(2,132,199,0.04)', border: '1px solid rgba(2,132,199,0.08)' }}
                >
                    <span style={{ color: r.color, fontSize: '0.7rem' }}>{r.icon}</span>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#0D1B35' }}>{r.label}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: '#3D6080' }}>{r.detail}</div>
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

        <div className="text-xs font-mono mt-auto" style={{ color: '#7BA5C0' }}>
            ↳ completed in 87s
        </div>
    </div>
);

// ── Bento Card: Market Scan ───────────────────────────────────────────────────
const MarketScanCard = () => (
    <div className="bento-card card-accent-emerald md:col-span-5 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiTrendingUp size={14} style={{ color: '#059669' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.08em' }}>
                MARKETSCAN AGENT
            </span>
        </div>
        <div>
            <p className="font-bold text-base mb-0.5" style={{ color: '#0D1B35', letterSpacing: '-0.01em' }}>
                Sage finds your next opportunity
            </p>
            <p className="text-xs" style={{ color: '#3D6080' }}>
                Autonomous market research — every morning at 6 AM
            </p>
        </div>

        {/* Scan result card */}
        <div className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.18)' }}>
            <div className="text-xs font-mono" style={{ color: '#059669' }}>Latest scan</div>
            <div className="font-semibold text-sm" style={{ color: '#0D1B35' }}>
                AI productivity tools for freelancers
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                {[
                    { label: 'Demand', value: '92', unit: '/100' },
                    { label: 'Competition', value: 'Low', unit: '' },
                    { label: 'AI-ready', value: '✓', unit: '' },
                ].map((s) => (
                    <div key={s.label} className="rounded py-2 px-1"
                        style={{ background: 'rgba(5,150,105,0.08)' }}>
                        <div className="text-sm font-bold" style={{ color: '#059669' }}>
                            {s.value}<span className="text-[10px] font-normal" style={{ color: '#3D6080' }}>{s.unit}</span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: '#3D6080' }}>{s.label}</div>
                    </div>
                ))}
            </div>
            <div className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: '#3D6080' }}>
                <FiCheckCircle size={10} style={{ color: '#059669' }} />
                Added to content queue → Blog scheduled
            </div>
        </div>

        <p className="text-xs mt-auto" style={{ color: '#7BA5C0' }}>
            Google Trends · Reddit · DuckDuckGo — scored with Groq LLM
        </p>
    </div>
);

// ── Bento Card: Auto-Publish ──────────────────────────────────────────────────
const AutoPublishCard = () => (
    <div className="bento-card card-accent-top md:col-span-4 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiGlobe size={13} style={{ color: '#0284C7' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.08em' }}>
                AUTO-PUBLISH
            </span>
        </div>
        <p className="font-bold text-sm leading-snug" style={{ color: '#0D1B35' }}>
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
                    style={{ background: 'rgba(2,132,199,0.04)' }}>
                    <span className="text-xs" style={{ color: p.active ? '#0D1B35' : '#7BA5C0' }}>{p.name}</span>
                    <div className="flex items-center gap-1.5">
                        {p.active
                            ? <><span className="live-dot" style={{ width: 5, height: 5 }} /><span className="text-[10px] font-mono" style={{ color: '#059669' }}>live</span></>
                            : <span className="text-[10px] font-mono" style={{ color: '#7BA5C0' }}>off</span>}
                    </div>
                </div>
            ))}
        </div>
        <p className="text-[10px] font-mono mt-auto" style={{ color: '#7BA5C0' }}>
            40+ platforms available
        </p>
    </div>
);

// ── Bento Card: OODA Self-Monitor ─────────────────────────────────────────────
const OodaCard = () => (
    <div className="bento-card card-accent-violet md:col-span-4 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiShield size={13} style={{ color: '#6D28D9' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.08em' }}>
                OODA SELF-MONITOR
            </span>
        </div>
        <p className="font-bold text-sm leading-snug" style={{ color: '#0D1B35' }}>
            Always on, always watching
        </p>
        <div className="space-y-2">
            {[
                { tier: 'Tier 1', label: 'Internal checks', interval: '30 min', status: 'PASS' },
                { tier: 'Tier 2', label: 'Service health', interval: '2 hr', status: 'PASS' },
                { tier: 'Tier 3', label: 'E2E pipeline', interval: '24 hr', status: 'PASS' },
            ].map((t) => (
                <div key={t.tier} className="flex items-center justify-between py-1.5 px-3 rounded"
                    style={{ background: 'rgba(109,40,217,0.05)' }}>
                    <div>
                        <div className="text-xs font-medium" style={{ color: '#0D1B35' }}>{t.tier}</div>
                        <div className="text-[10px]" style={{ color: '#3D6080' }}>{t.label} · {t.interval}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="live-dot" style={{ background: '#6D28D9', width: 5, height: 5 }} />
                        <span className="text-[10px] font-mono" style={{ color: '#6D28D9' }}>{t.status}</span>
                    </div>
                </div>
            ))}
        </div>
        <p className="text-[10px] font-mono mt-auto" style={{ color: '#7BA5C0' }}>
            Telegram alert on 2× consecutive FAIL
        </p>
    </div>
);

// ── Bento Card: Whop Integration ──────────────────────────────────────────────
const WhopCard = () => (
    <div className="bento-card card-accent-amber md:col-span-4 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <FiShoppingCart size={13} style={{ color: '#B45309' }} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.08em' }}>
                WHOP INTEGRATION
            </span>
        </div>
        <p className="font-bold text-sm leading-snug" style={{ color: '#0D1B35' }}>
            One command to publish your product
        </p>
        <div className="rounded-lg p-3 flex flex-col gap-2"
            style={{ background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.18)' }}>
            <div className="text-[10px] font-mono" style={{ color: '#3D6080' }}>
                &gt; "Publish my AI tips guide for $29.99"
            </div>
            <div className="w-full h-px" style={{ background: 'rgba(12,100,170,0.08)' }} />
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-semibold" style={{ color: '#0D1B35' }}>AI Tips 2026</div>
                    <div className="text-[10px]" style={{ color: '#3D6080' }}>$29.99 · Whop</div>
                </div>
                <div className="sage-badge" style={{ color: '#B45309', borderColor: 'rgba(180,83,9,0.25)' }}>
                    <span className="live-dot" style={{ background: '#B45309', width: 4, height: 4 }} />
                    Live
                </div>
            </div>
        </div>
        <p className="text-[10px] font-mono mt-auto" style={{ color: '#7BA5C0' }}>
            Gumroad · Stripe · PayPal also supported
        </p>
    </div>
);

// ── Bento Card: SAGE Builder ──────────────────────────────────────────────────
const BuilderCard = () => (
    <div className="bento-card bento-card-accent card-accent-top md:col-span-12 p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
                <FiCode size={13} style={{ color: '#0284C7' }} />
                <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.08em' }}>
                    SAGE BUILDER — AI CODE GENERATION
                </span>
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: '#0D1B35', letterSpacing: '-0.02em' }}>
                Build apps by talking to them
            </h3>
            <p className="text-sm" style={{ color: '#3D6080' }}>
                Gemini 2.0 Flash + function calling. 3-panel editor: file explorer, AI chat, live preview.
                Create, edit, and delete files — all from the chat window.
            </p>
        </div>
        <div className="rounded-lg px-4 py-3 font-mono text-xs flex-shrink-0 w-full md:w-72"
            style={{ background: 'rgba(2,132,199,0.07)', border: '1px solid rgba(2,132,199,0.16)' }}>
            <div style={{ color: '#7BA5C0' }}>// sage builder</div>
            <div className="mt-1">
                <span style={{ color: '#6D28D9' }}>create_file</span>
                <span style={{ color: '#3D6080' }}>(</span>
                <span style={{ color: '#B45309' }}>"landing.jsx"</span>
                <span style={{ color: '#3D6080' }}>)</span>
            </div>
            <div>
                <span style={{ color: '#6D28D9' }}>read_file</span>
                <span style={{ color: '#3D6080' }}>(</span>
                <span style={{ color: '#B45309' }}>"package.json"</span>
                <span style={{ color: '#3D6080' }}>)</span>
            </div>
            <div className="mt-1" style={{ color: '#059669' }}>✓ 3 files created</div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const Landing = () => {
    const [demoVisible, setDemoVisible] = useState(false);
    const [inputIndex, setInputIndex] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setInputIndex(i => (i + 1) % DEMO_INPUTS.length), 3200);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen mesh-bg noise font-sans selection:bg-sky-200/60 overflow-x-hidden"
            style={{ color: 'var(--c-text)' }}>

            {/* ── Navbar ────────────────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center"
                style={{
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    background: 'rgba(244, 248, 255, 0.90)',
                    borderBottom: '1px solid rgba(12,100,170,0.13)',
                }}>
                <div className="text-base font-bold tracking-tight flex items-center gap-2.5" style={{ color: '#0D1B35' }}>
                    <span className="live-dot" />
                    SAGE 3.0
                </div>
                <div className="flex items-center gap-5">
                    <div className="hidden sm:flex gap-5 text-sm" style={{ color: '#3D6080' }}>
                        <Link to="/blog" className="transition-colors duration-150"
                            onMouseEnter={e => e.currentTarget.style.color = '#0D1B35'}
                            onMouseLeave={e => e.currentTarget.style.color = '#3D6080'}>Blog</Link>
                        <Link to="/shop" className="transition-colors duration-150"
                            onMouseEnter={e => e.currentTarget.style.color = '#0D1B35'}
                            onMouseLeave={e => e.currentTarget.style.color = '#3D6080'}>Shop</Link>
                    </div>
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition-all duration-150"
                        style={{
                            background: 'linear-gradient(135deg, #0284C7, #1D4ED8)',
                            boxShadow: '0 2px 8px rgba(2,132,199,0.3)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0369A1, #1E40AF)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2,132,199,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0284C7, #1D4ED8)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(2,132,199,0.3)'; }}
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
                        BETA LAUNCH · BLUESKY AUTO-PUBLISH · 🇯🇵 YOKOHAMA, JAPAN
                    </div>

                    {/* Headline */}
                    <h1 className="mb-6 font-black"
                        style={{
                            fontSize: 'clamp(3rem, 9vw, 6.5rem)',
                            letterSpacing: '-0.045em',
                            lineHeight: '0.92',
                            color: '#0D1B35',
                        }}>
                        One Chat.<br />
                        <span style={{
                            background: 'linear-gradient(135deg, #0284C7 0%, #1D4ED8 45%, #DC2626 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            Full Business.
                        </span>
                    </h1>

                    {/* Sub */}
                    <p className="mb-10 font-light"
                        style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#3D6080', maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                        Type one idea. Get a <span style={{ color: '#0D1B35', fontWeight: 600 }}>blog post</span>,{' '}
                        <span style={{ color: '#0D1B35', fontWeight: 600 }}>5 captions</span>, and a{' '}
                        <span style={{ color: '#0D1B35', fontWeight: 600 }}>product ready to sell</span>. In 90 seconds.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
                        <Motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold transition-all duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, #0284C7, #1D4ED8)',
                                    boxShadow: '0 4px 24px rgba(2,132,199,0.35)',
                                    fontSize: '0.95rem',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0369A1, #1E40AF)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(2,132,199,0.45)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0284C7, #1D4ED8)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(2,132,199,0.35)'; }}
                            >
                                Launch Dashboard <FiArrowRight size={16} />
                            </Link>
                        </Motion.div>
                        <Motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                to="/sales"
                                className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all duration-200"
                                style={{
                                    background: 'rgba(220,38,38,0.06)',
                                    border: '1px solid rgba(220,38,38,0.22)',
                                    color: '#DC2626',
                                    fontSize: '0.95rem',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.10)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.38)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.22)'; }}
                            >
                                Get Full Access <FiShoppingCart size={15} />
                            </Link>
                        </Motion.div>
                    </div>
                </Motion.div>

                {/* Scroll cue */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
                    <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, transparent, rgba(2,132,199,0.5))' }} />
                    <span style={{ fontSize: '0.6rem', fontFamily: 'Fira Code', color: '#3D6080', letterSpacing: '0.12em' }}>SCROLL</span>
                </div>
            </section>

            {/* ── Stats Bar ─────────────────────────────────────────────── */}
            <div className="relative z-10 section-divider py-8 px-4">
                <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-8 text-center">
                    {[
                        { value: 'BETA', label: 'Early Access' },
                        { value: 'Feb 2026', label: 'First Release' },
                        { value: '90s', label: 'Idea to Income' },
                        { value: '🇯🇵', label: 'Yokohama, Japan' },
                    ].map((stat, i, arr) => (
                        <React.Fragment key={stat.label}>
                            <div>
                                <p className="font-black text-xl" style={{ color: '#0D1B35', letterSpacing: '-0.02em' }}>
                                    {stat.value}
                                </p>
                                <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: '#3D6080' }}>
                                    {stat.label}
                                </p>
                            </div>
                            {i < arr.length - 1 && (
                                <div className="hidden sm:block w-px h-7" style={{ background: 'rgba(12,100,170,0.15)' }} />
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
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            Everything included
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.03em', color: '#0D1B35' }}>
                            The complete{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, #0284C7 0%, #DC2626 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>autonomous system</span>
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
                        className="text-center mb-12"
                    >
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            How it works
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.03em', color: '#0D1B35' }}>
                            Three steps to your{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, #0284C7 0%, #DC2626 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>first AI income</span>
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
                                <div className="font-mono text-5xl font-black mb-4" style={{ color: 'rgba(2,132,199,0.10)', lineHeight: 1 }}>
                                    {step}
                                </div>
                                <h3 className="font-bold mb-2" style={{ color: '#0D1B35', fontSize: '1rem' }}>{title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: '#3D6080' }}>{desc}</p>
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
                                <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    Auto-published content
                                </p>
                                <h2 className="font-black" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.02em', color: '#0D1B35' }}>
                                    Latest from Sage
                                </h2>
                            </div>
                            <Link to="/blog" className="flex items-center gap-1 text-sm font-medium transition-colors duration-150"
                                style={{ color: '#0284C7' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                                onMouseLeave={e => e.currentTarget.style.color = '#0284C7'}>
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
                                                style={{ fontSize: '0.65rem', fontFamily: 'Fira Code', color: '#7BA5C0' }}>
                                                <FiClock size={9} /> {formatDate(post.date)}
                                            </div>
                                        )}
                                        <h3 className="font-bold leading-snug mb-2 line-clamp-2 transition-colors duration-150"
                                            style={{ fontSize: '0.9rem', color: '#0D1B35' }}>
                                            {post.title}
                                        </h3>
                                        {post.excerpt && (
                                            <p className="text-xs leading-relaxed line-clamp-3"
                                                style={{ color: '#3D6080' }}>
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
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            FAQ
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.03em', color: '#0D1B35' }}>
                            Common questions
                        </h2>
                    </Motion.div>
                    <div className="space-y-2">
                        {[
                            { q: "I'm not technical. Can I actually use this?", a: "Yes. Type what you want in plain English. Sage generates the content. You review and publish. No code, no dashboards, no configuration." },
                            { q: "What exactly gets automated?", a: "Content generation (blog posts, social captions), Bluesky posting, Instagram posting, and Gumroad package creation — all automated end-to-end." },
                            { q: "How is this different from ChatGPT?", a: "ChatGPT gives you text. Sage connects the pipeline — blog, Bluesky, and Gumroad-ready products — in one workflow. You just review and hit publish." },
                            { q: "What if it doesn't work for me?", a: "Gumroad's 30-day money-back guarantee. One-click full refund, no questions asked." },
                            { q: "Do I need to install anything?", a: "The Blueprint ($29.99) is a download-and-run ZIP. No installation needed. Windows only for now." },
                        ].map((item, i) => (
                            <Motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="bento-card p-5"
                            >
                                <h3 className="font-bold mb-2" style={{ fontSize: '0.9rem', color: '#0D1B35' }}>{item.q}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: '#3D6080' }}>{item.a}</p>
                            </Motion.div>
                        ))}
                    </div>
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
                        <p style={{ fontSize: '0.7rem', fontFamily: 'Fira Code', color: '#7BA5C0', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            Get started today
                        </p>
                        <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', letterSpacing: '-0.03em', color: '#0D1B35' }}>
                            Your first{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, #0284C7 0%, #DC2626 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>AI income stream</span>
                        </h2>
                        <p className="mt-2 text-sm" style={{ color: '#3D6080' }}>
                            The exact system Sage 3.0 uses to automate your content pipeline.
                        </p>
                    </Motion.div>

                    <Motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bento-card bento-card-accent card-accent-top p-8 max-w-md"
                    >
                        <div className="sage-badge mb-5" style={{ color: '#0284C7', borderColor: 'rgba(2,132,199,0.22)' }}>
                            Featured Product
                        </div>
                        <h3 className="font-bold text-lg mb-1" style={{ color: '#0D1B35', letterSpacing: '-0.01em' }}>
                            2026 AI Influencer Monetization Express
                        </h3>
                        <div className="font-black text-3xl my-4" style={{ color: '#0D1B35', letterSpacing: '-0.03em' }}>
                            $29.99
                        </div>
                        <ul className="space-y-2 mb-7">
                            {[
                                'Full AI Influencer Blueprint',
                                'Autonomous SNS posting templates',
                                'Monetization funnel step-by-step',
                                'Lifetime access + updates',
                            ].map((f) => (
                                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#3D6080' }}>
                                    <FiCheckCircle size={13} style={{ color: '#059669', flexShrink: 0 }} />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link
                            to="/sales"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #0284C7, #DC2626)',
                                boxShadow: '0 4px 20px rgba(2,132,199,0.25)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0369A1, #B91C1C)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(2,132,199,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0284C7, #DC2626)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(2,132,199,0.25)'; }}
                        >
                            <FiShoppingCart size={15} /> Get Access — $29.99
                        </Link>
                    </Motion.div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="relative z-10 py-12 px-6 section-divider">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-wrap gap-5">
                        {[
                            { label: 'Privacy Policy', to: '/privacy', internal: true },
                            { label: 'Terms of Service', to: '/terms', internal: true },
                            { label: 'Contact', to: 'mailto:sage@onelovepeople.com', internal: false },
                            { label: 'Bluesky', to: 'https://bsky.app/profile/naofumi.bsky.social', internal: false },
                            { label: 'Instagram', to: 'https://www.instagram.com/sege.ai/', internal: false },
                        ].map((link) =>
                            link.internal ? (
                                <Link key={link.label} to={link.to}
                                    className="text-xs font-mono transition-colors duration-150"
                                    style={{ color: '#7BA5C0' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#3D6080'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#7BA5C0'}>
                                    {link.label}
                                </Link>
                            ) : (
                                <a key={link.label} href={link.to}
                                    target={link.to.startsWith('http') ? '_blank' : undefined}
                                    rel={link.to.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    className="text-xs font-mono transition-colors duration-150"
                                    style={{ color: '#7BA5C0' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#3D6080'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#7BA5C0'}>
                                    {link.label}
                                </a>
                            )
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-mono" style={{ color: '#7BA5C0' }}>
                            © 2026 SAGE AI · Autonomous Architect Protocol
                        </p>
                        <p style={{ fontSize: '0.65rem', fontFamily: 'Fira Code', color: '#7BA5C0', marginTop: '0.2rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Made with Sage in Yokohama, Japan
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
