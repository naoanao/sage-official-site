/**
 * Onboarding — 3-step guide for new subscribers
 * Route: /onboarding
 *
 * Step 1: Configure SOUL (identity, niche, brand)
 * Step 2: Connect Bluesky
 * Step 3: Fire your first post
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiChevronRight, FiExternalLink, FiZap } from 'react-icons/fi';
import { LINKS } from '../config/links';

const LS_KEY = 'sage_onboarding_done';

const STEPS = [
    {
        id: 'soul',
        num: '01',
        icon: '🧠',
        title: 'Configure your SOUL',
        subtitle: 'Tell Sage who you are',
        time: '3 min',
        desc: 'Set your niche, brand name, target audience, and tone. Every piece of content Sage generates will be built around this identity.',
        actions: [
            {
                label: 'Open SOUL in Dashboard',
                href: '/dashboard',
                state: { openSoul: true },
                primary: true,
            },
        ],
        tips: [
            'Niche example: "AI productivity for solopreneurs"',
            'Tone: authoritative, friendly, or educational — pick one',
            'Brand name is what appears in your bios and bylines',
        ],
        fields: [
            { label: 'Niche', example: 'AI passive income for solopreneurs' },
            { label: 'Brand Name', example: 'Sage AI' },
            { label: 'Tone', example: 'Authoritative & Friendly' },
            { label: 'Audience', example: 'Online entrepreneurs aged 28–45' },
        ],
    },
    {
        id: 'bluesky',
        num: '02',
        icon: '🦋',
        title: 'Connect Bluesky',
        subtitle: 'Enable daily auto-posting',
        time: '2 min',
        desc: 'Add your Bluesky handle and App Password to activate the daily auto-posting pipeline. Sage posts once per day while you sleep.',
        actions: [
            {
                label: 'Get App Password',
                href: 'https://bsky.app/settings/app-passwords',
                external: true,
            },
            {
                label: 'Open Dashboard → Automations',
                href: '/dashboard',
                state: { openAutomations: true },
                primary: true,
            },
        ],
        tips: [
            'Create a dedicated App Password — never use your main login',
            'Handle format: yourname.bsky.social',
            'Posts go out at 9 AM UTC by default',
        ],
        fields: [
            { label: 'Handle', example: 'yourname.bsky.social' },
            { label: 'App Password', example: 'xxxx-xxxx-xxxx-xxxx' },
        ],
    },
    {
        id: 'firstpost',
        num: '03',
        icon: '🚀',
        title: 'Fire your first post',
        subtitle: 'See the pipeline live',
        time: '1 min',
        desc: 'Go to the dashboard, enter a topic in TALK mode, and watch Sage generate a full blog post + 5 social captions. Approve one and it queues for tomorrow.',
        actions: [
            {
                label: 'Open Dashboard → TALK',
                href: '/dashboard',
                primary: true,
            },
        ],
        tips: [
            'Try: "3 AI tools that save solopreneurs 5 hours a week"',
            'The output includes blog draft + Bluesky + Dev.to versions',
            'Approved posts auto-publish at the next scheduled time',
        ],
    },
];

// ── Step card ──────────────────────────────────────────────────────────────────
const StepCard = ({ step, index, done, onToggle }) => {
    const [open, setOpen] = useState(index === 0);

    return (
        <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            className="rounded-2xl border overflow-hidden"
            style={{
                borderColor: done ? 'rgba(16,185,129,0.4)' : open ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                background: done
                    ? 'rgba(16,185,129,0.05)'
                    : open
                    ? 'rgba(99,102,241,0.04)'
                    : 'rgba(255,255,255,0.02)',
            }}
        >
            {/* Header row */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
            >
                {/* Step number / done indicator */}
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-mono font-bold transition-all"
                    style={{
                        background: done
                            ? 'rgba(16,185,129,0.2)'
                            : 'rgba(99,102,241,0.15)',
                        border: `1px solid ${done ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.3)'}`,
                        color: done ? '#10b981' : '#818cf8',
                    }}
                >
                    {done ? <FiCheck size={16} /> : step.num}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{step.icon}</span>
                        <span className="font-bold text-white text-sm">{step.title}</span>
                        {done && (
                            <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                DONE
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.subtitle} · {step.time}</p>
                </div>

                <FiChevronRight
                    size={16}
                    className="flex-shrink-0 text-slate-600 transition-transform"
                    style={{ transform: open ? 'rotate(90deg)' : 'none' }}
                />
            </button>

            {/* Expanded body */}
            <AnimatePresence>
                {open && (
                    <Motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-5">
                            {/* Description */}
                            <p className="text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-5">
                                {step.desc}
                            </p>

                            {/* Fields reference (if any) */}
                            {step.fields && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {step.fields.map(({ label, example }) => (
                                        <div
                                            key={label}
                                            className="px-3 py-2.5 rounded-xl text-xs"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                        >
                                            <div className="text-slate-500 font-mono mb-1">{label}</div>
                                            <div className="text-slate-400 italic">{example}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tips */}
                            {step.tips && (
                                <ul className="space-y-1.5">
                                    {step.tips.map(tip => (
                                        <li key={tip} className="flex items-start gap-2 text-xs text-slate-500">
                                            <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-3 pt-1">
                                {step.actions.map(({ label, href, external, primary, state }) =>
                                    external ? (
                                        <a
                                            key={label}
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                borderColor: 'rgba(255,255,255,0.1)',
                                                color: '#94a3b8',
                                            }}
                                        >
                                            {label}
                                            <FiExternalLink size={12} />
                                        </a>
                                    ) : (
                                        <Link
                                            key={label}
                                            to={href}
                                            state={state}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                                            style={primary ? {
                                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                color: 'white',
                                                boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                                            } : {
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#94a3b8',
                                            }}
                                        >
                                            {label}
                                            <FiChevronRight size={12} />
                                        </Link>
                                    )
                                )}
                            </div>

                            {/* Mark done toggle */}
                            <button
                                onClick={() => onToggle(step.id)}
                                className="flex items-center gap-2 text-xs transition-colors mt-1"
                                style={{ color: done ? '#f87171' : '#10b981' }}
                            >
                                <div
                                    className="w-4 h-4 rounded border flex items-center justify-center"
                                    style={{
                                        background: done ? 'rgba(248,113,113,0.15)' : 'rgba(16,185,129,0.15)',
                                        borderColor: done ? 'rgba(248,113,113,0.4)' : 'rgba(16,185,129,0.4)',
                                    }}
                                >
                                    {done && <FiCheck size={10} />}
                                </div>
                                {done ? 'Mark as not done' : 'Mark as done'}
                            </button>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </Motion.div>
    );
};

// ── Page ───────────────────────────────────────────────────────────────────────
const Onboarding = () => {
    const [done, setDone] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        } catch {
            return {};
        }
    });

    const doneCount = Object.values(done).filter(Boolean).length;
    const allDone = doneCount === STEPS.length;

    const toggle = (id) => {
        setDone(prev => {
            const next = { ...prev, [id]: !prev[id] };
            localStorage.setItem(LS_KEY, JSON.stringify(next));
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-black text-white px-4 py-16">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <Motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                        <FiZap size={11} />
                        GETTING STARTED
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            3 steps to live.
                        </span>
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Complete these once and Sage runs autonomously every day.
                    </p>

                    {/* Progress bar */}
                    <div className="mt-6 flex items-center gap-3 max-w-xs mx-auto">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <Motion.div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(doneCount / STEPS.length) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{doneCount}/{STEPS.length}</span>
                    </div>
                </Motion.div>

                {/* Steps */}
                <div className="space-y-4 mb-10">
                    {STEPS.map((step, i) => (
                        <StepCard
                            key={step.id}
                            step={step}
                            index={i}
                            done={!!done[step.id]}
                            onToggle={toggle}
                        />
                    ))}
                </div>

                {/* All done banner */}
                <AnimatePresence>
                    {allDone && (
                        <Motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center p-8 rounded-2xl mb-10"
                            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}
                        >
                            <div className="text-4xl mb-3">🎉</div>
                            <h2 className="text-xl font-black text-white mb-2">You're fully set up.</h2>
                            <p className="text-sm text-slate-400 mb-5">
                                Sage will now generate and publish content automatically every day.
                            </p>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.25)' }}
                            >
                                <FiZap size={14} />
                                Open Dashboard
                            </Link>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* Footer links */}
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10"
                >
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                    >
                        <span className="text-xl">🖥️</span>
                        <div>
                            <div className="font-semibold text-sm text-white">Open Dashboard</div>
                            <div className="text-xs text-slate-500">Manage content & automations</div>
                        </div>
                    </Link>
                    <a
                        href={`mailto:${LINKS.support.email}`}
                        className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                    >
                        <span className="text-xl">💬</span>
                        <div>
                            <div className="font-semibold text-sm text-white">Get help</div>
                            <div className="text-xs text-slate-500">{LINKS.support.email}</div>
                        </div>
                    </a>
                </Motion.div>

                {/* Footer */}
                <div className="text-center space-y-2 text-xs text-slate-700">
                    <p>
                        Manage subscription →{' '}
                        <a href="/api/customer-portal" className="text-slate-600 hover:text-white underline transition-colors">
                            Stripe billing portal
                        </a>
                    </p>
                    <Link to="/" className="block hover:text-slate-400 transition-colors">
                        ← Back to Sage AI
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
