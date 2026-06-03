import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SystemMetricsWidget from '../../components/SystemMetricsWidget';
import BrainStatsWidget from '../../components/BrainStatsWidget';
import ContentDashboardWidget from '../../components/ContentDashboardWidget';
import KnowledgeBankWidget from '../../components/KnowledgeBankWidget';

const Dashboard = () => {
    const [summary, setSummary] = useState({
        posts: 0,
        products: 0,
        incidents: 0,
        health: '—'
    });
    const [connected, setConnected] = useState(null); // null=checking, true=ok, false=offline

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await axios.get('/api/system/stats/detailed');
                const { kpi, api_usage } = response.data;
                setSummary({
                    posts: api_usage.total_calls,
                    products: 0,
                    incidents: kpi.total_incidents,
                    health: kpi.availability
                });
                setConnected(true);
            } catch {
                setConnected(false);
            }
        };
        fetchSummary();
        const interval = setInterval(fetchSummary, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#000', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }} className="space-y-6">

                {/* Header */}
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-widest uppercase">Admin Dashboard</h1>
                        <p className="text-slate-500 mt-1 font-mono text-sm">Sage Core Engine</p>
                    </div>
                    {/* Connection status badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono ${
                        connected === null ? 'border-slate-700 text-slate-500' :
                        connected ? 'border-green-500/40 text-green-400 bg-green-500/10' :
                        'border-red-500/40 text-red-400 bg-red-500/10'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            connected === null ? 'bg-slate-500 animate-pulse' :
                            connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'
                        }`} />
                        {connected === null ? 'Connecting...' :
                         connected ? 'Flask Online' : 'Flask Offline — run run_sage.ps1'}
                    </div>
                </header>

                {/* Offline banner */}
                {connected === false && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 text-sm font-mono">
                        ⚠️ Flaskサーバーがオフラインです。PCで <code className="bg-yellow-500/20 px-1 rounded">run_sage.ps1</code> を実行してから再読み込みしてください。
                        <br />
                        <span className="text-yellow-500 text-xs">接続先: /api/* → ngrok → localhost:8080</span>
                    </div>
                )}

                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'API Interactions', value: summary.posts, color: 'text-blue-400' },
                        { label: 'Active Products', value: summary.products, color: 'text-green-400' },
                        { label: 'System Incidents', value: summary.incidents, color: 'text-yellow-400' },
                        { label: 'Availability', value: summary.health, color: 'text-emerald-400' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 transition-all hover:border-slate-700">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">{stat.label}</div>
                            <div className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* System metrics + Brain stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SystemMetricsWidget />
                    <BrainStatsWidget />
                </div>

                {/* Knowledge bank + Content pipeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 h-[32rem] overflow-hidden shadow-2xl">
                        <KnowledgeBankWidget />
                    </div>
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 h-[32rem] overflow-hidden shadow-2xl">
                        <ContentDashboardWidget />
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-slate-700 text-xs font-mono pt-4 pb-8">
                    <a href="/" className="hover:text-slate-500 transition-colors">← Back to Sage</a>
                    <span className="mx-4">·</span>
                    <span>Admin Dashboard v3.0</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
