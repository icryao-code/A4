import { CURATED_IDIOMS, CURATED_QUESTIONS } from "./content";
import type { AppStore, LocalAuth, Question } from "./types";

export const STORAGE_KEY = "exam-assistant-local-v2";
export const LEGACY_STORAGE_KEY = "exam-assistant-local-v1";
export const AUTH_KEY = "exam-assistant-auth-v1";
export const today = new Date().toISOString().slice(0, 10);

export const DEFAULT_STORE: AppStore = {
  user: null,
  questions: CURATED_QUESTIONS,
  idioms: CURATED_IDIOMS,
  mistakes: [],
  sessions: [],
  attempts: [],
  completedToday: 0,
  dailyMinutes: 60,
  targetDate: "2028-11-26",
  region: "全国",
  favoriteIdioms: [],
};

const DEFAULT_AUTH: LocalAuth = { passwords: { "admin@example.com": "123456", "demo@example.com": "123456" } };

function isValidationQuestion(question: Question) {
  return question.stem === "后台验证：做事要有条理，不能______。" || question.stem === "CSV导入验证：基础成语题应该先看语境。";
}

function normalizeQuestion(question: Question): Question {
  return {
    ...question,
    source: question.source || "未注明来源",
    sourceRef: question.sourceRef || "历史本地数据，待补充来源说明",
    contentStatus: question.contentStatus || (question.id.startsWith("demo-") ? "demo" : "imported"),
    status: question.status || "published",
  };
}

export function loadStore(): AppStore {
  if (typeof window === "undefined") return DEFAULT_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    const storedQuestions = (parsed.questions || []).map(normalizeQuestion).filter((question) => !isValidationQuestion(question));
    const hasCurrentContent = storedQuestions.some((question) => question.contentStatus === "curated");
    const importedQuestions = storedQuestions.filter((question) => question.contentStatus !== "demo" && question.contentStatus !== "curated");
    const questions = hasCurrentContent ? storedQuestions : [...CURATED_QUESTIONS, ...importedQuestions];
    return {
      ...DEFAULT_STORE,
      ...parsed,
      questions,
      idioms: parsed.idioms?.length ? parsed.idioms.map((idiom) => ({ ...idiom, status: idiom.status || "published" })) : CURATED_IDIOMS,
      attempts: parsed.attempts || [],
      favoriteIdioms: parsed.favoriteIdioms || [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

export function saveStore(store: AppStore) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

export function loadLocalAuth(): LocalAuth {
  if (typeof window === "undefined") return DEFAULT_AUTH;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTH_KEY) || "null") as Partial<LocalAuth> | null;
    return { ...DEFAULT_AUTH, ...parsed, passwords: { ...DEFAULT_AUTH.passwords, ...(parsed?.passwords || {}) } };
  } catch {
    return DEFAULT_AUTH;
  }
}

export function saveLocalAuth(auth: LocalAuth) {
  if (typeof window !== "undefined") window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}
