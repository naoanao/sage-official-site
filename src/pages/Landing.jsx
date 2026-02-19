import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STRIPE_LINKS, addUTM } from '../config/stripe';

const Landing = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [snsStats, setSnsStats] = useState({ total_posts: 31 });
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth) - 0.5,
                y: (e.clientY / window.innerHeight) - 0.5
            });
        };
        const handleScroll = () => setScrolled(window.scrollY > 50);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        fetch('/api/sns/stats')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data && data.total_posts) setSnsStats(data); })
            .catch(() => { });
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative font-sans selection:bg-fuchsia-500/30">
            {/* --- PREMIUM AMBIANCE --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Floating Orb 1 */}
                <motion.div
                    animate={{
                        x: mousePosition.x * 50,
                        y: mousePosition.y * 50,
                    }}
                    className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-gradient-to-br from-violet-600/20 to-transparent rounded-full blur-[120px]"
                />
                {/* Floating Orb 2 */}
                <motion.div
                    animate={{
                        x: mousePosition.x * -30,
                        y: mousePosition.y * -30,
                    }}
                    className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-gradient-to-br from-fuchsia-600/20 to-transparent rounded-full blur-[120px]"
                />
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjA1Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent)]"></div>
            </div>

            {/* --- NAVBAR --- */}
            <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/10' : 'py-8 bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-violet-500/20">S</div>
                        <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">SAGE AI</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#products" className="hover:text-white transition-colors">Pricing</a>
                        <a href="/blog" className="hover:text-white transition-colors">Blog</a>
                        <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            href={addUTM(STRIPE_LINKS.fortress, 'website', 'nav_cta')}
                            className="px-5 py-2.5 bg-white text-black rounded-full font-bold hover:bg-violet-400 hover:text-white transition-all shadow-xl shadow-white/5"
                        >
                            Get Started
                        </motion.a>
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-32 pb-20">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
                            <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></span>
                            <span className="text-xs font-bold tracking-widest text-fuchsia-400 uppercase">Phase 3-B Live: Autonomous Engine v2.4</span>
                        </div>

                        <h1 className="text-6xl md:text-9xl font-black mb-8 leading-[0.9] tracking-tight">
                            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent pb-2">
                                AI{" "}AGENT
                            </span>
                            <span className="block text-white">
                                CONTROLS{" "}YOUR
                            </span>
                            <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent pt-2">
                                ENTIRE{" "}PC
                            </span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-xl text-gray-400 mb-12 font-medium leading-relaxed">
                            Experience the world's most advanced neuromorphic SNN agent.
                            From SNS marketing to workflow orchestration—completely{" "}
                            <span className="text-white border-b border-violet-500/50">hands-free.</span>
                        </p>

                        {/* Stats Bar Component */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
                            {[
                                { val: '30', unit: 'DAYS', label: 'NO HUMAN', color: 'text-violet-400' },
                                { val: '39', unit: 'APPS', label: 'INTEGRATED', color: 'text-pink-400' },
                                { val: snsStats.total_posts, unit: 'POSTS', label: 'AUTO-SHIPPED', color: 'text-fuchsia-400' },
                                { val: '24/7', unit: 'ALWAYS', label: 'AUTONOMOUS', color: 'text-cyan-400' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] transition-all group"
                                >
                                    <div className={`text-4xl font-black mb-1 ${stat.color} group-hover:scale-110 transition-transform`}>{stat.val}</div>
                                    <div className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">{stat.unit} {stat.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Hero CTAs */}
                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                            <motion.a
                                href={addUTM(STRIPE_LINKS.fortress, 'website', 'hero_cta')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative px-10 py-5 text-xl font-black rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/20"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500"></div>
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative z-10 flex items-center gap-3">
                                    DEPLOY FORTRESS
                                    <span className="px-2 py-0.5 rounded-lg bg-black/20 text-yellow-300 text-sm">$299</span>
                                </span>
                            </motion.a>

                            <motion.a
                                href="/blog"
                                className="px-10 py-5 text-xl font-black rounded-2xl border-2 border-white/10 backdrop-blur-sm hover:border-white/30 hover:bg-white/5 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                START EXPLORING
                            </motion.a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- FEATURES GRID --- */}
            <section id="features" className="relative z-10 py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-5xl md:text-7xl font-black mb-6">
                            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">PREMIUM STACK</span>
                        </h2>
                        <p className="text-white/40 font-medium tracking-widest uppercase text-sm">Engineered for absolute performance</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: '🧠', title: 'Neuromorphic Brain', desc: '1000-neuron SNN with 94% accuracy STDP learning capabilities.', color: 'from-violet-500/20' },
                            { icon: '🤖', title: 'Execution Engine', desc: 'Orchestrating 39+ applications with deep system integration hooks.', color: 'from-blue-500/20' },
                            { icon: '🔒', title: 'Pulse Self-Healing', desc: 'Autonomous error detection and recovery. 30 days verified uptime.', color: 'from-fuchsia-500/20' },
                            { icon: '🌀', title: 'Omni-Channel', desc: 'Bluesky, Instagram, Notion, Jira—unified into one neural stream.', color: 'from-cyan-500/20' },
                            { icon: '📈', title: 'Real-time Metrics', desc: 'Granular tracking of every neuron fire. KPI dash built-in.', color: 'from-pink-500/20' },
                            { icon: '⚡', title: 'Dual-Core LLM', desc: 'Groq (1.2s) for speed + Local GPU (45s) for privacy redundancy.', color: 'from-amber-500/20' },
                        ].map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`group p-8 rounded-[2.5rem] bg-gradient-to-br ${f.color} to-transparent border border-white/10 backdrop-blur-xl hover:border-white/30 transition-all duration-500`}
                            >
                                <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{f.icon}</div>
                                <h3 className="text-2xl font-black mb-3 group-hover:text-violet-400 transition-colors">{f.title}</h3>
                                <p className="text-white/50 leading-relaxed font-medium">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- PRICING SECTION --- */}
            <section id="products" className="relative z-10 py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-600/20 rounded-[3rem] p-12 border border-white/5 backdrop-blur-3xl">
                        <div className="text-center mb-16">
                            <h2 className="text-5xl md:text-6xl font-black mb-4">DEPLOY SAGE</h2>
                            <p className="text-white/40 font-bold uppercase tracking-tighter text-lg">Choose your level of autonomy</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { name: 'Bluesky', price: '29', period: '/mo', link: 'bluesky', desc: 'AI-driven social growth' },
                                { name: 'Instagram', price: '39', period: '/mo', link: 'instagram', desc: 'Visual story automation' },
                                { name: 'SNS Bundle', price: '59', period: '/mo', link: 'bundle', badge: 'POPULAR', desc: 'Full network presence' },
                                { name: 'Fortress', price: '299', period: 'ONCE', link: 'fortress', badge: 'ULTIMATE', desc: 'Full PC Control Agent' },
                            ].map((p, i) => (
                                <motion.a
                                    key={i}
                                    href={addUTM(STRIPE_LINKS[p.link], 'website', 'pricing_card')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ y: -10 }}
                                    className="relative flex flex-col p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-violet-500/50 transition-all group"
                                >
                                    {p.badge && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full text-[10px] font-black tracking-widest shadow-lg shadow-violet-500/30">
                                            {p.badge}
                                        </div>
                                    )}
                                    <div className="mb-6">
                                        <span className="text-4xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">${p.price}</span>
                                        <span className="text-sm text-white/30 font-bold ml-1 uppercase">{p.period}</span>
                                    </div>
                                    <h4 className="text-xl font-black mb-2">{p.name}</h4>
                                    <p className="text-sm text-white/40 font-medium mb-8 leading-relaxed">{p.desc}</p>

                                    <div className="mt-auto flex items-center justify-between">
                                        <span className="text-xs font-black tracking-widest text-violet-400 opacity-60 group-hover:opacity-100 group-hover:text-white transition-all">SELECT PLAN</span>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                </motion.a>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="relative z-10 py-20 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
                    <div>
                        <div className="text-2xl font-black tracking-tighter mb-4">SAGE AI</div>
                        <p className="text-white/30 text-sm max-w-sm leading-relaxed">
                            The first neural SNN agent built to operate systems as a human would.
                            Precision, performance, and complete transparency.
                        </p>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-4">
                        <div className="flex gap-6 text-sm font-bold text-white/40">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                            <a href="#" className="hover:text-white transition-colors">Contact</a>
                        </div>
                        <p className="text-[10px] font-black tracking-[0.3em] text-white/10 uppercase">© 2026 SAGE SYSTEMS. ALL RIGHTS RESERVED.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
