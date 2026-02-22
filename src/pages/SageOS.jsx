import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { FiPlay, FiShield, FiDollarSign, FiCpu, FiMessageSquare, FiActivity, FiXCircle, FiCheckCircle, FiBox, FiCheck } from 'react-icons/fi';
import axios from 'axios';

const SageOS = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [d1Status, setD1Status] = useState('idle'); // idle, running, complete, error
    const [brakeEnabled, setBrakeEnabled] = useState(false);
    const [stats, setStats] = useState({ cpu: '3%', memory: '2GB', upTime: '144:20:10' });

    // Monetization state
    const [monetizeTopic, setMonetizeTopic] = useState('');
    const [market, setMarket] = useState('US');
    const [price, setPrice] = useState('$29');
    const [monetizeStatus, setMonetizeStatus] = useState('idle');

    // Chat state
    const [messages, setMessages] = useState([
        { id: 1, role: 'system', content: 'Sage OS Online. Ready for instructions.' }
    ]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        // Fetch initial Sage Brake status and System Stats
        const init = async () => {
            try {
                const res = await axios.get('/api/brake/status');
                setBrakeEnabled(res.data.enabled);
            } catch (e) {
                console.log("Could not fetch brake status");
            }
        };
        init();
    }, []);

    const handleD1Run = async () => {
        setD1Status('running');
        try {
            await axios.post('/api/d1/generate');
            setD1Status('complete');
            setTimeout(() => setD1Status('idle'), 3000);
        } catch (e) {
            setD1Status('error');
            setTimeout(() => setD1Status('idle'), 3000);
        }
    };

    const toggleBrake = async () => {
        const newValue = !brakeEnabled;
        setBrakeEnabled(newValue);
        try {
            await axios.post('/api/brake/toggle', { enabled: newValue });
        } catch (e) {
            console.error("Failed to toggle brake");
            setBrakeEnabled(!newValue); // revert
        }
    };

    const handleMonetize = async () => {
        if (!monetizeTopic) return;
        setMonetizeStatus('running');
        try {
            await axios.post('/api/monetize', {
                topic: monetizeTopic,
                market,
                price
            });
            setMonetizeStatus('complete');
            setTimeout(() => setMonetizeStatus('idle'), 3000);
        } catch (e) {
            setMonetizeStatus('error');
            setTimeout(() => setMonetizeStatus('idle'), 3000);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newMsg = { id: Date.now(), role: 'user', content: inputValue };
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');

        // Mock response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'sage',
                content: `Analyzing "${newMsg.content}"... I can create a comprehensive guide on this.`
            }]);
        }, 1000);
    };

    const convertToProduct = (content) => {
        setMonetizeTopic(content);
        setActiveTab('monetization');
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-hidden flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900/50 border-r border-white/5 flex flex-col p-4 backdrop-blur-md z-10">
                <div className="text-xl font-bold tracking-tighter mb-8 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    SAGE COCKPIT
                </div>

                <div className="space-y-2 flex-grow">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 border border-blue-500 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        <FiActivity /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('monetization')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'monetization' ? 'bg-purple-600 border border-purple-500 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        <FiDollarSign /> Monetization
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'chat' ? 'bg-emerald-600 border border-emerald-500 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        <FiMessageSquare /> AI Chat
                    </button>
                </div>

                {/* Sage Brake Widget in Sidebar */}
                <div className="mt-auto p-4 bg-black/40 border border-white/5 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-slate-400 flex items-center gap-2"><FiShield /> SAGE BRAKE</span>
                        <div className={`w-2 h-2 rounded-full ${brakeEnabled ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    </div>
                    <button
                        onClick={toggleBrake}
                        className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition-all flex justify-center items-center gap-2 ${brakeEnabled ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}`}
                    >
                        {brakeEnabled ? <><FiXCircle /> BRAKE ACTIVE</> : <><FiCheckCircle /> NORMAl OPERATION</>}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-black to-black overflow-y-auto">

                {activeTab === 'dashboard' && (
                    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <h2 className="text-2xl font-bold mb-6">System Dashboard</h2>

                        {/* Brain Stats Widget */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-sm mb-2 flex items-center gap-2"><FiCpu /> CPU Usage</div>
                                <div className="text-3xl font-mono text-blue-400">{stats.cpu}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-sm mb-2 flex items-center gap-2"><FiActivity /> Memory</div>
                                <div className="text-3xl font-mono text-purple-400">{stats.memory}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                <div className="text-slate-400 text-sm mb-2">System Uptime</div>
                                <div className="text-3xl font-mono text-emerald-400">{stats.upTime}</div>
                            </div>
                        </div>

                        {/* D1 Knowledge Loop */}
                        <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 p-8 rounded-2xl">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">D1 Knowledge Loop <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Observation Phase</span></h3>
                            <p className="text-slate-400 mb-6 text-sm">Force observation, pattern detection, and generation of Obsidian artifacts independently of human query.</p>

                            <button
                                onClick={handleD1Run}
                                disabled={d1Status === 'running'}
                                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${d1Status === 'running' ? 'bg-slate-700 text-slate-400' :
                                        d1Status === 'error' ? 'bg-red-600 text-white' :
                                            d1Status === 'complete' ? 'bg-emerald-600 text-white' :
                                                'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]'
                                    }`}
                            >
                                {d1Status === 'idle' && <><FiPlay /> Execute D1 Loop</>}
                                {d1Status === 'running' && <><div className="animate-spin w-4 h-4 rounded-full border-2 border-slate-400 border-t-white"></div> Processing...</>}
                                {d1Status === 'complete' && <><FiCheck /> Knowledge Created</>}
                                {d1Status === 'error' && <><FiXCircle /> Error</>}
                            </button>
                        </div>
                    </Motion.div>
                )}

                {activeTab === 'monetization' && (
                    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto py-8">
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black mb-4">Consultative Productization</h2>
                            <p className="text-slate-400">Generate a full course and Gumroad landing page from a single topic.</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 backdrop-blur-sm">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Topic / Idea</label>
                                <input
                                    type="text"
                                    value={monetizeTopic}
                                    onChange={(e) => setMonetizeTopic(e.target.value)}
                                    placeholder="e.g. AI Automation for Small Businesses"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Target Market</label>
                                    <select
                                        value={market}
                                        onChange={(e) => setMarket(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none"
                                    >
                                        <option value="US">🇺🇸 US Market</option>
                                        <option value="JP">🇯🇵 Japan Market</option>
                                        <option value="CN">🇨🇳 China Market</option>
                                        <option value="IN">🇮🇳 India Market</option>
                                        <option value="GLOBAL">🌐 Global Market</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Suggested Price</label>
                                    <input
                                        type="text"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <hr className="border-white/5 my-6" />

                            <button
                                onClick={handleMonetize}
                                disabled={!monetizeTopic || monetizeStatus === 'running'}
                                className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-3 transition-all ${!monetizeTopic ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                                        monetizeStatus === 'running' ? 'bg-slate-700 text-slate-400' :
                                            monetizeStatus === 'complete' ? 'bg-emerald-600 text-white' :
                                                'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white shadow-[0_0_40px_rgba(147,51,234,0.4)]'
                                    }`}
                            >
                                {monetizeStatus === 'idle' && <><FiBox /> Format Product & Generate Gumroad ZIP</>}
                                {monetizeStatus === 'running' && <><div className="animate-spin w-5 h-5 rounded-full border-2 border-slate-400 border-t-white"></div> Running Pipeline...</>}
                                {monetizeStatus === 'complete' && <><FiCheck /> Product Ready for Upload</>}
                                {monetizeStatus === 'error' && <><FiXCircle /> Pipeline Failed</>}
                            </button>
                        </div>
                    </Motion.div>
                )}

                {activeTab === 'chat' && (
                    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
                        <div className="flex-1 overflow-y-auto space-y-4 p-4 no-scrollbar">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 rounded-tr-none' :
                                            msg.role === 'system' ? 'bg-white/5 border border-white/10 text-slate-400 text-center mx-auto text-xs font-mono uppercase' :
                                                'bg-slate-800 rounded-tl-none border border-slate-700'
                                        }`}>
                                        {msg.content}
                                        {msg.role === 'sage' && (
                                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                                                <button
                                                    onClick={() => convertToProduct(msg.content)}
                                                    className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                                >
                                                    <FiDollarSign /> Productize This (D2)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="p-4 bg-black border-t border-white/5">
                            <div className="flex relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    placeholder="Tell Sage to research, heal, or generate..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-14 py-4 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button type="submit" className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                                    <FiPlay className="w-5 h-5 ml-0.5" />
                                </button>
                            </div>
                        </form>
                    </Motion.div>
                )}
            </div>
        </div>
    );
};

export default SageOS;
