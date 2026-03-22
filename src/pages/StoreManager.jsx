import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiDollarSign, FiShoppingBag, FiEdit2,
    FiArchive, FiTrash2, FiCheck, FiX, FiRefreshCw,
    FiAlertTriangle, FiExternalLink, FiPackage,
} from 'react-icons/fi';
import axios from 'axios';
import { BACKEND_URL } from '../config/backendUrl';
import { toast } from '../utils/toast';

// ── Admin token (stored in localStorage once, persists) ───────────────────────
const getAdminToken = () => localStorage.getItem('sage_admin_token') || '';

const makeApi = () => axios.create({
    baseURL: BACKEND_URL,
    timeout: 30000,
    headers: { 'X-SAGE-ADMIN-TOKEN': getAdminToken() },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtUSD = (cents) => cents != null ? `$${(cents / 100).toFixed(2)}` : '—';
const fmtDate = (unix) => unix
    ? new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

// ── Demo fallback data ────────────────────────────────────────────────────────
const DEMO_PRODUCTS = [
    { id: 'prod_demo1', name: '2026 AI Monetization Guide', description: 'Digital product', price_cents: 2999, active: true, created: 1700000000 },
    { id: 'prod_demo2', name: 'Sage Prompt Library', description: 'Prompt templates', price_cents: 1999, active: true, created: 1701000000 },
];
const DEMO_REVENUE = { total_cents: 45700, order_count: 18, avg_cents: 2539 };
const DEMO_PAYMENTS = [
    { id: 'pi_d1', amount: 2999, currency: 'usd', status: 'succeeded', created: 1710000000, email: 'buyer@example.com' },
    { id: 'pi_d2', amount: 1999, currency: 'usd', status: 'succeeded', created: 1709000000, email: null },
];

// ── StatusBadge ───────────────────────────────────────────────────────────────
const STATUS = {
    succeeded:  { bg: 'rgba(5,150,105,0.1)',  color: '#059669', border: 'rgba(5,150,105,0.2)',  label: 'Paid' },
    failed:     { bg: 'rgba(192,57,43,0.1)',   color: '#C0392B', border: 'rgba(192,57,43,0.2)',  label: 'Failed' },
    canceled:   { bg: 'rgba(107,143,175,0.1)', color: '#6B8FAF', border: 'rgba(107,143,175,0.2)', label: 'Canceled' },
    processing: { bg: 'rgba(26,86,219,0.1)',   color: '#1A56DB', border: 'rgba(26,86,219,0.2)',  label: 'Processing' },
};
const StatusBadge = ({ status }) => {
    const s = STATUS[status] || { bg: 'rgba(217,119,6,0.1)', color: '#D97706', border: 'rgba(217,119,6,0.2)', label: 'Pending' };
    return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {s.label}
        </span>
    );
};

// ── MetricCard ────────────────────────────────────────────────────────────────
const MetricCard = ({ icon, label, value, accent, delay }) => (
    <Motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="bento-card p-6 flex-1 min-w-[160px]"
        style={{ borderTopColor: accent, borderTopWidth: 2 }}
    >
        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--c-muted)' }}>
            {icon}
            <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
        </div>
        <div className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-text)' }}>
            {value}
        </div>
    </Motion.div>
);

