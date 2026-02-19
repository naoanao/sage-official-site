import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { FiMessageSquare, FiCpu, FiShare2, FiDollarSign, FiLayout, FiArrowRight, FiActivity, FiShield, FiGlobe, FiDatabase } from 'react-icons/fi';
import SpaceBackground from '../components/SpaceBackground';

const Landing = () => {
    const [snsStats, setSnsStats] = useState({ total_posts: 27, success_rate: '100%' });

    useEffect(() => {
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
            .catch(() => { }); // Fail silently — fallback values remain
    }, []);

    const steps = [
        {
            id: '01',
            title: 'Ideation (Chat Base)',
            desc: 'Talk to Sage using natural language. Shape your vision from vague thoughts to concrete plans.',
            icon: FiMessageSquare,
            color: 'text-blue-400',
            border: 'border-blue-500/30'
        },
        {
            id: '02',
            title: 'Creation (AI SEO)',
            desc: 'Auto-generate high-ranking blog posts and Landing Pages. Validated by real-time data.',
            icon: FiCpu,
            color: 'text-purple-400',
            border: 'border-purple-500/30'
        },
        {
            id: '03',
            title: 'Diffusion (SNS)',
            desc: 'Autonomous social posting & engagement on Bluesky and Instagram. Spread the word automatically.',
            icon: FiShare2,
            color: 'text-pink-400',
            border: 'border-pink-500/30'
        },
        {
            id: '04',
            title: 'Monetization',
            desc: 'Connect Gumroad, Stripe, or PayPal instantly. Turn your audience into revenue.',
            icon: FiDollarSign,
            color: 'text-green-400',
            border: 'border-green-500/30'
        },
        {
            id: '05',
            title: 'Cockpit (Dashboard)',
            desc: 'Visualize your entire empire in one dashboard. Real-time analytics and control.',
            icon: FiLayout,
            color: 'text-orange-400',
            border: 'border-orange-500/30'
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <SpaceBackground />

            {/* Navbar (Minimal) */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-black/50">
                <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    SAGE 3.0
                </div>
                <div className="flex gap-6 text-sm font-medium text-slate-400">
                    <a href="/blog" className="hover:text-white transition-colors">Blog</a>
                    <a href="/offer" className="hover:text-white transition-colors">Store</a>
                    <a href="https://bsky.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">SNS</a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 z-10 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300 mb-8 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        FOR SOLOPRENEURS & CREATORS — 27 POSTS SHIPPED AUTONOMOUSLY
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-6">
                        One Chat.<br />
                        <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Full Business.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                        Stop juggling 10 tools. Sage turns <span className="text-white">one conversation</span> into
                        <span className="text-white"> SEO blogs</span>, <span className="text-white">social posts</span>, and <span className="text-white">revenue</span> — while you sleep.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <Motion.a
                            href="/dashboard"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg font-bold shadow-[0_0_50px_rgba(37,99,235,0.4)] flex items-center gap-3 transition-all"
                        >
                            Try the Cockpit Free <FiArrowRight />
                        </Motion.a>

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

            {/* How It Works (5 Steps) */}
            <section className="relative z-10 py-32 px-4 bg-gradient-to-b from-black via-slate-900/20 to-black">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-20 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">How SAGE Works</h2>
                        <p className="text-slate-500">From a single chat to a fully automated business loop.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {steps.map((step, index) => (
                            <Motion.div
                                key={step.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative group p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-default overflow-hidden`}
                            >
                                <div className={`absolute top-0 left-0 w-full h-1 ${step.color.replace('text-', 'bg-')} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                                <div className="text-5xl font-black text-white/5 absolute top-4 right-4 group-hover:text-white/10 transition-colors">
                                    {step.id}
                                </div>

                                <div className={`mb-6 p-4 rounded-xl bg-white/5 w-fit ${step.color}`}>
                                    <step.icon size={24} />
                                </div>

                                <h3 className="text-lg font-bold mb-3 text-white group-hover:text-blue-200 transition-colors">
                                    {step.title}
                                </h3>

                                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300">
                                    {step.desc}
                                </p>
                            </Motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="relative z-10 py-24 border-t border-white/5 bg-black">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center mb-16">
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-blue-500 mb-2">{snsStats.total_posts}</div>
                            <div className="text-sm font-mono text-slate-500 uppercase tracking-widest">Autonomous Posts Shipped</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-purple-500 mb-2">24/7</div>
                            <div className="text-sm font-mono text-slate-500 uppercase tracking-widest">Active System Uptime</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-emerald-500 mb-2">{snsStats.success_rate}</div>
                            <div className="text-sm font-mono text-slate-500 uppercase tracking-widest">Execution Reliability</div>
                        </div>
                    </div>
                    <p className="text-center text-slate-400 italic font-light max-w-2xl mx-auto">
                        "Sage doesn't just suggest ideas; it builds the evidence of your growing empire in real-time."
                    </p>
                </div>
            </section>

            {/* Pricing */}
            <section className="relative z-10 py-32 px-4 bg-gradient-to-b from-black to-slate-900/30">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-slate-500">Start free. Scale when you're ready.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Free */}
                        <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                            <div className="text-sm font-mono text-slate-500 mb-2">TEST DRIVE</div>
                            <div className="text-4xl font-black mb-1">$0</div>
                            <div className="text-sm text-slate-500 mb-8">See what Sage can do</div>
                            <ul className="space-y-3 text-sm text-slate-400 mb-8">
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> AI Chat (unlimited)</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Dashboard access</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> 3 blog posts / month</li>
                                <li className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">—</span> <span className="text-slate-600">Autonomous SNS posting</span></li>
                                <li className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">—</span> <span className="text-slate-600">Monetization tools</span></li>
                            </ul>
                            <a href="/dashboard" className="block w-full text-center py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm font-bold">
                                Try It Free
                            </a>
                        </div>

                        {/* Pro — Highlighted */}
                        <div className="p-8 rounded-2xl bg-blue-600/10 border border-blue-500/30 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                            <div className="text-sm font-mono text-blue-400 mb-2">PRO — {snsStats.total_posts}+ POSTS SHIPPED LAST MONTH</div>
                            <div className="text-4xl font-black mb-1">$29<span className="text-lg font-normal text-slate-500">/mo</span></div>
                            <div className="text-sm text-slate-400 mb-8">~<span className="text-white font-medium">$1/day</span> · You sleep. Sage ships.</div>
                            <ul className="space-y-3 text-sm text-slate-300 mb-8">
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Everything in Starter</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> <span className="text-white font-medium">Unlimited AI blog posts</span></li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> <span className="text-white font-medium">Autonomous SNS (Bluesky + Instagram)</span></li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Monetization dashboard</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Priority support</li>
                            </ul>
                            <a href="/offer" className="block w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                                Go Autopilot — 7 Days Free
                            </a>
                        </div>

                        {/* Enterprise */}
                        <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                            <div className="text-sm font-mono text-slate-500 mb-2">SCALE</div>
                            <div className="text-4xl font-black mb-1">Custom</div>
                            <div className="text-sm text-slate-500 mb-8">Your AI, your brand</div>
                            <ul className="space-y-3 text-sm text-slate-400 mb-8">
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Everything in Pro</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Custom AI model tuning</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> White-label deployment</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> API access</li>
                                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Dedicated support</li>
                            </ul>
                            <a href="mailto:sage@onelovepeople.com" className="block w-full text-center py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm font-bold">
                                Book a Demo
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* System Intelligence (Etc) */}
            <section className="relative z-10 py-24 px-4 border-t border-white/5 bg-slate-900/10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-12 text-slate-300">System Intelligence Core</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: "Neuromorphic Brain", icon: FiCpu },
                            { name: "Self-Healing v2", icon: FiShield },
                            { name: "System Analytics", icon: FiActivity },
                            { name: "Global Knowledge", icon: FiGlobe }
                        ].map((item, i) => (
                            <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center gap-3 text-slate-400 hover:text-white hover:border-white/20 transition-all">
                                <item.icon size={20} />
                                <span className="text-xs font-mono uppercase tracking-wider">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="relative z-10 py-32 px-4 bg-gradient-to-b from-slate-900/10 to-black">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-slate-500">Everything you need to know before getting started.</p>
                    </div>

                    <div className="space-y-6">
                        {[
                            {
                                q: "I'm not technical. Can I actually use this?",
                                a: "Yes — that's the whole point. You type what you want in plain English. Sage writes the blog, posts to social media, and tracks the results. No code, no dashboards to configure, no learning curve."
                            },
                            {
                                q: "What exactly gets automated?",
                                a: "Blog post generation, SEO optimization, social media posting (Bluesky & Instagram), content scheduling, and performance analytics. All running 24/7."
                            },
                            {
                                q: "Can I cancel anytime?",
                                a: "Yes. No contracts, no lock-in. Cancel your Pro subscription anytime and keep access until the end of your billing period."
                            },
                            {
                                q: "Is my data safe?",
                                a: "Absolutely. Sage runs a hybrid AI architecture — sensitive data stays on your local machine, only non-private content touches the cloud for speed."
                            },
                            {
                                q: "What kind of support do I get?",
                                a: "Starter users get community support. Pro users get priority email support with 24h response time. Enterprise gets a dedicated engineer."
                            }
                        ].map((item, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                                <h3 className="text-lg font-bold text-white mb-3">{item.q}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Detailed Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-white/5 bg-black">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-6 text-xs font-mono text-slate-500">
                        <a href="https://onelovepeople.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="https://onelovepeople.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="mailto:sage@onelovepeople.com" className="hover:text-white transition-colors">Contact</a>
                    </div>

                    <div className="text-center md:text-right">
                        <p className="text-slate-600 text-xs font-mono mb-1">
                            © 2026 SAGE AI | Autonomous Architect Protocol
                        </p>
                        <p className="text-slate-700 text-[10px] font-mono uppercase tracking-widest">
                            Made with Sage in Yokohama, Japan
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
