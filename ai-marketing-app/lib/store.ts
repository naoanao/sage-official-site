import type { OnboardingData, Action } from "./types";

const KEY = "ai_mkt_onboarding";
const USER_KEY = "ai_mkt_user_id";
const SESSION_KEY = "ai_mkt_session";
const FLOW_KEY = "ai_mkt_flow_active"; // オンボーディングフローが進行中かのフラグ

export interface StoredSession {
  id: string;
  week_start: string;
  actions: Action[];
}

// ── セッション ──────────────────────────────
export function saveSession(session: StoredSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function updateActionComplete(index: number) {
  const session = loadSession();
  if (!session) return;
  session.actions[index].completed = true;
  saveSession(session);
}

// ── オンボーディングデータ ────────────────────
export function saveOnboarding(data: Partial<OnboardingData>) {
  if (typeof window === "undefined") return;
  const prev = loadOnboarding();
  localStorage.setItem(KEY, JSON.stringify({ ...prev, ...data }));
}

export function loadOnboarding(): Partial<OnboardingData> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function clearOnboarding() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(FLOW_KEY); // フラグも同時にクリア
}

// ── フローアクティブフラグ ────────────────────
// インダストリー選択時にセット → goal完了 or "最初からやり直す" でクリア
// これにより「前回の残存データ」と「現在進行中のフロー」を区別できる
export function setFlowActive() {
  if (typeof window === "undefined") return;
  localStorage.setItem(FLOW_KEY, "1");
}

export function isFlowActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FLOW_KEY) === "1";
}

// ── ユーザーID ───────────────────────────────
export function saveUserId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, id);
}

export function loadUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
}
