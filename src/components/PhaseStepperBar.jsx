import React from 'react';
import { FiCheck } from 'react-icons/fi';

const PHASES = [
    { id: 1, label: 'TALK', icon: '💬', desc: 'アイデアを話す' },
    { id: 2, label: 'CREATE', icon: '⚡', desc: 'コンテンツ生成' },
    { id: 3, label: 'REFINE', icon: '✏️', desc: '磨く・調整' },
    { id: 4, label: 'PUBLISH', icon: '🚀', desc: '投稿・公開' },
];

const PhaseStepperBar = ({ currentPhase, topic, onPhaseClick }) => {
    return (
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-white/8 px-8 py-3">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
                {PHASES.map((phase, i) => {
                    const isDone = currentPhase > phase.id;
                    const isActive = currentPhase === phase.id;
                    const isFuture = currentPhase < phase.id;
                    return (
                        <React.Fragment key={phase.id}>
                            <button
                                onClick={() => onPhaseClick && onPhaseClick(phase.id)}
                                disabled={isFuture}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-semibold ${isActive
                                    ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]'
                                    : isDone
                                        ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-500/30'
                                        : 'text-slate-600 cursor-not-allowed'
                                    }`}
                            >
                                {isDone ? <FiCheck className="text-xs" /> : <span>{phase.icon}</span>}
                                <span>{phase.label}</span>
                            </button>
                            {i < PHASES.length - 1 && (
                                <span className={`text-sm ${currentPhase > phase.id ? 'text-emerald-600' : 'text-slate-700'}`}>→</span>
                            )}
                        </React.Fragment>
                    );
                })}
                {topic && (
                    <span className="ml-auto text-xs text-slate-500 truncate max-w-xs">
                        💬 {topic}
                    </span>
                )}
            </div>
        </div>
    );
};

export default PhaseStepperBar;
