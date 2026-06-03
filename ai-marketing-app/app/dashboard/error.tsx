"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  const [sessionDump, setSessionDump] = useState<string>("");

  useEffect(() => {
    console.error("Dashboard error:", error.message, error.stack);
    // Dump localStorage session for debugging
    try {
      const raw = localStorage.getItem("ai_mkt_session");
      setSessionDump(raw ? raw.slice(0, 500) : "null");
    } catch {
      setSessionDump("could not read localStorage");
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-5">😓</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          We hit an unexpected error. Sorry about that!
        </p>
        <p className="text-xs text-red-400 mb-2 text-left bg-red-50 rounded p-2 break-all font-mono">
          {error.message || "Unknown error"}
        </p>
        {sessionDump && (
          <p className="text-xs text-gray-500 mb-6 text-left bg-gray-50 rounded p-2 break-all font-mono">
            Session: {sessionDump}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-2xl transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("ai_mkt_session");
              router.push("/");
            }}
            className="w-full bg-white border border-gray-200 text-gray-600 font-semibold py-3 rounded-2xl transition-colors hover:bg-gray-50"
          >
            Start over (clear session)
          </button>
        </div>
      </div>
    </main>
  );
}
