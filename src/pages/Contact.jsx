import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FiMail, FiMessageCircle, FiArrowRight } from 'react-icons/fi';
import { LINKS } from '../config/links';

const Contact = () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(LINKS.support.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen mesh-bg noise font-sans overflow-x-hidden" style={{ color: 'var(--c-text)' }}>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center"
                style={{
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    background: 'rgba(244, 248, 255, 0.88)',
                    borderBottom: '1px solid var(--c-border)',
                }}>
                <div className="text-xl font-bold tracking-tighter flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-blue)' }}></span>
                    SAGE 3.0
                </div>
                <div className="flex gap-4 sm:gap-6 text-sm font-medium" style={{ color: 'var(--c-muted)' }}>
                    <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
                    <Link to="/shop" className="hover:text-blue-600 transition-colors">Shop</Link>
                    <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-40 pb-12 px-4 text-center">
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6"
                        style={{
                            background: 'var(--c-raised)',
                            border: '1px solid var(--c-border)',
                            color: 'var(--c-subtle)',
                        }}>
                        <FiMail size={12} />
                        CONTACT US
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none mb-4">
                        <span style={{ color: 'var(--c-text)' }}>Get in{' '}</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #0284C7 0%, #1A56DB 50%, #1E40AF 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            Touch.
                        </span>
                    </h1>
                    <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--c-muted)' }}>
                        Questions about Sage AI, billing, or your account? We respond within 24 hours.
                    </p>
                </Motion.div>
            </section>

            {/* Contact Cards */}
            <section className="pb-32 px-4">
                <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Email card */}
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative p-8 rounded-2xl"
                        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
                            style={{ background: 'linear-gradient(90deg, #0284C7, #1A56DB)' }} />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(2,132,199,0.1)' }}>
                                <FiMail size={18} style={{ color: '#0284C7' }} />
                            </div>
                            <div>
                                <div className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>Email Support</div>
                                <div className="text-xs" style={{ color: 'var(--c-muted)' }}>Replies within 24 hours</div>
                            </div>
                        </div>
                        <p className="text-sm mb-6" style={{ color: 'var(--c-muted)' }}>
                            For general questions, billing issues, account access, or feature requests.
                        </p>
                        <div className="flex flex-col gap-2">
                            <a
                                href={`mailto:${LINKS.support.email}`}
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                                style={{ background: 'linear-gradient(135deg, #1A56DB, #0284C7)' }}
                            >
                                <FiMail size={15} />
                                Send Email
                                <FiArrowRight size={15} />
                            </a>
                            <button
                                onClick={handleCopy}
                                className="w-full py-2.5 rounded-xl text-xs font-mono transition-all"
                                style={{
                                    background: 'var(--c-raised)',
                                    border: '1px solid var(--c-border)',
                                    color: copied ? '#059669' : 'var(--c-subtle)',
                                }}
                            >
                                {copied ? '✓ Copied!' : LINKS.support.email}
                            </button>
                        </div>
                    </Motion.div>

                    {/* Bluesky / Community card */}
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative p-8 rounded-2xl"
                        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
                            style={{ background: 'linear-gradient(90deg, #059669, #0891b2)' }} />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(5,150,105,0.1)' }}>
                                <FiMessageCircle size={18} style={{ color: '#059669' }} />
                            </div>
                            <div>
                                <div className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>Community</div>
                                <div className="text-xs" style={{ color: 'var(--c-muted)' }}>Follow us on Bluesky</div>
                            </div>
                        </div>
                        <p className="text-sm mb-6" style={{ color: 'var(--c-muted)' }}>
                            Follow Sage AI on Bluesky for daily updates, tips, and to connect with other users building AI income streams.
                        </p>
                        <a
                            href={LINKS.sns.bluesky}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
                        >
                            <FiMessageCircle size={15} />
                            Follow on Bluesky
                            <FiArrowRight size={15} />
                        </a>
                    </Motion.div>

                    {/* FAQ note */}
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="md:col-span-2 p-6 rounded-2xl text-center"
                        style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}
                    >
                        <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
                            Looking for billing & subscription management?{' '}
                            <Link to="/sales" className="font-bold hover:underline" style={{ color: 'var(--c-blue)' }}>
                                View plans
                            </Link>
                            {' '}· To cancel or change your subscription, email{' '}
                            <a href={`mailto:${LINKS.support.email}?subject=Subscription%20Management`} className="font-bold hover:underline" style={{ color: 'var(--c-blue)' }}>
                                {LINKS.support.email}
                            </a>
                        </p>
                    </Motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 px-6" style={{ borderTop: '1px solid var(--c-border)' }}>
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 text-xs font-mono" style={{ color: 'var(--c-subtle)' }}>
                        <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
                        <Link to="/contact" className="hover:text-blue-600 transition-colors" style={{ color: 'var(--c-blue)' }}>Contact</Link>
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'var(--c-subtle)' }}>
                        © 2026 SAGE AI | Autonomous Architect Protocol
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Contact;
