"use client";

import { useParams, useRouter } from "next/navigation";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";
import { LEARN_DATA_JA, LEARN_DATA_EN } from "@/lib/learn-data";

export default function LearnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang } = useLang();
  
  const topicId = params.topic as string;
  const data = lang === "ja" ? LEARN_DATA_JA[topicId] : LEARN_DATA_EN[topicId];

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto text-center bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <p className="text-red-500 font-bold mb-4">Topic not found.</p>
          <button
            type="button"
            onClick={() => router.push("/learn")}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            {t("learn.back")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            onClick={() => router.push("/learn")}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center gap-1"
          >
            ← {t("learn.back")}
          </button>
          <LangToggle />
        </div>

        <div className="mb-8">
          <div className="flex gap-4 items-center mb-3">
            <span className="text-4xl shrink-0 p-3 bg-indigo-50 rounded-2xl">{data.icon}</span>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{data.title}</h1>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed pl-1">{data.desc}</p>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {data.sections.map((section, idx) => (
            <section
              key={idx}
              className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-md transition-shadow duration-200"
            >
              <h2 className="text-sm font-bold text-indigo-600 mb-2 tracking-wide uppercase">
                {section.subtitle}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={() => router.push("/learn")}
          className="text-sm text-gray-400 hover:text-indigo-500 transition-colors block text-center w-full py-3 bg-white border border-gray-200 rounded-2xl hover:border-indigo-100 shadow-sm hover:shadow transition-all"
        >
          {t("learn.back")}
        </button>
      </div>
    </main>
  );
}
