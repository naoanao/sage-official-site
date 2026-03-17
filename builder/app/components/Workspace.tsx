"use client";

import { useProject } from "../context/ProjectContext";
import { Terminal, Play, Code2, Maximize2 } from "lucide-react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-dark.css";

const { highlight, languages } = Prism;

export function Workspace() {
    const { activeFile, isPreviewMode, setIsPreviewMode, terminalOutput, updateFileContent } = useProject();

    return (
        <div className="flex flex-1 flex-col bg-[#0a0a0a] overflow-hidden">
            {/* Tabs / Toolbar */}
            <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-4 bg-[#0a0a0a]">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsPreviewMode(false)}
                        className={`flex items-center gap-2 rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${!isPreviewMode
                                ? "bg-[var(--background)] text-[var(--foreground)] border-t border-x border-[var(--border)] relative top-[1px]"
                                : "text-gray-500 hover:text-gray-300"
                            }`}
                    >
                        <Code2 size={14} />
                        エディタ
                    </button>
                    <button
                        onClick={() => setIsPreviewMode(true)}
                        className={`flex items-center gap-2 rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${isPreviewMode
                                ? "bg-[var(--background)] text-[var(--foreground)] border-t border-x border-[var(--border)] relative top-[1px]"
                                : "text-gray-500 hover:text-gray-300"
                            }`}
                    >
                        <Play size={14} />
                        プレビュー
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{activeFile?.name}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {!isPreviewMode ? (
                    <div className="h-full w-full overflow-auto bg-[#0a0a0a] p-4">
                        {activeFile ? (
                            <Editor
                                value={activeFile.content}
                                onValueChange={(code: string) => updateFileContent(activeFile.name, code)}
                                highlight={(code: string) => highlight(code, languages.js, 'javascript')}
                                padding={10}
                                style={{
                                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                                    fontSize: 14,
                                    backgroundColor: "#0a0a0a",
                                    color: "#e5e5e5",
                                    minHeight: "100%"
                                }}
                                className="min-h-full"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-500">
                                編集するファイルを選択してください
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full w-full bg-white flex flex-col">
                        <div className="bg-gray-100 border-b p-2 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="flex-1 bg-white rounded-md px-2 py-1 text-xs text-center text-gray-500 shadow-sm">
                                localhost:3000
                            </div>
                        </div>
                        <div className="flex-1 p-8 flex items-center justify-center text-black">
                            {/* Mock Preview */}
                            <div className="text-center">
                                <h1 className="text-2xl font-bold mb-2">プレビューモード</h1>
                                <p className="text-gray-600">これはアプリケーションのシミュレーションプレビューです。</p>
                                <div className="mt-8 p-4 border rounded bg-gray-50 text-left text-sm font-mono">
                                    {activeFile?.content.slice(0, 200)}...
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Terminal Panel */}
            <div className="h-48 border-t border-[var(--border)] bg-[#0a0a0a] flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[#111]">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Terminal size={12} />
                        <span>ターミナル</span>
                    </div>
                    <Maximize2 size={12} className="text-gray-500 cursor-pointer hover:text-gray-300" />
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs text-gray-300 space-y-1">
                    {terminalOutput.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
