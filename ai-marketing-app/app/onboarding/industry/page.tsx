"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { saveOnboarding, clearOnboarding, setFlowActive } from "@/lib/store";
import { Industry, INDUSTRY_ICONS } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import { isLimitReached } from "@/components/FreeProgressBar";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

const industries: Industry[] = ["restaurant", "salon", "ec", "professional", "construction", "health", "education", "other"];

function IndustryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();

  function select(industry: Industry) {
    if (isLimitReached()) {
      router.push("/upgrade");
      return;
    }
    // agency source tracking: 広告代行LP経由のユーザーはダッシュボードでAdBoostCard開放
    if (searchParams.get("source") === "agency") {
      if (typeof window !== "undefined") localStorage.setItem("growl_onboarding_source", "agency");
    }
    clearOnboarding();
    saveOnboarding({ industry });
    setFlowActive();
    router.push("/onboarding/business");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LangToggle />
        </div>
        <ProgressBar current={1} total={5} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t("ob.industry.title")}</h1>
        <p className="text-gray-500 text-sm mb-8">{t("ob.industry.sub")}</p>
        <div className="grid grid-cols-2 gap-3">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => select(ind)}
              className="bg-white border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 active:scale-95"
            >
              <span className="text-3xl">{INDUSTRY_ICONS[ind]}</span>
              <span className="text-sm font-medium text-gray-700">{t(`ind.${ind}` as any)}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function IndustryPage() {
  return (
    <Suspense>
      <IndustryContent />
    </Suspense>
  );
}
