/**
 * SubscriberGate — wraps the SageOS dashboard.
 *
 * Flow:
 *   1. Check localStorage for a cached verified email (avoids repeated API calls)
 *   2. If not cached → show a small email-verification modal
 *   3. Call GET /api/verify-subscription?email=...
 *   4a. Active subscriber → store in localStorage, render SageOS with plan badge
 *   4b. Not subscribed   → show upgrade modal with plan cards
 *   4c. API error        → fail open (render SageOS anyway — don't lock users out)
 *
 * The gate is skipped entirely for localhost (owner mode).
 */

import React, { useState, useEffect } from 'react';
import SageOS from './SageOS';

const IS_LOCAL = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const LS_KEY  = 'sage_subscriber_email';
const LS_PLAN = 'sage_subscriber_plan';

// ── Small spinner ────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
);

// ── Plan badge (shown in top bar of SageOS) ──────────────────────────────────
export const PlanBadge = ({ plan }) => {
  if (!plan) return null;
  const colors = {
    pro:        'bg-violet-600/20 text-violet-300 border-violet-500/40',
    enterprise: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
  };
  const cls = colors[plan] || colors.pro;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      ✓ {plan === 'enterprise' ? 'Enterprise' : 'Pro'} Member
    </span>
  );
};

// ── Upgrade modal (shown to non-subscribers) ──────────────────────────────────
const UpgradeModal = ({ email, onDismiss }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div className="w-full max-w-lg bg-gray-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 text-center">
        <div className="text-4xl mb-3">🤖</div>
        <h2 className="text-2xl font-black text-white mb-2">
          Sage AI is for subscribers only
        </h2>
        <p className="text-gray-400 text-sm">
          {email
            ? `No active subscription found for ${email}.`
            : 'A subscription is required to access the dashboard.'}
        </p>
      </div>

      {/* Plans */}
      <div className="px-8 pb-4 flex gap-4">
        {/* Pro */}
        <a
          href="https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 p-5 rounded-2xl border border-violet-500/40 bg-violet-900/20 hover:bg-violet-900/40 transition-all text-center group"
        >
          <div className="text-xs text-violet-400 font-mono uppercase tracking-widest mb-2">Most Popular</div>
          <div className="text-3xl font-black text-white mb-0.5">$20</div>
          <div className="text-gray-400 text-sm mb-4">/月</div>
          <ul className="space-y-1.5 text-left mb-5">
            {['Sage AI Dashboard', 'Daily auto-posting to SNS', 'AI content generation', 'Full feature access'].map(f => (
              <li key={f} className="text-xs text-gray-300 flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> {f}
              </li>
            ))}
          </ul>
          <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-sm font-bold group-hover:shadow-lg group-hover:shadow-violet-500/30 transition-all">
            Subscribe to Pro →
          </div>
        </a>

        {/* Enterprise */}
        <a
          href="https://buy.stripe.com/8x25kE3g42MZ45p1GK93y04"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 p-5 rounded-2xl border border-amber-500/30 bg-amber-900/10 hover:bg-amber-900/20 transition-all text-center group"
        >
          <div className="text-xs text-amber-400 font-mono uppercase tracking-widest mb-2">Enterprise</div>
          <div className="text-3xl font-black text-white mb-0.5">$99</div>
          <div className="text-gray-400 text-sm mb-4">/月</div>
          <ul className="space-y-1.5 text-left mb-5">
            {['Pro の全機能', 'API直接アクセス', 'ホワイトラベル', 'オンボーディング通話'].map(f => (
              <li key={f} className="text-xs text-gray-300 flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> {f}
              </li>
            ))}
          </ul>
          <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all">
            Subscribe to Enterprise →
          </div>
        </a>
      </div>

      {/* Footer actions */}
      <div className="px-8 pb-8 flex flex-col items-center gap-3">
        <p className="text-xs text-gray-500">
          Already subscribed?{' '}
          <button
            onClick={onDismiss}
            className="text-violet-400 hover:underline"
          >
            Try a different email
          </button>
        </p>
        <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← Back to home
        </a>
      </div>
    </div>
  </div>
);

