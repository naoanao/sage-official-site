import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const SANDBOX_DIR = path.join(process.cwd(), "sandbox");

async function ensureSandbox() {
    try { await fs.access(SANDBOX_DIR); }
    catch { await fs.mkdir(SANDBOX_DIR, { recursive: true }); }
}

function safePath(filePath: string): string {
    const normalized = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
    return path.join(SANDBOX_DIR, normalized);
}

async function listAllFiles(dir: string, base: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results = await Promise.all(
        entries.map(async (e) => {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) return listAllFiles(full, base);
            return [path.relative(base, full).replace(/\\/g, "/")];
        })
    );
    return results.flat();
}

async function executeFunction(name: string, args: Record<string, string>): Promise<string> {
    await ensureSandbox();
    switch (name) {
        case "create_file": {
            const full = safePath(args.path);
            await fs.mkdir(path.dirname(full), { recursive: true });
            await fs.writeFile(full, args.content, "utf-8");
            return `Successfully created: ${args.path}`;
        }
        case "read_file": {
            try {
                return await fs.readFile(safePath(args.path), "utf-8");
            } catch {
                return `Error: File not found: ${args.path}`;
            }
        }
        case "delete_file": {
            try {
                await fs.unlink(safePath(args.path));
                return `Successfully deleted: ${args.path}`;
            } catch {
                return `Error: Could not delete: ${args.path}`;
            }
        }
        case "list_files": {
            try {
                const files = await listAllFiles(SANDBOX_DIR, SANDBOX_DIR);
                return files.length > 0 ? files.join("\n") : "No files in sandbox yet.";
            } catch {
                return "No files in sandbox yet.";
            }
        }
        default:
            return `Unknown function: ${name}`;
    }
}

const tools = [
    {
        functionDeclarations: [
            {
                name: "create_file",
                description: "Create or overwrite a file in the project sandbox. Use this when the user asks to create code, components, pages, or any file.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        path: { type: SchemaType.STRING, description: "File path relative to sandbox root (e.g., 'components/Button.tsx', 'page.tsx')" },
                        content: { type: SchemaType.STRING, description: "Complete, working file content." },
                    },
                    required: ["path", "content"],
                },
            },
            {
                name: "read_file",
                description: "Read the current content of a file in the sandbox. Use this before modifying an existing file.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        path: { type: SchemaType.STRING, description: "File path relative to sandbox root" },
                    },
                    required: ["path"],
                },
            },
            {
                name: "delete_file",
                description: "Delete a file from the project sandbox.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        path: { type: SchemaType.STRING, description: "File path relative to sandbox root" },
                    },
                    required: ["path"],
                },
            },
            {
                name: "list_files",
                description: "List all files currently in the project sandbox. Use this to understand the current project structure.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            },
        ],
    },
] as any;

const SYSTEM_INSTRUCTION = `You are Antigravity Builder — an expert AI coding assistant for web development.
You help users build web applications by creating and managing files in a project sandbox.

Rules:
- When asked to build anything, immediately use the create_file tool to write the code.
- Before modifying an existing file, use read_file to see its current content first.
- Use list_files when you need to understand the current project structure.
- Always write complete, production-ready code — no placeholders, no TODO comments.
- Use modern React 19 + Next.js 15 patterns with TypeScript. Use Tailwind CSS for styling.
- After creating files, give a concise summary of what was built and any suggested next steps.
- Respond in the same language the user used (Japanese if in Japanese, English if in English).`;

export type ActionItem = { name: string; path: string };

export async function POST(req: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    try {
        const { message, history } = await req.json();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            tools,
            systemInstruction: SYSTEM_INSTRUCTION,
        });

        const chatHistory = history
            .filter((h: { role: string; content: string }) => h.content)
            .map((h: { role: string; content: string }) => ({
                role: h.role === "assistant" ? "model" : "user",
                parts: [{ text: h.content }],
            }));

        const chat = model.startChat({ history: chatHistory });
        const actions: ActionItem[] = [];
        let currentResult = await chat.sendMessage(message);

        // Agent loop — up to 10 turns to prevent infinite loops
        for (let i = 0; i < 10; i++) {
            const response = currentResult.response;
            const calls = response.functionCalls();

            if (!calls || calls.length === 0) {
                let text = "";
                try { text = response.text(); } catch { text = ""; }
                return NextResponse.json({ role: "assistant", content: text, actions });
            }

            // Execute all function calls
            const functionResults = await Promise.all(
                calls.map(async (call) => {
                    const args = call.args as Record<string, string>;
                    const result = await executeFunction(call.name, args);
                    if (call.name === "create_file" || call.name === "delete_file") {
                        actions.push({ name: call.name, path: args.path });
                    }
                    return { functionResponse: { name: call.name, response: { result } } };
                })
            );

            currentResult = await chat.sendMessage(functionResults as any);
        }

        return NextResponse.json({ role: "assistant", content: "処理が完了しました。", actions });

    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
    }
}
