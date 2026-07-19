import { CURATED_IDIOMS, CURATED_QUESTIONS } from "./content";
import { DEFAULT_STORE } from "./storage";
import { supabase } from "./supabase";
import type { AppStore, Attempt, Idiom, Mistake, Question, Session, UserProfile } from "./types";

export async function remoteSignIn(email: string, password: string) {
  if (!supabase) return { user: null, error: new Error("Supabase 未配置") };
  const result = await supabase.auth.signInWithPassword({ email, password });
  return { user: result.data.user, error: result.error };
}

export async function remoteSignUp(email: string, password: string, nickname: string) {
  if (!supabase) return { user: null, error: new Error("Supabase 未配置") };
  const result = await supabase.auth.signUp({ email, password, options: { data: { nickname } } });
  return { user: result.data.user, error: result.error, session: result.data.session };
}

export async function remoteResetPassword(email: string) {
  if (!supabase) return { error: new Error("Supabase 未配置") };
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
}

export async function remoteChangePassword(password: string) {
  if (!supabase) return { error: new Error("Supabase 未配置") };
  return supabase.auth.updateUser({ password });
}

export async function remoteDeleteAccount() {
  if (!supabase) return { error: new Error("Supabase 未配置") };
  return supabase.rpc("delete_my_account");
}

async function getProfile(userId: string, email: string, nickname: string): Promise<UserProfile> {
  const fallback = { id: userId, email, nickname, isAdmin: false, role: "student" as const };
  if (!supabase) return fallback;
  const { data } = await supabase.from("profiles").select("id,email,nickname,role").eq("id", userId).maybeSingle();
  return data ? { ...data, isAdmin: data.role === "admin" } : fallback;
}

function mapQuestion(row: Record<string, unknown>): Question {
  return {
    id: row.id as string,
    stem: row.stem as string,
    options: (row.options || []) as string[],
    answer: row.answer as number,
    explanation: (row.explanation || "") as string,
    source: row.source as string,
    sourceRef: row.source_ref as string,
    difficulty: row.difficulty as Question["difficulty"],
    status: row.status as Question["status"],
    contentStatus: row.content_status as Question["contentStatus"],
    reviewedAt: row.reviewed_at as string | undefined,
  };
}

function mapIdiom(row: Record<string, unknown>): Idiom {
  // Existing projects may not have run the publication migration yet. Treat
  // rows without the new column as published until the schema is upgraded.
  return { id: row.id as string, name: row.name as string, pinyin: row.pinyin as string, meaning: row.meaning as string, example: row.example as string, category: row.category as string, sourceRef: row.source_ref as string, reviewStatus: row.review_status as Idiom["reviewStatus"], status: (row.status || "published") as Idiom["status"] };
}