// ── StripeProductCard ─────────────────────────────────────────────────────────
const StripeProductCard = ({ product, onRefresh, delay }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: product.name,
        description: product.description || '',
        price: product.price_cents ? (product.price_cents / 100).toFixed(2) : '',
    });
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [err, setErr] = useState(null);

    const inputStyle = {
        background: 'var(--c-raised)', border: '1px solid var(--c-border)',
        color: 'var(--c-text)', outline: 'none',
    };

    const handleSave = async () => {
        setSaving(true); setErr(null);
        try {
            const api = makeApi();
            const res = await api.post(`/api/store/products/${product.id}/update`, {
                name: form.name || undefined,
                description: form.description,
                price: form.price ? parseFloat(form.price) : undefined,
            });
            if (res.data.status === 'success') {
                toast.success(`"${form.name}" updated`);
                setEditing(false); onRefresh();
            } else {
                const msg = res.data.message || 'Save failed';
                setErr(msg); toast.error(msg);
            }
        } catch (e) {
            const msg = e.response?.data?.message || (!e.response ? 'Backend unreachable' : 'Save failed');
            setErr(msg); toast.error(msg);
        } finally { setSaving(false); }
    };

    const handleArchive = async () => {
        setSaving(true);
        try {
            const api = makeApi();
            await api.post(`/api/store/products/${product.id}/archive`);
            toast.warn(`"${product.name}" archived`);
            onRefresh();
        } catch (e) {
            const msg = e.response?.data?.message || (!e.response ? 'Backend unreachable' : 'Archive failed');
            setErr(msg); toast.error(msg);
        } finally { setSaving(false); setConfirming(false); }
    };

    return (
        <Motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35 }}
            className="bento-card p-5"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    {editing ? (
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full text-sm font-bold rounded-lg px-3 py-1.5"
                            style={inputStyle} placeholder="Product name" />
                    ) : (
                        <h3 className="font-bold text-sm truncate" style={{ color: 'var(--c-text)' }}>{product.name}</h3>
                    )}
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--c-subtle)' }}>
                        {product.id} · {fmtDate(product.created)}
                    </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
                    ACTIVE
                </span>
            </div>

            {/* Price */}
            <div className="mb-3">
                {editing ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono" style={{ color: 'var(--c-muted)' }}>$</span>
                        <input type="number" step="0.01" min="0"
                            value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                            className="w-28 text-sm rounded-lg px-3 py-1.5"
                            style={inputStyle} placeholder="29.99" />
                        <span className="text-xs" style={{ color: 'var(--c-subtle)' }}>USD</span>
                    </div>
                ) : (
                    <span className="text-xl font-black" style={{ color: 'var(--c-text)' }}>
                        {product.price_cents != null ? fmtUSD(product.price_cents) : '—'}
                    </span>
                )}
            </div>

            {/* Description (edit mode) */}
            {editing && (
                <textarea rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full text-xs rounded-lg px-3 py-2 resize-none mb-3"
                    style={inputStyle} placeholder="Description (optional)" />
            )}

            {err && <p className="text-xs mb-2" style={{ color: 'var(--c-red)' }}>{err}</p>}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
                {editing ? (
                    <>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                            style={{ background: 'var(--c-blue)' }}>
                            {saving ? <FiRefreshCw size={12} className="animate-spin" /> : <FiCheck size={12} />} Save
                        </button>
                        <button onClick={() => { setEditing(false); setErr(null); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: 'var(--c-raised)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                            <FiX size={12} /> Cancel
                        </button>
                    </>
                ) : confirming ? (
                    <>
                        <span className="text-xs self-center" style={{ color: 'var(--c-red)' }}>Archive this product?</span>
                        <button onClick={handleArchive} disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: 'var(--c-red)' }}>
                            {saving ? <FiRefreshCw size={12} className="animate-spin" /> : <FiArchive size={12} />} Confirm
                        </button>
                        <button onClick={() => setConfirming(false)} className="text-xs px-2" style={{ color: 'var(--c-muted)' }}>
                            <FiX size={12} />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: 'var(--c-raised)', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}>
                            <FiEdit2 size={12} /> Edit
                        </button>
                        <button onClick={() => setConfirming(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--c-red)', border: '1px solid rgba(192,57,43,0.2)' }}>
                            <FiArchive size={12} /> Archive
                        </button>
                    </>
                )}
            </div>
        </Motion.div>
    );
};

