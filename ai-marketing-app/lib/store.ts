import type { OnboardingData, Action } from "./types";

const KEY = "ai_mkt_onboarding";
const USER_KEY = "ai_mkt_user_id";
const SESSION_KEY = "ai_mkt_session";
const FLOW_KEY = "ai_mkt_flow_active"; // オンボーディングフローが進行中かのフラグ
const SESSION_HISTORY_KEY = "ai_mkt_session_history"; // 過去週のサマリー（最大12週）

export interface StoredSession {
  id: string;
  week_start: string;
  actions: Action[];
}

export interface SessionSummary {
  week_start: string;
  done_count: number;
  total_count: number;
}

// ── セッション ──────────────────────────────
export function saveSession(session: StoredSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  _upsertSessionHistory(session); // 履歴にも自動記録
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
  saveSession(session); // saveSession内で履歴も更新される
}

// ── セッション履歴（過去週のサマリー）────────────────
function _upsertSessionHistory(session: StoredSession) {
  if (typeof window === "undefined") return;
  try {
    const history: SessionSummary[] = JSON.parse(
      localStorage.getItem(SESSION_HISTORY_KEY) || "[]"
    );
    const summary: SessionSummary = {
      week_start: session.week_start,
      done_count: session.actions.filter((a) => a.completed).length,
      total_count: session.actions.length,
    };
    // 同じ週のエントリは上書き、それ以外は保持（最大12週）
    const filtered = history.filter((h) => h.week_start !== session.week_start);
    const updated = [summary, ...filtered].slice(0, 12);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function loadSessionHistory(): SessionSummary[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
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
