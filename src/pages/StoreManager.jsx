import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiCheck, FiX, FiArchive, FiRefreshCw, FiDollarSign, FiShoppingBag, FiTrendingUp } from 'react-icons/fi';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount, currency = 'usd') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
}

function fmtDate(ts) {
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
    const map = {
        succeeded:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        requires_payment_method: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        canceled:   'bg-red-500/20 text-red-300 border-red-500/30',
        processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${map[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
            {status}
        </span>
    );
}

// ── Editable Product Row ──────────────────────────────────────────────────────

function ProductRow({ product, onArchive }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(product.name);
    const [desc, setDesc] = useState(product.description);
    const [saving, setSaving] = useState(false);

    async function save() {
        setSaving(true);
        try {
            await fetch(`${API_BASE}/api/store/products/${product.id}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: desc }),
            });
            setEditing(false);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {editing ? (
                        <div className="space-y-2">
                            <input
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Product name"
                            />
                            <input
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-slate-400 focus:outline-none focus:border-blue-500"
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="Description"
                            />
                        </div>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-white truncate">{name}</p>
                            {desc && <p className="text-xs text-slate-500 mt-0.5 truncate">{desc}</p>}
                        </>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {product.prices.map(pr => (
                            <span key={pr.id} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20 font-mono">
                                {fmt(pr.amount, pr.currency)}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {editing ? (
                        <>
                            <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors" title="Save">
                                {saving ? <span className="animate-spin text-xs">⟳</span> : <FiCheck size={14} />}
                            </button>
                            <button onClick={() => { setEditing(false); setName(product.name); setDesc(product.description); }} className="p-1.5 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors" title="Cancel">
                                <FiX size={14} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-white/10 text-slate-400 hover:bg-white/20 transition-colors" title="Edit">
                                <FiEdit2 size={14} />
                            </button>
                            <button onClick={() => onArchive(product.id, product.name)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Archive">
                                <FiArchive size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StoreManager() {
    const [revenue, setRevenue]   = useState(null);
    const [products, setProducts] = useState([]);
    const [orders, setOrders]     = useState([]);
    const [whop, setWhop]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [tab, setTab]           = useState('overview');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [revRes, prodRes, ordRes, whopRes] = await Promise.all([
                fetch(`${API_BASE}/api/store/revenue`),
                fetch(`${API_BASE}/api/store/products`),
                fetch(`${API_BASE}/api/store/orders`),
                fetch(`${API_BASE}/api/store/whop-products`),
            ]);
            const [revData, prodData, ordData, whopData] = await Promise.all([
                revRes.json(), prodRes.json(), ordRes.json(), whopRes.json(),
            ]);
            if (revData.status === 'ok')   setRevenue(revData);
            if (prodData.status === 'ok')  setProducts(prodData.products);
            if (ordData.status === 'ok')   setOrders(ordData.orders);
            if (whopData.status === 'ok')  setWhop(whopData.products || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleArchive(id, name) {
        if (!confirm(`Archive "${name}"? It will be hidden from Stripe.`)) return;
        await fetch(`${API_BASE}/api/store/products/${id}/archive`, { method: 'POST' });
        setProducts(prev => prev.filter(p => p.id !== id));
    }

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'products', label: `Products (${products.length})` },
        { id: 'orders',   label: `Orders (${orders.length})` },
        { id: 'whop',     label: `Whop (${whop.length})` },
    ];

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-slate-400">
                        <FiArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-white">Store Manager</h1>
                        <p className="text-xs text-slate-500">Stripe · PayPal · Whop</p>
                    </div>
                </div>
                <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-slate-400" title="Refresh">
                    <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                {/* Revenue Summary Cards */}
                {revenue && (
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: <FiDollarSign />, label: '30-Day Revenue', value: fmt(revenue.total, revenue.currency), color: 'text-emerald-400' },
                            { icon: <FiShoppingBag />, label: 'Orders', value: revenue.count, color: 'text-blue-400' },
                            { icon: <FiTrendingUp />, label: 'Avg Order', value: fmt(revenue.avg, revenue.currency), color: 'text-purple-400' },
                        ].map(card => (
                            <div key={card.label} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <div className={`text-xl mb-2 ${card.color}`}>{card.icon}</div>
                                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{card.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                tab === t.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-600">
                        <FiRefreshCw className="animate-spin mr-2" /> Loading...
                    </div>
                ) : (
                    <>
                        {/* Overview */}
                        {tab === 'overview' && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400">Recent {orders.slice(0, 5).length} orders</p>
                                {orders.slice(0, 5).map(o => (
                                    <div key={o.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                        <div>
                                            <p className="text-sm text-white font-mono">{o.id.slice(-12)}</p>
                                            <p className="text-xs text-slate-500">{o.email || '—'} · {fmtDate(o.created)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-white">{fmt(o.amount, o.currency)}</p>
                                            <StatusBadge status={o.status} />
                                        </div>
                                    </div>
                                ))}
                                {orders.length === 0 && <p className="text-slate-600 text-sm py-8 text-center">No orders yet</p>}
                            </div>
                        )}

                        {/* Products */}
                        {tab === 'products' && (
                            <div className="space-y-3">
                                {products.map(p => (
                                    <ProductRow key={p.id} product={p} onArchive={handleArchive} />
                                ))}
                                {products.length === 0 && <p className="text-slate-600 text-sm py-8 text-center">No active Stripe products</p>}
                            </div>
                        )}

                        {/* Orders */}
                        {tab === 'orders' && (
                            <div className="space-y-3">
                                {orders.map(o => (
                                    <div key={o.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                        <div>
                                            <p className="text-sm text-white font-mono">{o.id}</p>
                                            <p className="text-xs text-slate-500">{o.description || '—'}</p>
                                            <p className="text-xs text-slate-600">{o.email || 'No email'} · {fmtDate(o.created)}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-4">
                                            <p className="text-sm font-semibold text-white">{fmt(o.amount, o.currency)}</p>
                                            <StatusBadge status={o.status} />
                                        </div>
                                    </div>
                                ))}
                                {orders.length === 0 && <p className="text-slate-600 text-sm py-8 text-center">No orders found</p>}
                            </div>
                        )}

                        {/* Whop */}
                        {tab === 'whop' && (
                            <div className="space-y-3">
                                {Object.entries(whop).map(([topic, entry]) => (
                                    <div key={topic} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                                        <p className="text-sm font-semibold text-white">{entry.title || topic}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 font-mono">{entry.product_id || '—'}</p>
                                        {entry.checkout_url && (
                                            <a href={entry.checkout_url} target="_blank" rel="noreferrer"
                                               className="text-xs text-blue-400 hover:underline mt-1 block truncate">
                                                {entry.checkout_url}
                                            </a>
                                        )}
                                    </div>
                                ))}
                                {Object.keys(whop).length === 0 && <p className="text-slate-600 text-sm py-8 text-center">No Whop products in local registry</p>}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
