import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiCheck, FiX, FiArchive, FiRefreshCw, FiDollarSign, FiShoppingBag, FiTrendingUp, FiPlus } from 'react-icons/fi';
import toast from '../utils/toast';
import { BACKEND_URL } from '../config/backendUrl';

const API_BASE = BACKEND_URL;

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
            const res = await fetch(`${API_BASE}/api/store/products/${product.id}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: desc }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setEditing(false);
            toast.success('Product updated');
        } catch (e) {
            toast.error(`Save failed: ${e.message}`);
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
    const [revenue, setRevenue]         = useState(null);
    const [gumroadRevenue, setGumroadRevenue] = useState(null);
    const [products, setProducts]       = useState([]);
    const [orders, setOrders]           = useState([]);
    const [whop, setWhop]               = useState({});
    const [loading, setLoading]         = useState(true);
    const [tab, setTab]                 = useState('overview');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProduct, setNewProduct]   = useState({ name: '', description: '', amount: '' });
    const [adding, setAdding]           = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [revRes, prodRes, ordRes, whopRes, gumRes] = await Promise.all([
                fetch(`${API_BASE}/api/store/revenue`),
                fetch(`${API_BASE}/api/store/products`),
                fetch(`${API_BASE}/api/store/orders`),
                fetch(`${API_BASE}/api/store/whop-products`),
                fetch(`${API_BASE}/api/gumroad/revenue`),
            ]);
            const [revData, prodData, ordData, whopData, gumData] = await Promise.all([
                revRes.json(), prodRes.json(), ordRes.json(), whopRes.json(), gumRes.json(),
            ]);
            if (revData.status === 'ok')   setRevenue(revData);
            if (prodData.status === 'ok')  setProducts(prodData.products);
            if (ordData.status === 'ok')   setOrders(ordData.orders);
            if (whopData.status === 'ok')  setWhop(whopData.products || []);
            if (gumData.status === 'ok')   setGumroadRevenue(gumData);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleAddProduct(e) {
        e.preventDefault();
        const name = newProduct.name.trim();
        const amount = parseFloat(newProduct.amount);
        if (!name || !amount || amount <= 0) return;
        setAdding(true);
        try {
            const res = await fetch(`${API_BASE}/api/store/products/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: newProduct.description, amount }),
            });
            const data = await res.json();
            if (data.status === 'ok') {
                setProducts(prev => [data.product, ...prev]);
                setNewProduct({ name: '', description: '', amount: '' });
                setShowAddForm(false);
                toast.success('Product created on Stripe');
            } else if (data.status === 'no_key') {
                toast.error('Stripe is not connected — add your Stripe API key to enable product creation.');
            } else {
                toast.error(data.message || 'Failed to create product');
            }
        } catch (e) {
            toast.error('Cannot reach backend — make sure the service is running.');
        } finally {
            setAdding(false);
        }
    }

    async function handleArchive(id, name) {
        if (!confirm(`Archive "${name}"? It will be hidden from Stripe.`)) return;
        try {
            const res = await fetch(`${API_BASE}/api/store/products/${id}/archive`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setProducts(prev => prev.filter(p => p.id !== id));
            toast.warn(`"${name}" archived`);
        } catch (e) {
            toast.error(`Archive failed: ${e.message}`);
        }
    }

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'products', label: `Products (${products.length})` },
        { id: 'orders',   label: `Orders (${orders.length})` },
        { id: 'whop',     label: `Whop (${Object.keys(whop).length})` },
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

                {/* Gumroad Revenue Banner — 最優先表示 */}
                {gumroadRevenue && (
                    <div className="p-5 rounded-2xl border"
                        style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.12), rgba(219,39,119,0.08))', borderColor: 'rgba(139,92,246,0.25)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                                <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Gumroad — Live Revenue</span>
                            </div>
                            <a href="https://app.gumroad.com/dashboard" target="_blank" rel="noopener noreferrer"
                                className="text-xs text-slate-500 hover:text-violet-400 transition-colors">
                                Open Gumroad →
                            </a>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-3xl font-black text-white">${gumroadRevenue.total_revenue_usd.toFixed(2)}</p>
                                <p className="text-xs text-slate-500 mt-1">Total Revenue (all time)</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-white">{gumroadRevenue.total_sales_count}</p>
                                <p className="text-xs text-slate-500 mt-1">Total Sales</p>
                            </div>
                        </div>
                        {gumroadRevenue.products && gumroadRevenue.products.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                                {gumroadRevenue.products.map(p => (
                                    <div key={p.id} className="flex items-center justify-between text-xs">
                                        <span className={`truncate max-w-[60%] ${p.published ? 'text-slate-300' : 'text-slate-600 line-through'}`}>
                                            {p.name}
                                        </span>
                                        <span className="text-slate-400">
                                            ${p.revenue_usd.toFixed(2)} ({p.sales_count} sales)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {gumroadRevenue.total_revenue_usd === 0 && (
                            <p className="mt-2 text-xs text-yellow-500/70">
                                ⚠️ GUMROAD_ACCESS_TOKEN が未設定か売上ゼロ。
                                <a href="https://app.gumroad.com/settings/advanced" target="_blank" rel="noopener noreferrer"
                                    className="ml-1 underline hover:text-yellow-400">トークン設定 →</a>
                            </p>
                        )}
                    </div>
                )}

                {/* Stripe Revenue Summary Cards */}
                {revenue && (
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: <FiDollarSign />, label: 'Stripe 30-Day Revenue', value: fmt(revenue.total, revenue.currency), color: 'text-emerald-400' },
                            { icon: <FiShoppingBag />, label: 'Stripe Orders', value: revenue.count, color: 'text-blue-400' },
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
                                {/* Add product button / form */}
                                {!showAddForm ? (
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-all text-sm"
                                    >
                                        <FiPlus size={14} /> Add Product to Stripe
                                    </button>
                                ) : (
                                    <form onSubmit={handleAddProduct} className="p-4 rounded-xl bg-white/[0.03] border border-blue-500/30 space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-white">New Stripe Product</span>
                                            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-slate-300"><FiX size={14} /></button>
                                        </div>
                                        <input
                                            required
                                            placeholder="Product name *"
                                            value={newProduct.name}
                                            onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            placeholder="Description (optional)"
                                            value={newProduct.description}
                                            onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            required
                                            type="number"
                                            min="0.50"
                                            step="0.01"
                                            placeholder="Price in USD (e.g. 29.99) *"
                                            value={newProduct.amount}
                                            onChange={e => setNewProduct(p => ({ ...p, amount: e.target.value }))}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={adding}
                                            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                                        >
                                            {adding ? 'Creating...' : 'Create Product'}
                                        </button>
                                    </form>
                                )}
                                {products.map(p => (
                                    <ProductRow key={p.id} product={p} onArchive={handleArchive} />
                                ))}
                                {products.length === 0 && !showAddForm && <p className="text-slate-600 text-sm py-4 text-center">No active Stripe products</p>}
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
