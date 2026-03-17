"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type FileType = {
    name: string;
    language: string;
    content: string;
};

type ProjectContextType = {
    files: FileType[];
    activeFile: FileType | null;
    setActiveFile: (file: FileType | null) => void;
    terminalOutput: string[];
    addTerminalLog: (log: string) => void;
    isPreviewMode: boolean;
    setIsPreviewMode: (mode: boolean) => void;
    updateFileContent: (fileName: string, newContent: string) => Promise<void>;
    deleteFile: (fileName: string) => Promise<void>;
    refreshFiles: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [files, setFiles] = useState<FileType[]>([]);
    const [activeFile, setActiveFile] = useState<FileType | null>(null);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        "> システムを初期化中...",
        "> コマンドの準備ができました。"
    ]);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const addTerminalLog = (log: string) => {
        setTerminalOutput(prev => [...prev, `> ${log}`]);
    };

    const fetchFiles = async () => {
        try {
            const res = await fetch("/api/files");
            const data = await res.json();
            if (data.files) {
                setFiles(data.files);
                setActiveFile(prev => {
                    if (prev) {
                        // Keep active file in sync with updated content
                        const updated = data.files.find((f: FileType) => f.name === prev.name);
                        return updated || prev;
                    }
                    // Auto-select first file on initial load
                    if (data.files.length > 0) {
                        const page = data.files.find((f: FileType) => f.name === "page.tsx");
                        return page || data.files[0];
                    }
                    return null;
                });
            }
        } catch (e) {
            console.error("Failed to fetch files", e);
            addTerminalLog("エラー: ファイル一覧の取得に失敗しました。");
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchFiles(); }, []);

    const updateFileContent = async (fileName: string, newContent: string) => {
        // Optimistic update
        setFiles(prev => {
            const exists = prev.some(f => f.name === fileName);
            if (exists) {
                return prev.map(f => f.name === fileName ? { ...f, content: newContent } : f);
            }
            const ext = fileName.split('.').pop() || 'text';
            return [...prev, { name: fileName, language: ext, content: newContent }];
        });
        if (activeFile?.name === fileName) {
            setActiveFile(prev => prev ? { ...prev, content: newContent } : null);
        }

        try {
            const res = await fetch("/api/files", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: fileName, content: newContent })
            });
            if (!res.ok) throw new Error("API Error");
        } catch {
            addTerminalLog(`エラー: ファイルの保存に失敗しました (${fileName})`);
        }
    };

    const deleteFile = async (fileName: string) => {
        try {
            await fetch(`/api/files?path=${encodeURIComponent(fileName)}`, {
                method: "DELETE"
            });
            setFiles(prev => prev.filter(f => f.name !== fileName));
            if (activeFile?.name === fileName) {
                setActiveFile(null);
            }
            addTerminalLog(`削除: ${fileName}`);
        } catch {
            addTerminalLog(`エラー: ファイルの削除に失敗しました (${fileName})`);
        }
    };

    return (
        <ProjectContext.Provider value={{
            files,
            activeFile,
            setActiveFile,
            terminalOutput,
            addTerminalLog,
            isPreviewMode,
            setIsPreviewMode,
            updateFileContent,
            deleteFile,
            refreshFiles: fetchFiles
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
