"use client";

import { useProject } from "../context/ProjectContext";
import { FileCode, FileJson, FileType as FileIcon, Folder, X, Plus } from "lucide-react";

export function FileExplorer() {
    const { files, activeFile, setActiveFile, deleteFile } = useProject();

    const getIcon = (name: string) => {
        if (name.endsWith(".tsx") || name.endsWith(".ts")) return <FileCode size={14} className="text-blue-400 shrink-0" />;
        if (name.endsWith(".css")) return <FileIcon size={14} className="text-blue-300 shrink-0" />;
        if (name.endsWith(".json")) return <FileJson size={14} className="text-yellow-400 shrink-0" />;
        if (name.endsWith(".md")) return <FileIcon size={14} className="text-gray-400 shrink-0" />;
        return <FileIcon size={14} className="text-gray-400 shrink-0" />;
    };

    return (
        <div className="flex w-60 flex-col border-r border-[var(--border)] bg-[#0a0a0a]">
            <div className="flex h-10 items-center justify-between px-4 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">エクスプローラー</span>
                <span className="text-xs text-gray-600">{files.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                <div className="px-2">
                    {/* Folder root */}
                    <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 mb-1">
                        <Folder size={14} className="text-yellow-600" />
                        <span>sandbox</span>
                    </div>

                    <div className="pl-3 space-y-0.5">
                        {files.length === 0 ? (
                            <p className="px-2 py-3 text-xs text-gray-600 text-center">
                                AIにファイル作成を指示してください
                            </p>
                        ) : (
                            files.map((file) => (
                                <div
                                    key={file.name}
                                    onClick={() => setActiveFile(file)}
                                    className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                                        activeFile?.name === file.name
                                            ? "bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]"
                                            : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-300"
                                    }`}
                                >
                                    {getIcon(file.name)}
                                    <span className="truncate flex-1 text-xs">{file.name}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteFile(file.name);
                                        }}
                                        className="hidden group-hover:flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                        title="削除"
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* File count footer */}
            {files.length > 0 && (
                <div className="border-t border-[var(--border)] px-4 py-2">
                    <p className="text-xs text-gray-600">{files.length} ファイル</p>
                </div>
            )}
        </div>
    );
}
