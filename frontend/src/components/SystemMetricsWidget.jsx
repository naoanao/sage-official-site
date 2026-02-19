import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiActivity, FiZap, FiTarget, FiHash, FiSend } from 'react-icons/fi';

const SystemMetricsWidget = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snsStats, setSnsStats] = useState(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await axios.get('/api/system/stats/detailed');
                setMetrics(response.data);
            } catch {
                setError('Failed to load system metrics');
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
        // Also fetch SNS stats in parallel
        fetch('/api/sns/stats')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setSnsStats(data); })
            .catch(() => { });
        // Auto-refresh every 30s
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-4 bg-gray-800 rounded-lg animate-pulse">Initializing Monitor...</div>;
    if (error) return <div className="p-4 bg-red-900/30 text-red-500 rounded-lg">{error}</div>;

    const { api_usage, kpi, system } = metrics;
    const tokenPercent = Math.min(100, (api_usage.total_tokens / api_usage.daily_limit) * 100);

    return (
        <div className="p-5 bg-gradient-to-br from-slate-900 to-black border border-blue-500/20 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2 tracking-widest uppercase">
                    <FiActivity className="animate-pulse" />
                    Observability
                </h3>
                <span className="text-[10px] font-mono text-slate-500">v{system.version}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase mb-1">
                        <FiHash size={12} />
                        Total API Calls
                    </div>
                    <div className="text-xl font-bold font-mono text-white">{api_usage.total_calls}</div>
                </div>
                <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase mb-1">
                        <FiTarget size={12} />
                        Incidents
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-400">{kpi.total_incidents}</div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-[10px] uppercase text-slate-500 mb-1.5 font-mono">
                        <span>API Budget Utilization</span>
                        <span>{api_usage.total_tokens} / {api_usage.daily_limit} Tokens</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ${tokenPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${tokenPercent}%` }}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                    <div className="flex items-center gap-2 text-blue-300 text-xs font-mono">
                        <FiZap />
                        MTTR
                    </div>
                    <div className="text-sm font-bold font-mono text-white">{kpi.mttr}</div>
                </div>
            </div>

            <div className="mt-6 flex justify-between items-center text-[9px] font-mono text-slate-600 uppercase tracking-tighter">
                <span>System Health: {kpi.availability}</span>
                <span>Uptime: {system.uptime}</span>
            </div>

            {/* SNS Platform Breakdown */}
            {snsStats && snsStats.total_posts > 0 && (
                <div className="mt-6 pt-5 border-t border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-mono">
                            <FiSend size={11} />
                            SNS Posts Shipped
                        </div>
                        <span className="text-white font-bold font-mono text-sm">{snsStats.total_posts}</span>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(snsStats.platforms || {}).map(([platform, count]) => {
                            const pct = Math.round((count / snsStats.total_posts) * 100);
                            const colors = {
                                bluesky: { bar: 'bg-blue-500', label: 'text-blue-400' },
                                instagram: { bar: 'bg-pink-500', label: 'text-pink-400' },
                                twitter: { bar: 'bg-sky-500', label: 'text-sky-400' },
                            };
                            const c = colors[platform] || { bar: 'bg-slate-500', label: 'text-slate-400' };
                            return (
                                <div key={platform}>
                                    <div className="flex justify-between text-[10px] font-mono mb-1">
                                        <span className={`capitalize ${c.label}`}>{platform}</span>
                                        <span className="text-slate-500">{count} posts ({pct}%)</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${c.bar} transition-all duration-700`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 text-[9px] font-mono text-slate-600 text-right">
                        Active {snsStats.days_active} days · {Math.round(snsStats.success_rate * 100)}% success
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemMetricsWidget;
