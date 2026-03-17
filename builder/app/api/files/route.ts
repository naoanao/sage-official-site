import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const SANDBOX_DIR = path.join(process.cwd(), "sandbox");

// Ensure sandbox directory exists
async function ensureSandbox() {
    try {
        await fs.access(SANDBOX_DIR);
    } catch {
        await fs.mkdir(SANDBOX_DIR, { recursive: true });
    }
}

export async function GET(req: NextRequest) {
    await ensureSandbox();

    // Simple recursive file lister
    async function getFiles(dir: string, baseDir: string): Promise<{ name: string; language: string; content: string }[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            if (entry.isDirectory()) {
                return getFiles(fullPath, baseDir); // Flattened for now, or could be nested
            } else {
                const content = await fs.readFile(fullPath, "utf-8");
                return {
                    name: relativePath.replace(/\\/g, "/"), // Normalize paths
                    language: path.extname(entry.name).slice(1) || "text",
                    content: content
                };
            }
        }));
        return files.flat();
    }

    try {
        const files = await getFiles(SANDBOX_DIR, SANDBOX_DIR);
        return NextResponse.json({ files });
    } catch {
        return NextResponse.json({ error: "Failed to read files" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await ensureSandbox();
    try {
        const { name, content } = await req.json();

        if (!name || typeof content !== "string") {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // Security check: Prevent directory traversal
        const safeName = path.normalize(name).replace(/^(\.\.[\/\\])+/, '');
        const fullPath = path.join(SANDBOX_DIR, safeName);

        // Ensure target directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, "utf-8");

        return NextResponse.json({ success: true, path: safeName });
    } catch {
        return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    await ensureSandbox();
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
        return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const safeName = path.normalize(filePath).replace(/^(\.\.[\\/])+/, "");
    const fullPath = path.join(SANDBOX_DIR, safeName);

    try {
        await fs.unlink(fullPath);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
