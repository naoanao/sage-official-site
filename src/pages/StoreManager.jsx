import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
    FiArrowLeft, FiEdit2, FiTrash2, FiArchive, FiCheck, FiX,
    FiDollarSign, FiShoppingBag, FiTrendingUp, FiClock, FiRefreshCw,
    FiPackage, FiAlertCircle,
} from 'react-icons/fi';
import { BACKEND_URL } from '../config/backendUrl';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (ts) => new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_STYLE = {
    succeeded: { bg: 'rgba(5,150,105,0.12)', color: '#059669', label: 'Paid' },
    requires_payment_method: { bg: 'rgba(217,119,6,0.12)', color: '#D97706', label: 'Pending' },
    canceled: { bg: 'rgba(192,57,43,0.12)', color: '#C0392B', label: 'Canceled' },
    processing: { bg: 'rgba(26,86,219,0.1)', color: '#1A56DB', label: 'Processing' },
};
const statusStyle = (s) => STATUS_STYLE[s] || { bg: 'rgba(107,143,175,0.12)', color: '#6B8FAF', label: s };

// ── Sub-components ────────────────────────────────────────────────────────────
const MetricCard = ({ icon: Icon, label, value, color, delay }) => (
    <Motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="bento-card p-6 flex flex-col gap-2"
    >
        <div className="flex items-center gap-2" style={{ color: 'var(--c-subtle)' }}>
            <Icon size={14} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'Fira Code', letterSpacing: '0.08em' }}>
                {label}
            </span>
        </div>
        <div className="text-3xl font-black tracking-tighter" style={{ color }}>
            {value}
        </div>
    </Motion.div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const StoreManager = () => {
    const [tab, setTab] = useState('products');
    const [products, setProducts] = useState({ stripe: [], whop: [] });
    const [revenue, setRevenue] = useState({ summary: { total: 0, orders: 0, avg: 0, currency: 'USD' }, payments: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);

    // Confirm delete/archive
    const [confirmId, setConfirmId] = useState(null);
    const [confirmType, setConfirmType] = useState(null); // 'archive' | 'delete-whop'

    const fetchAll = useCallback(() => {
        setLoading(true);
        setError(null);
        Promise.all([
            fetch(`${BACKEND_URL}/api/store/products`).then(r => r.json()),
            fetch(`${BACKEND_URL}/api/store/revenue`).then(r => r.json()),
        ])
            .then(([p, r]) => {
                setProducts(p);
                setRevenue(r);
            })
            .catch(() => setError('Backend unreachable. Start Flask and refresh.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const startEdit = (product) => {
        setEditingId(product.id);
        setEditForm({ name: product.name, description: product.description || '' });
    };

    const handleSave = async (productId) => {
        setSaving(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/store/products/${productId}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setProducts(prev => ({
                    ...prev,
                    stripe: prev.stripe.map(p => p.id === productId ? { ...p, ...editForm } : p),
                }));
                setEditingId(null);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (productId) => {
        setConfirmId(null);
        const res = await fetch(`${BACKEND_URL}/api/store/products/${productId}/archive`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
            setProducts(prev => ({
                ...prev,
                stripe: prev.stripe.filter(p => p.id !== productId),
            }));
        }
    };

    const handleWhopDelete = async (slug) => {
        setConfirmId(null);
        const res = await fetch(`${BACKEND_URL}/api/whop/products/${slug}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') {
            setProducts(prev => ({ ...prev, whop: prev.whop.filter(p => p.slug !== slug) }));
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const { summary, payments } = revenue;

    return (
        <div className="min-h-screen mesh-bg noise font-sans overflow-x-hidden" style={{ color: 'var(--c-text)' }}>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center"
                style={{
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    background: 'rgba(244,248,255,0.88)',
                    borderBottom: '1px solid var(--c-border)',
                }}>
                <div className="flex items-center gap-4">
                    <Link to="/dashboard"
                        className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-blue-600"
                        style={{ color: 'var(--c-muted)' }}>
                        <FiArrowLeft size={14} /> Cockpit
                    </Link>
                    <div style={{ width: 1, height: 16, background: 'var(--c-border)' }} />
                    <div className="flex items-center gap-2 font-bold text-base tracking-tight" style={{ color: 'var(--c-text)' }}>
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-emerald)' }} />
                        Store Manager
                    </div>
                </div>
                <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{
                        background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                        color: 'var(--c-muted)', cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                >
                    <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </nav>

            <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto">

                {/* Error banner */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm"
                        style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', color: '#C0392B' }}>
                        <FiAlertCircle size={16} /> {error}
                    </div>
                )}

                {/* ── Revenue Summary ─────────────────────────────────────── */}
                <div className="mb-10">
                    <p className="text-xs font-mono mb-4" style={{ color: 'var(--c-subtle)', letterSpacing: '0.08em' }}>
                        REVENUE — LAST 30 DAYS
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <MetricCard icon={FiDollarSign} label="TOTAL REVENUE" value={loading ? '—' : fmt(summary.total)} color="var(--c-emerald)" delay={0} />
                        <MetricCard icon={FiShoppingBag} label="ORDERS" value={loading ? '—' : summary.orders} color="var(--c-blue)" delay={0.08} />
                        <MetricCard icon={FiTrendingUp} label="AVG ORDER VALUE" value={loading ? '—' : fmt(summary.avg)} color="var(--c-violet)" delay={0.16} />
                    </div>
                </div>

                {/* ── Tab bar ────────────────────────────────────────────── */}
                <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit"
                    style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                    {['products', 'orders'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
                            style={{
                                background: tab === t ? 'white' : 'transparent',
                                color: tab === t ? 'var(--c-blue)' : 'var(--c-muted)',
                                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                            }}>
                            {t === 'products' ? `Products (${(products.stripe?.length || 0) + (products.whop?.length || 0)})` : `Orders (${payments.length})`}
                        </button>
                    ))}
                </div>

                {/* ── Products Tab ────────────────────────────────────────── */}
                {tab === 'products' && (
                    <div>
                        {/* Stripe Products */}
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs font-mono px-2 py-0.5 rounded"
                                    style={{ background: 'rgba(26,86,219,0.08)', color: 'var(--c-blue)', border: '1px solid rgba(26,86,219,0.2)' }}>
                                    STRIPE
                                </span>
                                <span className="text-xs" style={{ color: 'var(--c-muted)' }}>
                                    {products.stripe?.length || 0} products
                                </span>
                            </div>

                            {loading ? (
                                <div className="bento-card p-8 text-center" style={{ color: 'var(--c-subtle)' }}>
                                    <FiRefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                    Loading…
                                </div>
                            ) : products.stripe?.length === 0 ? (
                                <div className="bento-card p-8 text-center text-sm" style={{ color: 'var(--c-subtle)' }}>
                                    No Stripe products yet. Create one from the Cockpit pipeline.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {products.stripe.map((p, i) => (
                                        <Motion.div key={p.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="bento-card p-5"
                                        >
                                            {editingId === p.id ? (
                                                /* Edit form */
                                                <div className="space-y-3">
                                                    <input
                                                        value={editForm.name}
                                                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                        placeholder="Product name"
                                                        className="w-full px-3 py-2 rounded-lg text-sm"
                                                        style={{
                                                            background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                                                            color: 'var(--c-text)', outline: 'none',
                                                        }}
                                                    />
                                                    <textarea
                                                        value={editForm.description}
                                                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                                        placeholder="Description (optional)"
                                                        rows={2}
                                                        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                                                        style={{
                                                            background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                                                            color: 'var(--c-text)', outline: 'none',
                                                        }}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleSave(p.id)} disabled={saving}
                                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                                                            style={{ background: 'var(--c-blue)', color: '#fff' }}>
                                                            <FiCheck size={12} /> {saving ? 'Saving…' : 'Save'}
                                                        </button>
                                                        <button onClick={() => setEditingId(null)}
                                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                                                            style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
                                                            <FiX size={12} /> Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Display row */
                                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="font-semibold text-sm truncate" style={{ color: 'var(--c-text)' }}>
                                                                {p.name}
                                                            </span>
                                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                                                style={{
                                                                    background: p.active ? 'rgba(5,150,105,0.1)' : 'rgba(192,57,43,0.1)',
                                                                    color: p.active ? '#059669' : '#C0392B',
                                                                }}>
                                                                {p.active ? 'active' : 'archived'}
                                                            </span>
                                                        </div>
                                                        {p.description && (
                                                            <p className="text-xs truncate" style={{ color: 'var(--c-muted)' }}>{p.description}</p>
                                                        )}
                                                        <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--c-subtle)' }}>
                                                            {p.price ? fmt(p.price) : 'No price'} · Created {fmtDate(p.created)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button onClick={() => startEdit(p)}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                                            style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)', color: 'var(--c-blue)' }}>
                                                            <FiEdit2 size={11} /> Edit
                                                        </button>
                                                        {confirmId === p.id && confirmType === 'archive' ? (
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => handleArchive(p.id)}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                                                    style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B' }}>
                                                                    Confirm
                                                                </button>
                                                                <button onClick={() => setConfirmId(null)}
                                                                    className="px-2 py-1.5 rounded-lg text-xs"
                                                                    style={{ color: 'var(--c-muted)' }}>
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => { setConfirmId(p.id); setConfirmType('archive'); }}
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                                                style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', color: '#C0392B' }}>
                                                                <FiArchive size={11} /> Archive
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Whop Products */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs font-mono px-2 py-0.5 rounded"
                                    style={{ background: 'rgba(5,150,105,0.08)', color: 'var(--c-emerald)', border: '1px solid rgba(5,150,105,0.2)' }}>
                                    WHOP
                                </span>
                                <span className="text-xs" style={{ color: 'var(--c-muted)' }}>
                                    {products.whop?.length || 0} products
                                </span>
                            </div>

                            {!loading && products.whop?.length === 0 ? (
                                <div className="bento-card p-8 text-center text-sm" style={{ color: 'var(--c-subtle)' }}>
                                    No Whop products yet. Publish one from the Cockpit pipeline.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {products.whop?.map((p, i) => (
                                        <Motion.div key={p.slug}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="bento-card p-5"
                                        >
                                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm truncate mb-0.5" style={{ color: 'var(--c-text)' }}>
                                                        {p.topic || p.slug}
                                                    </p>
                                                    {p.checkout_url && (
                                                        <a href={p.checkout_url} target="_blank" rel="noopener noreferrer"
                                                            className="text-xs truncate block hover:underline"
                                                            style={{ color: 'var(--c-blue)' }}>
                                                            {p.checkout_url}
                                                        </a>
                                                    )}
                                                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--c-subtle)' }}>
                                                        <FiClock size={10} className="inline mr-1" />
                                                        {p.saved_at ? new Date(p.saved_at).toLocaleDateString() : '—'}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {confirmId === p.slug && confirmType === 'delete-whop' ? (
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => handleWhopDelete(p.slug)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                                                style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B' }}>
                                                                Confirm Delete
                                                            </button>
                                                            <button onClick={() => setConfirmId(null)}
                                                                className="px-2 py-1.5 rounded-lg text-xs"
                                                                style={{ color: 'var(--c-muted)' }}>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setConfirmId(p.slug); setConfirmType('delete-whop'); }}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                                            style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', color: '#C0392B' }}>
                                                            <FiTrash2 size={11} /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </Motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Orders Tab ──────────────────────────────────────────── */}
                {tab === 'orders' && (
                    <div>
                        {loading ? (
                            <div className="bento-card p-8 text-center" style={{ color: 'var(--c-subtle)' }}>
                                <FiRefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                Loading…
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="bento-card p-10 text-center" style={{ color: 'var(--c-subtle)' }}>
                                <FiPackage size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No orders yet.</p>
                                <p className="text-xs mt-1">Orders will appear here once Stripe Live keys are set.</p>
                            </div>
                        ) : (
                            <div className="bento-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-raised)' }}>
                                                {['Date', 'Amount', 'Status', 'Description', 'Email'].map(h => (
                                                    <th key={h} className="text-left px-4 py-3 text-xs font-mono font-medium"
                                                        style={{ color: 'var(--c-subtle)' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((p, i) => {
                                                const ss = statusStyle(p.status);
                                                return (
                                                    <Motion.tr key={p.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        style={{ borderBottom: '1px solid var(--c-border)' }}
                                                    >
                                                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap"
                                                            style={{ color: 'var(--c-muted)' }}>
                                                            {fmtDate(p.created)}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-sm whitespace-nowrap"
                                                            style={{ color: 'var(--c-text)' }}>
                                                            {fmt(p.amount)} {p.currency}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                                                                style={{ background: ss.bg, color: ss.color }}>
                                                                {ss.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs max-w-[200px] truncate"
                                                            style={{ color: 'var(--c-muted)' }}>
                                                            {p.description || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs"
                                                            style={{ color: 'var(--c-muted)' }}>
                                                            {p.email || '—'}
                                                        </td>
                                                    </Motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoreManager;
