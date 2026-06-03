import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCpu, FiDatabase, FiZap } from 'react-icons/fi';

const BrainStatsWidget = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/brain/stats')
            .then(r => { setStats(r.data); setLoading(false); })
            .catch(() => setLoading(false));
        const interval = setInterval(() => {
            axios.get('/api/brain/stats')
                .then(r => setStats(r.data))
                .catch(() => {});
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-5 bg-gradient-to-br from-slate-900 to-black border border-purple-500/20 rounded-xl shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
                <FiCpu className="text-purple-400 animate-pulse" />
                <h3 className="text-lg font-bold text-purple-400 tracking-widest uppercase">Neuromorphic Brain</h3>
            </div>
            {loading ? (
                <div className="animate-pulse space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-4 bg-slate-800 rounded w-3/4" />)}
                </div>
            ) : !stats ? (
                <div className="text-slate-500 text-sm font-mono flex items-center gap-2">
                    <FiZap className="text-yellow-500" />
                    Flask offline — start <code className="text-yellow-400">run_sage.ps1</code>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Memory Nodes', value: stats.memory_nodes ?? '—', color: 'text-purple-400' },
                            { label: 'Connections', value: stats.connections ?? '—', color: 'text-blue-400' },
                            { label: 'Learning Rate', value: stats.learning_rate ?? '—', color: 'text-green-400' },
                            { label: 'STDP Events', value: stats.stdp_events ?? '—', color: 'text-pink-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] uppercase text-slate-500 mb-1">{s.label}</div>
                                <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
                        <FiDatabase size={10} />
                        <span>Model: {stats.model ?? 'NeuromorphicBrain v2'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrainStatsWidget;