export async function loadRemoteStore(userId: string, email: string, nickname: string): Promise<AppStore> {
  if (!supabase) return { ...DEFAULT_STORE, user: { email, nickname, isAdmin: false } };
  const profile = await getProfile(userId, email, nickname);
  const [questionsResult, idiomsResult, preferencesResult, mistakesResult, sessionsResult, attemptsResult, favoritesResult] = await Promise.all([
    // RLS already limits students to published rows and admins to all rows.
    // Avoid duplicating that rule with a client-side enum filter.
    supabase.from("questions").select("*").order("created_at", { ascending: false }),
    supabase.from("idioms").select("*").order("name"),
    supabase.from("user_preferences").select("daily_minutes,target_date,region").eq("user_id", userId).maybeSingle(),
    supabase.from("mistakes").select("question_id,count,reasons,last_wrong_at,due_at,mastered").eq("user_id", userId),
    supabase.from("study_sessions").select("id,date,total,correct,seconds").eq("user_id", userId).order("date", { ascending: false }).limit(100),
    supabase.from("attempts").select("question_id,correct,seconds,selected_answer,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
    supabase.from("favorite_idioms").select("idiom_id").eq("user_id", userId),
  ]);
  if (questionsResult.error) console.error("加载题库失败", questionsResult.error);
  if (idiomsResult.error) console.error("加载成语词库失败", idiomsResult.error);

  const questions = (questionsResult.data || []).map((row) => mapQuestion(row as Record<string, unknown>));
  const idioms = (idiomsResult.data || []).map((row) => mapIdiom(row as Record<string, unknown>));

  return {
    ...DEFAULT_STORE,
    user: profile,
    questions: questions.length ? questions : CURATED_QUESTIONS,
    idioms: idioms.length ? idioms : CURATED_IDIOMS,
    dailyMinutes: preferencesResult.data?.daily_minutes || DEFAULT_STORE.dailyMinutes,
    targetDate: preferencesResult.data?.target_date || DEFAULT_STORE.targetDate,
    region: preferencesResult.data?.region || DEFAULT_STORE.region,
    mistakes: ((mistakesResult.data || []) as Array<Record<string, unknown>>).map((row) => ({ questionId: row.question_id as string, count: row.count as number, reasons: (row.reasons || []) as string[], lastWrongAt: row.last_wrong_at as string, dueAt: row.due_at as string, mastered: Boolean(row.mastered) })),
    sessions: (sessionsResult.data as Session[] | null) || [],
    attempts: ((attemptsResult.data || []) as Array<Record<string, unknown>>).map((row) => ({ questionId: row.question_id as string, correct: Boolean(row.correct), seconds: row.seconds as number, selectedAnswer: row.selected_answer as number, createdAt: row.created_at as string })),
    favoriteIdioms: ((favoritesResult.data || []) as Array<{ idiom_id: string }>).map((row) => row.idiom_id),
  };
}

export async function persistAttempt(userId: string, attempt: Attempt) {
  if (!supabase) return;
  await supabase.from("attempts").insert({ user_id: userId, question_id: attempt.questionId, correct: attempt.correct, seconds: attempt.seconds, selected_answer: attempt.selectedAnswer, created_at: attempt.createdAt });
}

export async function persistMistake(userId: string, mistake: Mistake) {
  if (!supabase) return;
  await supabase.from("mistakes").upsert({ user_id: userId, question_id: mistake.questionId, count: mistake.count, reasons: mistake.reasons, last_wrong_at: mistake.lastWrongAt, due_at: mistake.dueAt, mastered: mistake.mastered }, { onConflict: "user_id,question_id" });
}

export async function persistSession(userId: string, session: Session) {
  if (!supabase) return;
  await supabase.from("study_sessions").insert({ user_id: userId, id: session.id, date: session.date, total: session.total, correct: session.correct, seconds: session.seconds });
}

export async function persistPreferences(userId: string, store: Pick<AppStore, "dailyMinutes" | "targetDate" | "region">) {
  if (!supabase) return;
  await supabase.from("user_preferences").upsert({ user_id: userId, daily_minutes: store.dailyMinutes, target_date: store.targetDate, region: store.region }, { onConflict: "user_id" });
}

export async function persistFavorite(userId: string, idiomId: string, active: boolean) {
  if (!supabase) return;
  if (active) await supabase.from("favorite_idioms").upsert({ user_id: userId, idiom_id: idiomId }, { onConflict: "user_id,idiom_id" });
  else await supabase.from("favorite_idioms").delete().eq("user_id", userId).eq("idiom_id", idiomId);
}

export async function saveRemoteQuestion(question: Question) {
  if (!supabase) return;
  await supabase.from("questions").upsert({ id: question.id, stem: question.stem, options: question.options, answer: question.answer, explanation: question.explanation, source: question.source, source_ref: question.sourceRef, difficulty: question.difficulty, status: question.status, content_status: question.contentStatus, reviewed_at: question.reviewedAt || null });
}

export async function saveRemoteIdiom(idiom: Idiom) {
  if (!supabase) return;
  await supabase.from("idioms").upsert({ id: idiom.id, name: idiom.name, pinyin: idiom.pinyin, meaning: idiom.meaning, example: idiom.example, category: idiom.category, source_ref: idiom.sourceRef, review_status: idiom.reviewStatus, status: idiom.status });
}

export async function deleteRemoteQuestions(ids: string[]) {
  if (!supabase || !ids.length) return;
  await supabase.from("questions").delete().in("id", ids);
}

export async function deleteRemoteIdioms(ids: string[]) {
  if (!supabase || !ids.length) return;
  await supabase.from("idioms").delete().in("id", ids);
}
