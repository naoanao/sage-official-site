import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiBook, FiSearch, FiZap } from 'react-icons/fi';

const KnowledgeBankWidget = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        axios.get('/api/knowledge/stats')
            .then(r => { setData(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <FiBook className="text-amber-400" />
                <h3 className="text-sm font-bold text-amber-400 tracking-widest uppercase">Knowledge Bank</h3>
            </div>
            {loading ? (
                <div className="animate-pulse space-y-2 flex-1">
                    {[1,2,3,4].map(i => <div key={i} className="h-4 bg-slate-800 rounded" />)}
                </div>
            ) : !data ? (
                <div className="text-slate-500 text-sm font-mono flex items-center gap-2 flex-1">
                    <FiZap className="text-yellow-500" />
                    Flask offline — start <code className="text-yellow-400">run_sage.ps1</code>
                </div>
            ) : (
                <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Documents', value: data.total_docs ?? '—', color: 'text-amber-400' },
                            { label: 'Embeddings', value: data.total_embeddings ?? '—', color: 'text-orange-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] uppercase text-slate-500 mb-1">{s.label}</div>
                                <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50"
                            placeholder="Search knowledge..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        <button className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors">
                            <FiSearch size={16} />
                        </button>
                    </div>
                    {data.topics && data.topics.length > 0 && (
                        <div className="flex-1 overflow-y-auto">
                            <div className="text-[10px] uppercase text-slate-500 mb-2">Top Topics</div>
                            <div className="flex flex-wrap gap-1">
                                {data.topics.slice(0, 12).map((t, i) => (
                                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default KnowledgeBankWidget;
