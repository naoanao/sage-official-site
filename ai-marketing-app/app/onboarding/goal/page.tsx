"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding, loadOnboarding, saveUserId, saveSession, isFlowActive, clearOnboarding } from "@/lib/store";
import { incrementUsage } from "@/components/FreeProgressBar";
import ProgressBar from "@/components/ProgressBar";
import LangToggle from "@/components/LangToggle";
import { useLang, getLang } from "@/lib/i18n";

const EXAMPLES_JA: Record<string, string> = {
  restaurant: "SNSを気にせず、毎日料理だけに集中できている",
  salon: "予約が常に埋まっていて、新規集客を考えなくていい状態",
  ec: "注文が毎日安定して入り、制作に専念できている",
  professional: "紹介がなくてもネットから新規が継続して来る状態",
  construction: "見積もり依頼が月に10件以上安定して来ている",
  other: "生徒が自然と集まり、募集に時間をかけなくていい",
};

const EXAMPLES_EN: Record<string, string> = {
  restaurant: "I can focus on cooking every day without worrying about social media",
  salon: "My bookings are always full and I don't need to think about new client acquisition",
  ec: "Orders come in steadily every day and I can focus on creating",
  professional: "New clients keep coming online without relying on referrals",
  construction: "Getting 10+ quote requests per month consistently",
  other: "Students naturally find me and I don't spend time on recruitment",
};

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem("growl_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("growl_device_id", id);
  }
  return id;
}

export default function GoalPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [example, setExample] = useState("集客を気にせず、料理だけに集中できている");
  // セッションガード：フォームを表示する前に必要なデータが揃っているか確認
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const data = loadOnboarding();
    // 全ステップのデータが揃っているかチェック（一部でも欠けたら最初に戻す）
    const hasAllRequired =
      isFlowActive() &&
      !!data.industry &&
      !!data.business_desc &&
      !!data.customer_desc &&
      !!data.main_problem;

    if (!hasAllRequired) {
      router.replace("/onboarding/industry");
      return; // setChecking(false) を呼ばず、リダイレクトに任せる
    }
    const examples = lang === "en" ? EXAMPLES_EN : EXAMPLES_JA;
    setExample(examples[data.industry!] ?? examples["other"] ?? "");
    setChecking(false); // 全データOK → フォームを表示
  }, [router, lang]);

  // チェック中はスピナーのみ表示（空フォームのフラッシュを防ぐ）
  if (checking) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  async function callGenerateActions(payload: object): Promise<{ userId?: string; session?: unknown }> {
    const res = await fetch("/api/generate-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "生成に失敗しました");
    return json;
  }

  async function finish() {
    if (!value.trim()) {
      setError(lang === "en" ? "Please describe your ideal future" : "理想の未来を入力してください");
      return;
    }
    if (value.trim().length < 5) {
      setError(lang === "en" ? "Please give a bit more detail" : "もう少し詳しく教えてください（5文字以上）");
      return;
    }
    setLoading(true);
    setRetrying(false);
    setError("");

    const data = { ...loadOnboarding(), final_goal: value.trim() };
    saveOnboarding({ final_goal: value.trim() });

    const device_id = getOrCreateDeviceId();
    const currentLang = getLang(); // 現在の言語設定をペイロードに含める
    const payload = { ...data, device_id, lang: currentLang };

    try {
      let json: { userId?: string; session?: unknown };
      try {
        json = await callGenerateActions(payload);
      } catch {
        // 1回目失敗 → 3秒待ってから自動リトライ
        setRetrying(true);
        await new Promise((r) => setTimeout(r, 3000));
        json = await callGenerateActions(payload);
      }

      if (json.userId) saveUserId(json.userId as string);
      if (json.session) saveSession(json.session as Parameters<typeof saveSession>[0]);
      incrementUsage(); // フリーミアム：生成回数をカウント
      clearOnboarding(); // フロー完了 → onboardingデータとフラグをクリア（stale data防止）
      // LINE設定ページへ（スキップ可能）
      router.push("/onboarding/line");
    } catch {
      setError(lang === "en"
        ? "The server is busy. Please wait 20–30 seconds and try again."
        : "少し混み合っています。20〜30秒待ってからもう一度お試しください。");
      setLoading(false);
      setRetrying(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={() => router.push("/onboarding/problem")}
            className="text-gray-400 hover:text-indigo-500 transition-colors p-1 -ml-1 mr-2"
            aria-label="前のステップに戻る"
          >
            {t("ob.back")}
          </button>
          <div className="ml-auto">
            <LangToggle />
          </div>
        </div>
        <ProgressBar current={5} total={5} />
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-6">
          <p className="text-indigo-600 text-xs font-medium">{t("ob.goal.title")} ✨</p>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {t("ob.goal.title")}
        </h1>
        <p className="text-gray-500 text-sm mb-8">{lang === "en" ? `e.g. "${example}"` : `e.g. 「${example}」`}</p>
        <textarea
          className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-2xl p-4 text-gray-800 text-base resize-none outline-none transition-colors"
          rows={5}
          placeholder={t("ob.goal.placeholder")}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
        />
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-xs break-all">{error}</p>
          </div>
        )}
        <button
          onClick={finish}
          disabled={!value.trim() || loading}
          type="button"
          className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl transition-colors text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              {retrying ? t("ob.next") : t("ob.goal.analyzing")}
            </>
          ) : (
            t("ob.goal.wait")
          )}
        </button>
      </div>
    </main>
  );
}
