"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { loadSession, updateActionComplete, StoredSession, clearOnboarding, clearSession } from "@/lib/store";
import ActionCard from "@/components/ActionCard";
import FreeProgressBar from "@/components/FreeProgressBar";
import LangToggle from "@/components/LangToggle";
import dynamic from "next/dynamic";
import { SafeSection } from "@/components/SafeSection";
const AdBoostCard = dynamic(() => import("@/components/AdBoostCard"), { ssr: false });
const MetaPageSelectModal = dynamic(() => import("@/components/MetaPageSelectModal"), { ssr: false });
import { useLang } from "@/lib/i18n";

export default function DashboardPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const isEn = lang === "en";
  const [session, setSession] = useState<StoredSession | null>(null);
  const [completingIndex, setCompletingIndex] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lineLinked, setLineLinked] = useState<boolean | null>(null);

  useEffect(() => {
    function reloadSession() {
      const s = loadSession();
      if (!s) {
        router.replace("/");
        return;
      }
      setSession({ ...s });
    }
    reloadSession();
    window.addEventListener("focus", reloadSession);
    window.addEventListener("pageshow", reloadSession);
    return () => {
      window.removeEventListener("focus", reloadSession);
      window.removeEventListener("pageshow", reloadSession);
    };
  }, [router]);

useEffect(() => {
    const deviceId = typeof window !== "undefined"
      ? localStorage.getItem("growl_device_id")
      : null;
    if (!deviceId) {
      setLineLinked(false);
      return;
    }
    fetch(`/api/line/status?device_id=${encodeURIComponent(deviceId)}`)
      .then((r) => r.json())
      .then((d) => setLineLinked(!!d.linked))
      .catch(() => setLineLinked(false));
  }, []);

  async function handleComplete(index: number) {
    const sessionId = session?.id;
    if (!sessionId || completingIndex !== null) return;

    setCompletingIndex(index);

    updateActionComplete(index);
    const updated = loadSession();
    setSession(updated ? { ...updated } : null);

    router.push(`/complete/${sessionId}?action=${index}`);

    fetch("/api/complete-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, actionIndex: index, resultMemo: null }),
    }).catch((err) => {
      console.error("complete-action failed (non-fatal):", err);
    });
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  // Sanitize all action fields to primitives — prevents React Error #31 from malformed AI data
  const s = (v: unknown): string => (v === null || v === undefined) ? "" : typeof v === "object" ? "" : String(v);
  const actions = (session.actions ?? [])
    .filter((a) => a && typeof a === "object")
    .map((a) => ({
      title: s(a.title),
      detail: s(a.detail),
      content: s(a.content),
      content_type: s(a.content_type),
      role: s(a.role),
      completed: Boolean(a.completed),
      result_memo: a.result_memo ? s(a.result_memo) : undefined,
    }));
  const doneCount = actions.filter((a) => a.completed).length;
  const totalCount = actions.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      {/* Facebookページ選択モーダル（Suspense必須） */}
      <Suspense fallback={null}>
        <MetaPageSelectModal />
      </Suspense>

      <div className="max-w-lg mx-auto">

        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500 transition-colors font-medium py-1"
          >
            <span>←</span>
            <span>{t("nav.home")}</span>
          </button>
          <div className="flex items-center gap-2">
            <LangToggle />
            <span className="text-sm font-bold text-indigo-500 tracking-wide">Growl</span>
          </div>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">
              {t("dash.badge")}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">{t("dash.title")}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {t("dash.sub")}
            </p>
          </div>
        </div>

        {session.strategy_note && (
          <div className="mb-5 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1.5">
              {t("dash.strategy")}
            </p>
            <p className="text-sm text-indigo-800 leading-relaxed">
              {String(session.strategy_note ?? "")}
            </p>
          </div>
        )}

        {doneCount > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">{t("dash.progress_label")}</span>
              <span className="text-sm font-bold text-indigo-600">{doneCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {actions.map((action, i) => (
            <SafeSection key={i}>
              <ActionCard
                action={action}
                index={i}
                sessionId={session.id}
                onComplete={handleComplete}
                completing={completingIndex === i}
              />
            </SafeSection>
          ))}
        </div>

        <SafeSection>
          <FreeProgressBar />
        </SafeSection>

        <SafeSection>
          <AdBoostCard
            session={{
              industry: session.user_profile?.industry as string,
              business_desc: session.user_profile?.business_desc as string,
              customer_desc: session.user_profile?.customer_desc as string,
              main_problem: session.user_profile?.main_problem as string,
              final_goal: session.user_profile?.final_goal as string,
            }}
            lang={lang}
          />
        </SafeSection>

        {lineLinked === false && !isEn && (
          <div className="mt-6 rounded-2xl overflow-hidden shadow-md" style={{ background: "linear-gradient(135deg, #00B900 0%, #00D900 100%)" }}>
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="text-3xl shrink-0">💬</div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm mb-0.5">{t("dash.line_banner.title")}</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {t("dash.line_banner.sub").split("\n").map((line, i) => (
                    <span key={i}>{line}{i === 0 && <br />}</span>
                  ))}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding/line")}
                  className="bg-white font-bold text-sm px-4 py-2 rounded-xl transition-all active:scale-95"
                  style={{ color: "#00B900" }}
                >
                  {t("dash.line_banner.cta")}
                </button>
              </div>
            </div>
          </div>
        )}

        {totalCount > 0 && doneCount === totalCount && (
          <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="font-bold text-indigo-800 text-lg">{t("dash.all_done.title")}</p>
            <p className="text-sm text-indigo-600 mt-1">{t("dash.all_done.sub")}</p>
          </div>
        )}

        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push("/product")}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3.5 rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>{t("dash.btn_product")}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/marketing")}
            className="w-full bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 font-medium py-3 rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>{t("dash.btn_marketing")}</span>
          </button>
          <div className="flex justify-between items-center pt-1">
            <a href="/learn" className="text-xs text-gray-300 hover:text-indigo-400 transition-colors">
              {t("dash.btn_learn")}
            </a>
            <button
              type="button"
              onClick={() => router.push("/report")}
              className="text-xs text-gray-300 hover:text-indigo-400 transition-colors"
            >
              {t("dash.btn_report")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          >
            {t("dash.reset")}
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="text-3xl text-center mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
              {t("dash.reset.title")}
            </h2>
            <p className="text-sm text-gray-500 text-center leading-relaxed mb-6">
              {t("dash.reset.sub").split("\n").map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  clearOnboarding();
                  clearSession();
                  router.push("/onboarding/industry");
                }}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
              >
                {t("dash.reset.confirm")}
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                {t("dash.reset.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