// ── Email input modal ─────────────────────────────────────────────────────────
const EmailModal = ({ onVerify, loading }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) onVerify(email.trim());
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-gray-950 border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-xl font-black text-white mb-2">Verify your email</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter the email address you used when subscribing
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
          >
            {loading ? <><Spinner /> Verifying...</> : '→ Enter Dashboard'}
          </button>
        </form>
        <div className="mt-6 space-y-2">
          <p className="text-xs text-gray-500">
            Not subscribed yet?{' '}
            <a
              href="https://buy.stripe.com/fZueVe9EsevHdFZ3OS93y03"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              Start Pro at $20/mo
            </a>
          </p>
          <p className="text-xs text-gray-600">
            <a href="/" className="hover:text-gray-400 transition-colors">← Back to home</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Main gate component ───────────────────────────────────────────────────────
const SubscriberGate = () => {
  // localhost always bypasses the gate
  if (IS_LOCAL) return <SageOS />;

  const [phase,   setPhase]   = useState('checking'); // checking | email | verified | denied
  const [plan,    setPlan]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [email,   setEmail]   = useState('');

  // On mount: check localStorage cache
  useEffect(() => {
    const cachedEmail = localStorage.getItem(LS_KEY);
    const cachedPlan  = localStorage.getItem(LS_PLAN);
    if (cachedEmail && cachedPlan) {
      setPlan(cachedPlan);
      setEmail(cachedEmail);
      setPhase('verified');
    } else {
      setPhase('email');
    }
  }, []);

  const verifyEmail = async (inputEmail) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/verify-subscription?email=${encodeURIComponent(inputEmail)}`
      );
      const data = await res.json();

      if (data.active) {
        const resolvedPlan = data.plan || 'pro';
        localStorage.setItem(LS_KEY,  inputEmail);
        localStorage.setItem(LS_PLAN, resolvedPlan);
        setPlan(resolvedPlan);
        setEmail(inputEmail);
        setPhase('verified');
      } else {
        setEmail(inputEmail);
        setPhase('denied');
      }
    } catch (_) {
      // API unreachable (D1 not bound yet, etc.) — fail open
      const fallbackPlan = 'pro';
      localStorage.setItem(LS_KEY,  inputEmail);
      localStorage.setItem(LS_PLAN, fallbackPlan);
      setPlan(fallbackPlan);
      setEmail(inputEmail);
      setPhase('verified');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_PLAN);
    setEmail('');
    setPlan(null);
    setPhase('email');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  // Still loading from localStorage
  if (phase === 'checking') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Not yet entered email
  if (phase === 'email') {
    return <EmailModal onVerify={verifyEmail} loading={loading} />;
  }

  // Email entered but no active subscription
  if (phase === 'denied') {
    return <UpgradeModal email={email} onDismiss={handleDismiss} />;
  }

  // Verified subscriber — render dashboard with plan badge injected via context
  return (
    <>
      {/* Slim subscriber status bar (sits above SageOS) */}
      <div
        className="fixed top-0 left-0 right-0 z-[400] flex items-center justify-between px-4 py-1.5 text-xs"
        style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
      >
        <span className="text-gray-500 truncate max-w-[200px]">{email}</span>
        <div className="flex items-center gap-3">
          <PlanBadge plan={plan} />
          <a
            href={`/api/customer-portal?email=${encodeURIComponent(email)}`}
            className="text-gray-600 hover:text-gray-400 transition-colors text-xs"
            title="Manage subscription"
          >
            🔧
          </a>
          <button
            onClick={handleDismiss}
            className="text-gray-600 hover:text-gray-400 transition-colors"
            title="Switch account"
          >
            ⇄
          </button>
        </div>
      </div>
      {/* Push SageOS content down by the height of the bar (28px) */}
      <div style={{ paddingTop: '28px' }}>
        <SageOS />
      </div>
    </>
  );
};

export default SubscriberGate;
