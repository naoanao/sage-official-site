"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Growl error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-5">😓</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          少し不具合が出てしまいました
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          ご不便をおかけして申し訳ありません。<br />
          もう一度試していただくか、ダッシュボードに戻ってください。
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-2xl transition-colors"
          >
            もう一度試す
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-white border border-gray-200 text-gray-600 font-semibold py-3 rounded-2xl transition-colors hover:bg-gray-50"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