// ── WhopProductCard ───────────────────────────────────────────────────────────
const WhopProductCard = ({ product, onRefresh, delay }) => {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const api = makeApi();
            await api.delete(`/api/whop/products/${product.slug}`);
            toast.success(`"${product.title || product.slug}" removed from Whop registry`);
            onRefresh();
        } catch (e) {
            toast.error(e.response?.data?.error || (!e.response ? 'Backend unreachable' : 'Delete failed'));
        } finally { setDeleting(false); setConfirming(false); }
    };

    return (
        <Motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35 }}
            className="bento-card p-5"
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>
                    {product.title || product.topic || product.slug}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--c-violet)', border: '1px solid rgba(124,58,237,0.2)' }}>
                    WHOP
                </span>
            </div>
            {product.price_usd && (
                <p className="text-xl font-black mb-1" style={{ color: 'var(--c-text)' }}>${product.price_usd}</p>
            )}
            <p className="text-xs mb-2 font-mono" style={{ color: 'var(--c-subtle)' }}>
                slug: {product.slug}
                {product.saved_at && ` · ${new Date(product.saved_at).toLocaleDateString()}`}
            </p>
            {product.checkout_url && (
                <a href={product.checkout_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs mb-3"
                    style={{ color: 'var(--c-blue)' }}>
                    <FiExternalLink size={11} /> Checkout link
                </a>
            )}
            <div className="flex gap-2">
                {confirming ? (
                    <>
                        <span className="text-xs self-center" style={{ color: 'var(--c-red)' }}>Remove from registry?</span>
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: 'var(--c-red)' }}>
                            {deleting ? <FiRefreshCw size={12} className="animate-spin" /> : <FiTrash2 size={12} />} Delete
                        </button>
                        <button onClick={() => setConfirming(false)} className="text-xs px-2" style={{ color: 'var(--c-muted)' }}>
                            <FiX size={12} />
                        </button>
                    </>
                ) : (
                    <button onClick={() => setConfirming(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--c-red)', border: '1px solid rgba(192,57,43,0.2)' }}>
                        <FiTrash2 size={12} /> Delete
                    </button>
                )}
            </div>
        </Motion.div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const StoreManager = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDemo, setIsDemo] = useState(false);

    const [stripeProducts, setStripeProducts] = useState([]);
    const [whopProducts, setWhopProducts] = useState([]);
    const [revenue, setRevenue] = useState(null);
    const [payments, setPayments] = useState([]);

    // Admin token prompt
    const [showTokenPrompt, setShowTokenPrompt] = useState(!getAdminToken());
    const [tokenInput, setTokenInput] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const api = makeApi();
            const [prodRes, revRes] = await Promise.all([
                api.get('/api/store/products'),
                api.get('/api/store/revenue'),
            ]);
            const stripe = prodRes.data.stripe || [];
            const whop = prodRes.data.whop || [];
            const sum = revRes.data.summary || {};
            const demo = stripe.length === 0;
            setStripeProducts(demo ? DEMO_PRODUCTS : stripe);
            setWhopProducts(whop);
            setRevenue(demo ? DEMO_REVENUE : sum);
            setPayments(revRes.data.payments?.length ? revRes.data.payments : (demo ? DEMO_PAYMENTS : []));
            setIsDemo(demo);
        } catch (e) {
            if (e.response?.status === 401) {
                setShowTokenPrompt(true);
            } else {
                setError(e.message);
                setStripeProducts(DEMO_PRODUCTS);
                setRevenue(DEMO_REVENUE);
                setPayments(DEMO_PAYMENTS);
                setIsDemo(true);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (!showTokenPrompt) fetchAll(); }, [showTokenPrompt, fetchAll]);

    const handleTokenSubmit = () => {
        if (!tokenInput) return;
        localStorage.setItem('sage_admin_token', tokenInput);
        setShowTokenPrompt(false);
    };

    // ── Token prompt ────────────────────────────────────────────────────────
    if (showTokenPrompt) {
        return (
            <div className="min-h-screen mesh-bg noise flex items-center justify-center px-4">
                <Motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bento-card p-8 w-full max-w-sm text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                        <FiShoppingBag size={22} style={{ color: 'var(--c-blue)' }} />
                    </div>
                    <h2 className="text-lg font-black mb-1" style={{ color: 'var(--c-text)' }}>Store Manager</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--c-muted)' }}>
                        Enter your SAGE_ADMIN_TOKEN to continue
                    </p>
                    <input type="password"
                        className="w-full rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none"
                        style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                        placeholder="SAGE_ADMIN_TOKEN"
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTokenSubmit()}
                    />
                    <button onClick={handleTokenSubmit} disabled={!tokenInput}
                        className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #1A56DB, #0284C7)' }}>
                        Unlock
                    </button>
                    <Link to="/dashboard" className="block mt-4 text-xs" style={{ color: 'var(--c-subtle)' }}>
                        ← Back to Cockpit
                    </Link>
                </Motion.div>
            </div>
        );
    }

    // ── Main layout ────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen mesh-bg noise font-sans overflow-x-hidden" style={{ color: 'var(--c-text)' }}>

            {/* Header */}
            <header className="sticky top-0 z-50 px-6 py-4 flex items-center gap-4"
                style={{
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    background: 'rgba(244,248,255,0.92)', borderBottom: '1px solid var(--c-border)',
                }}>
                <Link to="/dashboard" className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: 'var(--c-muted)' }}>
                    <FiArrowLeft size={16} /> Back to Cockpit
                </Link>
                <div className="flex-1 flex items-center gap-3">
                    <h1 className="text-base font-black tracking-tight" style={{ color: 'var(--c-text)' }}>
                        Store Manager
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono"
                        style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
                        <span className="live-dot" /> LIVE
                    </span>
                    {isDemo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
                            style={{ background: 'rgba(217,119,6,0.08)', color: 'var(--c-amber)', border: '1px solid rgba(217,119,6,0.2)' }}>
                            <FiAlertTriangle size={10} /> DEMO DATA
                        </span>
                    )}
                </div>
                <button onClick={fetchAll} disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'var(--c-raised)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                    <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </header>

            <div className="max-w-5xl mx-auto px-4 pb-20">

                {/* Revenue Summary */}
                {revenue && (
                    <div className="flex gap-4 flex-wrap pt-8 pb-6">
                        <MetricCard icon={<FiDollarSign size={14} />} label="Revenue (30d)"
                            value={fmtUSD(revenue.total_cents)} accent="var(--c-emerald)" delay={0} />
                        <MetricCard icon={<FiShoppingBag size={14} />} label="Orders"
                            value={revenue.order_count ?? '—'} accent="var(--c-blue)" delay={0.06} />
                        <MetricCard icon={<FiDollarSign size={14} />} label="Avg Order"
                            value={fmtUSD(revenue.avg_cents)} accent="var(--c-violet)" delay={0.12} />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
                        style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--c-red)', border: '1px solid rgba(192,57,43,0.2)' }}>
                        <FiAlertTriangle size={14} /> {error}
                    </div>
                )}

                {/* Tab bar */}
                <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
                    style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                    {['products', 'orders'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className="px-5 py-2 rounded-lg text-sm font-bold transition-all capitalize"
                            style={activeTab === tab
                                ? { background: 'var(--c-surface)', color: 'var(--c-text)', boxShadow: '0 1px 4px rgba(13,27,53,0.08)' }
                                : { color: 'var(--c-muted)' }}>
                            {tab === 'products'
                                ? `Products (${stripeProducts.length + whopProducts.length})`
                                : `Orders (${payments.length})`}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">

                    {/* PRODUCTS TAB */}
                    {activeTab === 'products' && (
                        <Motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {/* Stripe */}
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--c-text)' }}>
                                        Stripe Products
                                    </h2>
                                    <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                                        style={{ background: 'var(--c-raised)', color: 'var(--c-subtle)', border: '1px solid var(--c-border)' }}>
                                        {stripeProducts.length}
                                    </span>
                                </div>
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[0, 1].map(i => (
                                            <div key={i} className="bento-card p-5 animate-pulse h-32"
                                                style={{ background: 'var(--c-raised)' }} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {stripeProducts.map((p, i) => (
                                            <StripeProductCard key={p.id} product={p} onRefresh={fetchAll} delay={i * 0.05} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Whop */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--c-text)' }}>
                                        Whop Registry
                                    </h2>
                                    <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                                        style={{ background: 'var(--c-raised)', color: 'var(--c-subtle)', border: '1px solid var(--c-border)' }}>
                                        {whopProducts.length}
                                    </span>
                                </div>
                                {!loading && whopProducts.length === 0 ? (
                                    <div className="bento-card p-8 text-center text-sm" style={{ color: 'var(--c-subtle)' }}>
                                        <FiPackage size={24} className="mx-auto mb-2 opacity-30" />
                                        No Whop products yet. Use PUBLISH in the Cockpit to add one.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {whopProducts.map((p, i) => (
                                            <WhopProductCard key={p.slug} product={p} onRefresh={fetchAll} delay={i * 0.05} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Motion.div>
                    )}

                    {/* ORDERS TAB */}
                    {activeTab === 'orders' && (
                        <Motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="bento-card overflow-hidden">
                                {loading ? (
                                    <div className="p-8 text-center animate-pulse" style={{ color: 'var(--c-subtle)' }}>
                                        Loading payments…
                                    </div>
                                ) : payments.length === 0 ? (
                                    <div className="p-10 text-center" style={{ color: 'var(--c-subtle)' }}>
                                        <FiPackage size={28} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">No orders found.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-raised)' }}>
                                                    {['Date', 'Amount', 'Email', 'Status'].map(h => (
                                                        <th key={h} className="text-left px-4 py-3 text-xs font-mono"
                                                            style={{ color: 'var(--c-subtle)' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map((p, i) => (
                                                    <Motion.tr key={p.id}
                                                        initial={{ opacity: 0, x: -6 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        className="transition-colors hover:bg-[var(--c-raised)]"
                                                        style={{ borderBottom: '1px solid var(--c-border)' }}>
                                                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--c-muted)' }}>
                                                            {fmtDate(p.created)}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold" style={{ color: 'var(--c-text)' }}>
                                                            {fmtUSD(p.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--c-muted)' }}>
                                                            {p.email || '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <StatusBadge status={p.status} />
                                                        </td>
                                                    </Motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StoreManager;
