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
        health: '100%'
    });

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await axios.get('/api/system/stats/detailed');
                const { kpi, api_usage } = response.data;
                setSummary({
                    posts: api_usage.total_calls,
                    products: 0, // Placeholder
                    incidents: kpi.total_incidents,
                    health: kpi.availability
                });
            } catch {
                console.error("Dashboard: Error fetching summary stats");
            }
        };
        fetchSummary();
        const interval = setInterval(fetchSummary, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 animate-fadeIn">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-widest uppercase">Admin Dashboard</h1>
                <p className="text-slate-500 mt-2 font-mono">Status: Connected to Sage Core Core Engine</p>
            </header>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SystemMetricsWidget />
                <BrainStatsWidget />
            </div>

            {/* NEW: Intelligence & Evidence Layer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 h-[32rem] overflow-hidden shadow-2xl">
                    <KnowledgeBankWidget />
                </div>
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 h-[32rem] overflow-hidden shadow-2xl">
                    <ContentDashboardWidget />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
