import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiMessageSquare, FiArrowRight, FiSend, FiRss, FiShoppingCart, FiClock } from 'react-icons/fi';
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

const Landing = () => {
    const [snsStats, setSnsStats] = useState({ total_posts: 27, success_rate: '100%' });

    // ── Chat state ──
    const [chatInput, setChatInput] = useState('');
    const [chatReply, setChatReply] = useState('');
    const [chatStatus, setChatStatus] = useState('idle'); // idle | loading | offline

    // ── Bluesky feed ──
    const [bskyPosts, setBskyPosts] = useState([]);
    const [bskyLoaded, setBskyLoaded] = useState(false);

    useEffect(() => {
        // SNS stats
        fetch('/api/sns/stats')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.total_posts != null) {
                    setSnsStats({
                        total_posts: data.total_posts,
                        success_rate: data.success_rate === 1.0 ? '100%' : `${Math.round(data.success_rate * 100)}%`
                    });
                }
            })
            .catch(() => {});

        // Bluesky feed
        fetch('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=kanagawajapan.bsky.social&limit=3')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.feed) {
                    const posts = data.feed
                        .filter(item => item.post?.record?.text)
                        .slice(0, 3)
                        .map(item => ({
                            text: item.post.record.text,
                            uri: item.post.uri,
                            indexedAt: item.post.indexedAt,
                        }));
                    setBskyPosts(posts);
                    setBskyLoaded(posts.length > 0);
                }
            })
            .catch(() => {});
    }, []);

    const handleChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setChatStatus('loading');
        try {
            const res = await fetch('http://localhost:8080/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: chatInput }),
            });
            if (!res.ok) throw new Error('offline');
            const data = await res.json();
            setChatReply(data.reply || data.response || data.message || 'Got it.');
            setChatStatus('idle');
        } catch {
            setChatStatus('offline');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <SpaceBackground />

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-black/50">
                <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    SAGE 3.0
                </div>
                <div className="flex gap-4 sm:gap-6 text-sm font-medium text-slate-400 flex-shrink-0 whitespace-nowrap">
                    <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
                    <Link to="/shop" className="hover:text-white transition-colors">Shop</Link>
                    <a href="/offer" className="hover:text-white transition-colors">Store</a>
                    <a href="https://bsky.app/profile/naofumi.bsky.social" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Bluesky</a>
                    <a href="https://www.instagram.com/sege.ai/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        FOR SOLOPRENEURS & CREATORS · {snsStats.total_posts} POSTS SHIPPED AUTONOMOUSLY
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-6">
                        One Chat.<br />
                        <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Full Business.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                        Stop juggling 10 tools. Sage turns <span className="text-white">one conversation</span> into
                        <span className="text-white"> SEO blogs</span>, <span className="text-white">social posts</span>, and <span className="text-white">revenue</span> while you sleep.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <Motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link
                                to="/dashboard"
                                className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg font-bold shadow-[0_0_50px_rgba(37,99,235,0.4)] flex items-center gap-3 transition-all"
                            >
                                Try the Cockpit Free <FiArrowRight />
                            </Link>
                        </Motion.div>

                        <Motion.a
                            href="/offer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl text-lg font-bold backdrop-blur-md transition-all flex items-center gap-3"
                        >
                            Get the Full Blueprint <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/70">$29</span>
                        </Motion.a>
                    </div>
                </Motion.div>
            </section>

            {/* ② Chat ─────────────────────────────────────────────────── */}
            <section className="relative z-10 py-24 px-4 bg-gradient-to-b from-black via-slate-900/20 to-black">
                <div className="max-w-2xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <FiMessageSquare className="text-blue-400" size={20} />
                            <h2 className="text-2xl font-bold">Talk to Sage</h2>
                        </div>
                        <p className="text-slate-500 text-sm mb-8">Ask anything. Sage will help you build, post, and monetize.</p>

                        <form onSubmit={handleChat} className="flex gap-3">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="e.g. Write me a viral Instagram caption about AI..."
                                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={chatStatus === 'loading'}
                                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                            >
                                <FiSend size={16} />
                                {chatStatus === 'loading' ? 'Thinking...' : 'Send'}
                            </button>
                        </form>

                        {chatStatus === 'offline' && (
                            <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-400">
                                Sage is currently offline.{' '}
                                <Link to="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors">
                                    Try the Cockpit →
                                </Link>
                            </div>
                        )}
                        {chatReply && chatStatus === 'idle' && (
                            <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-300 leading-relaxed">
                                {chatReply}
                            </div>
                        )}
                    </Motion.div>
                </div>
            </section>

            {/* ③ Blog ─────────────────────────────────────────────────── */}
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
                                                <FiClock size={10} /> {post.date}
                                            </div>
                                        )}
                                        <h3 className="text-base font-bold text-white group-hover:text-blue-200 transition-colors mb-3 leading-snug">
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

            {/* ④ Bluesky Live Feed ────────────────────────────────────── */}
            {bskyLoaded && (
                <section className="relative z-10 py-24 px-4 border-t border-white/5 bg-slate-900/10">
                    <div className="max-w-4xl mx-auto">
                        <Motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="flex items-center gap-3 mb-12"
                        >
                            <FiRss className="text-sky-400" size={20} />
                            <h2 className="text-2xl md:text-3xl font-bold">Live Feed</h2>
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                        </Motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {bskyPosts.map((post, i) => (
                                <Motion.a
                                    key={post.uri}
                                    href={`https://bsky.app/profile/kanagawajapan.bsky.social`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="block group p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-sky-500/20 transition-all"
                                >
                                    <p className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                                        {post.text}
                                    </p>
                                    {post.indexedAt && (
                                        <p className="text-xs text-slate-600 mt-3 font-mono">
                                            {new Date(post.indexedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    )}
                                </Motion.a>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ⑤ Shop / Monetization ─────────────────────────────────── */}
            <section className="relative z-10 py-32 px-4 border-t border-white/5 bg-gradient-to-b from-black to-slate-900/30">
                <div className="max-w-4xl mx-auto">
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <FiShoppingCart className="text-emerald-400" size={20} />
                        <h2 className="text-2xl md:text-3xl font-bold">Get the Blueprint</h2>
                    </Motion.div>
                    <p className="text-slate-500 text-sm mb-12">Everything you need to launch an AI-powered influencer business.</p>

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
                        <div className="flex gap-3">
                            <Link
                                to="/shop"
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center gap-2"
                            >
                                <FiShoppingCart size={16} /> View in Shop
                            </Link>
                            <a
                                href="https://naofumi3.gumroad.com/l/yvzrfjd"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                            >
                                Buy on Gumroad <FiArrowRight size={14} />
                            </a>
                        </div>
                    </Motion.div>
                </div>
            </section>

            {/* FAQ */}
            <section className="relative z-10 py-32 px-4 border-t border-white/5 bg-gradient-to-b from-slate-900/10 to-black">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-slate-500">Everything you need to know before getting started.</p>
                    </div>
                    <div className="space-y-6">
                        {[
                            { q: "I'm not technical. Can I actually use this?", a: "Yes — that's the whole point. You type what you want in plain English. Sage writes the blog, posts to social media, and tracks the results. No code, no dashboards to configure, no learning curve." },
                            { q: "What exactly gets automated?", a: "Blog post generation, SEO optimization, social media posting (Bluesky & Instagram), content scheduling, and performance analytics. All running 24/7." },
                            { q: "Can I cancel anytime?", a: "Yes. No contracts, no lock-in. Cancel your Pro subscription anytime and keep access until the end of your billing period." },
                            { q: "Is my data safe?", a: "Absolutely. Sage runs a hybrid AI architecture — sensitive data stays on your local machine, only non-private content touches the cloud for speed." },
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

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-white/5 bg-black">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-6 text-xs font-mono text-slate-500">
                        <a href="https://onelovepeople.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="https://onelovepeople.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="mailto:sage@onelovepeople.com" className="hover:text-white transition-colors">Contact</a>
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
