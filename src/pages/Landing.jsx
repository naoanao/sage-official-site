import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiArrowRight, FiShoppingCart, FiClock, FiZap } from 'react-icons/fi';
import SpaceBackground from '../components/SpaceBackground';

// ── Blog posts (latest 3) ──────────────────────────────────────────────────
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
    { icon: '📝', label: 'Blog post generated', detail: '1,200 words · SEO optimized · ready to publish' },
    { icon: '📱', label: '5 social captions ready', detail: 'Bluesky · Instagram · formatted & reviewed' },
    { icon: '💰', label: 'Gumroad package ready', detail: 'ZIP bundle · sales copy · ready to upload' },
    { icon: '🚀', label: 'Posted to Bluesky', detail: 'Auto-published · Instagram draft ready' },
];

const DEMO_INPUTS = [
    "I want to sell AI tips for solopreneurs",
    "I'm a fitness coach looking for new clients",
    "I create digital art and want to monetize it",
];

const HOW_IT_WORKS = [
    { step: '01', icon: '💬', title: 'Type your idea', desc: 'Tell Sage what you want to build or sell. Plain English. No setup.' },
    { step: '02', icon: '⚡', title: 'Sage builds it', desc: 'Blog post, 5 social captions, and a Gumroad package. In 90 seconds.' },
    { step: '03', icon: '💰', title: 'Publish & earn', desc: 'Review the output, hit publish. Bluesky posts automatically.' },
];

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Landing = () => {
    const [snsStats, setSnsStats] = useState({ total_posts: 27 });
    const [demoVisible, setDemoVisible] = useState(false);
    const [inputIndex, setInputIndex] = useState(0);

    useEffect(() => {
        fetch('/api/sns/stats')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.total_posts != null) {
                    setSnsStats({ total_posts: data.total_posts });
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const t = setInterval(() => setInputIndex(i => (i + 1) % DEMO_INPUTS.length), 3000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <SpaceBackground />

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-black/50">
                <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    SAGE 3.0
                </div>
                <div className="flex gap-6 text-sm font-medium text-slate-400 flex-shrink-0 whitespace-nowrap pr-2">
                    <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
                    <Link to="/shop" className="hover:text-white transition-colors">Shop</Link>
                </div>
            </nav>

            {/* ① Hero ─────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 z-10 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300 mb-8 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {snsStats.total_posts}+ POSTS SHIPPED · BLUESKY AUTO-PUBLISH · 🇯🇵 YOKOHAMA, JAPAN
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-6">
                        One Chat.<br />
                        <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Full Business.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                        Type one idea. Get a <span className="text-white">blog post</span>, <span className="text-white">5 captions</span>,
                        and a <span className="text-white">Gumroad product</span>. In 90 seconds.
                    </p>

                    <div className="flex items-center justify-center">
                        <Motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link
                                to="/dashboard"
                                className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg font-bold shadow-[0_0_50px_rgba(37,99,235,0.4)] flex items-center gap-3 transition-all"
                            >
                                Try Sage Free <FiArrowRight />
                            </Link>
                        </Motion.div>
                    </div>
                </Motion.div>
            </section>

            {/* ① Social Proof bar ─────────────────────────────────────── */}
            <div className="relative z-10 py-8 px-4 border-t border-white/5">
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-2xl font-black text-white">{snsStats.total_posts}+</p>
                        <p className="text-xs font-mono text-slate-400">Posts shipped</p>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-white/10" />
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-2xl font-black text-white">Feb 2026</p>
                        <p className="text-xs font-mono text-slate-400">First release</p>
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-white/10" />
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-2xl font-black text-white">🇯🇵</p>
                        <p className="text-xs font-mono text-slate-400">Built in Yokohama, Japan</p>
                    </div>
                </div>
            </div>

            {/* ② How It Works ──────────────────────────────────────────── */}
            <section className="relative z-10 py-24 px-4 border-t border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-16">How It Works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {HOW_IT_WORKS.map(({ step, icon, title, desc }, i) => (
                                <Motion.div
                                    key={step}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="text-xs font-mono text-purple-400 tracking-widest mb-4">STEP {step}</div>
                                    <div className="text-4xl mb-4">{icon}</div>
                                    <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                                </Motion.div>
                            ))}
                        </div>
                    </Motion.div>
                </div>
            </section>

            {/* ③ Before → After Demo ──────────────────────────────────── */}
            <section className="relative z-10 py-24 px-4 bg-gradient-to-b from-black via-slate-900/20 to-black">
                <div className="max-w-2xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        onViewportEnter={() => setDemoVisible(true)}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <FiZap className="text-blue-400" size={20} />
                            <h2 className="text-2xl font-bold">You type. Sage does everything else.</h2>
                        </div>
                        <p className="text-slate-500 text-sm mb-8">This is what happens 90 seconds after you hit send.</p>

                        {/* Input mockup */}
                        <div className="flex gap-3 mb-6">
                            <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 font-mono overflow-hidden">
                                <span className="text-slate-600 select-none">$ </span>
                                <Motion.span
                                    key={inputIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.4 }}
                                    className="text-white"
                                >
                                    {DEMO_INPUTS[inputIndex]}
                                </Motion.span>
                                <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 align-text-bottom animate-pulse" />
                            </div>
                            <div className="px-5 py-3 bg-blue-600/80 text-white rounded-xl font-bold text-sm flex items-center gap-2 cursor-default select-none">
                                <FiZap size={16} /> Running
                            </div>
                        </div>

                        {/* Results — cascade in */}
                        <div className="space-y-3">
                            {DEMO_RESULTS.map((r, i) => (
                                <Motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={demoVisible ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.3 + i * 0.25, duration: 0.5 }}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5"
                                >
                                    <span className="text-2xl flex-shrink-0">{r.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                            {r.label}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5 truncate">{r.detail}</div>
                                    </div>
                                    <Motion.span
                                        initial={{ scale: 0 }}
                                        animate={demoVisible ? { scale: 1 } : {}}
                                        transition={{ delay: 0.5 + i * 0.25, type: 'spring', stiffness: 300 }}
                                        className="text-emerald-400 text-lg flex-shrink-0"
                                    >✓</Motion.span>
                                </Motion.div>
                            ))}
                        </div>

                        {/* CTA */}
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={demoVisible ? { opacity: 1 } : {}}
                            transition={{ delay: 1.6 }}
                            className="mt-8"
                        >
                            <Link
                                to="/dashboard"
                                className="block text-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                            >
                                Try Sage Free →
                            </Link>
                        </Motion.div>
                    </Motion.div>
                </div>
            </section>

            {/* ④ Blog ─────────────────────────────────────────────────── */}
            {allPosts.length > 0 && (
                <section className="relative z-10 py-24 px-4 border-t border-white/5">
                    <div className="max-w-6xl mx-auto">
                        <Motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="flex items-center justify-between mb-12"
                        >
                            <h2 className="text-2xl md:text-3xl font-bold">Latest from Sage</h2>
                            <Link to="/blog" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                                All posts <FiArrowRight size={14} />
                            </Link>
                        </Motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {allPosts.map((post, i) => (
                                <Motion.div
                                    key={post.slug}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Link
                                        to={`/blog/${post.slug}`}
                                        className="block group p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all h-full"
                                    >
                                        {post.date && (
                                            <div className="text-xs font-mono text-slate-600 mb-3 flex items-center gap-1">
                                                <FiClock size={10} /> {formatDate(post.date)}
                                            </div>
                                        )}
                                        <h3 className="text-base font-bold text-white group-hover:text-blue-200 transition-colors mb-3 leading-snug line-clamp-2">
                                            {post.title}
                                        </h3>
                                        {post.excerpt && (
                                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
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

            {/* ⑤ FAQ ───────────────────────────────────────────────────── */}
            <section className="relative z-10 py-32 px-4 border-t border-white/5 bg-gradient-to-b from-slate-900/10 to-black">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-slate-500">Everything you need to know before getting started.</p>
                    </div>
                    <div className="space-y-6">
                        {[
                            { q: "I'm not technical. Can I actually use this?", a: "Yes. Type what you want in plain English. Sage generates the content. You review and publish. That's it. No code, no dashboards, no configuration." },
                            { q: "What exactly gets automated?", a: "Content generation (blog posts, social captions), Bluesky posting, and Gumroad package creation. Instagram drafts are generated but require manual posting for now." },
                            { q: "How is this different from ChatGPT?", a: "ChatGPT gives you text. Sage connects the pipeline — blog, Bluesky, and Gumroad-ready products — in one workflow. You just review and hit publish." },
                            { q: "What if it doesn't work for me?", a: "Gumroad's 30-day money-back guarantee. One-click full refund, no questions asked." },
                            { q: "Do I need to install anything?", a: "The Blueprint ($29.99) is a download-and-run ZIP. No installation needed. Windows only for now." },
                        ].map((item, i) => (
                            <Motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                            >
                                <h3 className="text-lg font-bold text-white mb-3">{item.q}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ⑥ Shop / Monetization ─────────────────────────────────── */}
            <section className="relative z-10 py-32 px-4 border-t border-white/5 bg-gradient-to-b from-black to-slate-900/30">
                <div className="max-w-4xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <FiShoppingCart className="text-emerald-400" size={20} />
                        <h2 className="text-2xl md:text-3xl font-bold">Your First AI Income Stream</h2>
                    </Motion.div>
                    <p className="text-slate-500 text-sm mb-12">The exact system behind {snsStats.total_posts}+ auto-published posts and counting.</p>

                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative group p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all overflow-hidden max-w-xl"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                        <div className="text-sm font-mono text-blue-400 mb-4">FEATURED PRODUCT</div>
                        <h3 className="text-xl font-bold text-white mb-2">2026 AI Influencer Monetization Express</h3>
                        <div className="text-3xl font-black text-white mb-6">$29.99</div>
                        <ul className="space-y-2 text-sm text-slate-300 mb-8">
                            {['Full AI Influencer Blueprint', 'Autonomous SNS posting templates', 'Monetization funnel step-by-step', 'Lifetime access + updates'].map((f, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-emerald-400">✓</span> {f}
                                </li>
                            ))}
                        </ul>
                        <a
                            href="https://naofumi3.gumroad.com/l/yvzrfjd"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                        >
                            <FiShoppingCart size={16} /> Buy on Gumroad — $29.99 →
                        </a>
                    </Motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-white/5 bg-black">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-6 text-xs font-mono text-slate-500">
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <a href="mailto:sage@onelovepeople.com" className="hover:text-white transition-colors">Contact</a>
                        <a href="https://bsky.app/profile/naofumi.bsky.social" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Bluesky</a>
                        <a href="https://www.instagram.com/sege.ai/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-slate-600 text-xs font-mono mb-1">© 2026 SAGE AI | Autonomous Architect Protocol</p>
                        <p className="text-slate-700 text-[10px] font-mono uppercase tracking-widest">Made with Sage in Yokohama, Japan</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
