"use client";

import { BarChart3, BookOpen, CircleHelp, ClipboardList, House, LogOut, Menu, RefreshCw, RotateCcw, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AdminPage, IdiomModal, QuestionModal } from "../components/admin-page";
import { AuthScreen } from "../components/auth-screen";
import { HelpModal, MistakesPage, PracticePage, ProgressPage, SettingsPage, TodayPage, VocabularyPage } from "../components/study-pages";
import { importIdioms, importQuestions, questionsToCsv, csvTemplate } from "../lib/csv";
import { loadLocalAuth, loadStore, saveLocalAuth, saveStore, today } from "../lib/storage";
import { deleteRemoteIdioms, deleteRemoteQuestions, remoteChangePassword, remoteDeleteAccount, remoteResetPassword, remoteSignIn, remoteSignUp, loadRemoteStore, persistAttempt, persistFavorite, persistMistake, persistPreferences, persistSession, saveRemoteIdiom, saveRemoteQuestion } from "../lib/remote-store";
import { supabase, supabaseEnabled } from "../lib/supabase";
import type { AppStore, Attempt, Idiom, IdiomStatus, Question, QuestionStatus, View } from "../lib/types";

const navItems: Array<{ id: View; label: string; icon: typeof Settings }> = [
  { id: "today", label: "浠婃棩", icon: House },
  { id: "practice", label: "鍒烽", icon: ClipboardList },
  { id: "mistakes", label: "閿欓", icon: RotateCcw },
  { id: "vocabulary", label: "璇嶅簱", icon: BookOpen },
  { id: "progress", label: "杩涘害", icon: BarChart3 },
];

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [store, setStore] = useState<AppStore>(loadStore);
  const [hydrated, setHydrated] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>("today");
  const [mobileNav, setMobileNav] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("123456");
  const [authError, setAuthError] = useState("");
  const [practiceIds, setPracticeIds] = useState<string[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Attempt[]>([]);
  const [sessionResult, setSessionResult] = useState<{ total: number; correct: number; seconds: number } | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [questionSearch, setQuestionSearch] = useState("");
  const [idiomSearch, setIdiomSearch] = useState("");
  const [questionFilter, setQuestionFilter] = useState<"all" | "published" | "draft" | "offline">("all");
  const [questionCategory, setQuestionCategory] = useState<"all" | "鍩虹" | "杩涢樁">("all");
  const [idiomCategory, setIdiomCategory] = useState("鍏ㄩ儴");
  const [idiomReviewFilter, setIdiomReviewFilter] = useState<"all" | "寰呮牎瀹? | "宸叉牎瀹?>("all");
  const [idiomStatusFilter, setIdiomStatusFilter] = useState<"all" | IdiomStatus>("all");
  const [adminDraft, setAdminDraft] = useState<Question | null>(null);
  const [idiomDraft, setIdiomDraft] = useState<Idiom | null>(null);
  const [toast, setToast] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const idiomImportRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const local = loadStore();
      if (supabase && supabaseEnabled) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const remote = await loadRemoteStore(data.session.user.id, data.session.user.email || "", data.session.user.user_metadata?.nickname || data.session.user.email?.split("@")[0] || "澶囪€冭€?);
          if (active) { setStore(remote); setRemoteUserId(data.session.user.id); }
        } else if (active) setStore(local);
      } else if (active) setStore(local);
      if (active) setHydrated(true);
    }
    void bootstrap();
    return () => { active = false; };
  }, []);

  useEffect(() => { if (hydrated && !remoteUserId) saveStore(store); }, [store, hydrated, remoteUserId]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3200); return () => window.clearTimeout(timer); }, [toast]);

  const currentQuestion = practiceIds.length ? store.questions.find((question) => question.id === practiceIds[practiceIndex]) : undefined;
  const dueMistakes = store.mistakes.filter((mistake) => !mistake.mastered && mistake.dueAt <= today);
  const completedPercent = Math.min(100, Math.round((store.completedToday / 20) * 100));
  const totalAnswered = store.attempts.length;
  const totalCorrect = store.attempts.filter((attempt) => attempt.correct).length;
  const accuracy = totalAnswered ? Math.round(totalCorrect / totalAnswered * 100) : 0;
  const streak = store.sessions.length ? Math.min(30, store.sessions.length + 1) : 0;
  const daysToExam = Math.max(0, Math.ceil((new Date(`${store.targetDate}T00:00:00`).getTime() - Date.now()) / 86400000));

  function showView(nextView: View) {
    setMobileNav(false);
    setSessionResult(null);
    if (nextView === "practice") {
      void beginPractice();
      return;
    }
    setView(nextView);
    if (remoteUserId && (nextView === "vocabulary" || nextView === "today")) void refreshRemoteContent(true);
  }

  async function refreshRemoteContent(silent = false) {
    if (!remoteUserId || !store.user) { if (!silent) setToast("褰撳墠鏈繛鎺ヤ簯绔处鍙?); return null; }
    const remote = await loadRemoteStore(remoteUserId, store.user.email, store.user.nickname);
    setStore(remote);
    if (!silent) setToast(`浜戠鍐呭宸插悓姝ワ細${remote.questions.length} 閬撻鐩紝${remote.idioms.length} 涓垚璇璥);
    return remote;
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError("");
    if (!email.includes("@") || password.length < 6) { setAuthError("璇疯緭鍏ユ湁鏁堥偖绠卞拰鑷冲皯 6 浣嶅瘑鐮併€?); return; }
    if (supabase && supabaseEnabled) {
      const result = await remoteSignIn(email, password);
      if (result.error || !result.user) { setAuthError(result.error?.message || "鐧诲綍澶辫触锛岃妫€鏌ラ偖绠卞拰瀵嗙爜銆?); return; }
      const remote = await loadRemoteStore(result.user.id, email, result.user.user_metadata?.nickname || email.split("@")[0]);
      setRemoteUserId(result.user.id); setStore(remote); setToast("宸茬櫥褰曚簯绔涔犵┖闂?); return;
    }
    const auth = loadLocalAuth();
    const storedPassword = auth.passwords[email.toLowerCase()];
    if (storedPassword && storedPassword !== password) { setAuthError("瀵嗙爜涓嶆纭€?); return; }
    if (!storedPassword && email.toLowerCase() !== "admin@example.com") { setAuthError("鏈湴婕旂ず璐﹀彿灏氭湭娉ㄥ唽锛岃鍏堟敞鍐屻€?); return; }
    setStore((current) => ({ ...current, user: { email, nickname: email.split("@")[0], isAdmin: email.toLowerCase() === "admin@example.com", role: email.toLowerCase() === "admin@example.com" ? "admin" : "student" } }));
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError("");
    if (!email.includes("@") || password.length < 6) { setAuthError("璇疯緭鍏ユ湁鏁堥偖绠卞拰鑷冲皯 6 浣嶅瘑鐮併€?); return; }
    if (supabase && supabaseEnabled) {
      const result = await remoteSignUp(email, password, email.split("@")[0]);
      if (result.error) { setAuthError(result.error.message); return; }
      if (!result.session) { setToast("娉ㄥ唽鎴愬姛锛岃妫€鏌ラ偖绠卞畬鎴愰獙璇佸悗鐧诲綍銆?); setAuthMode("login"); return; }
      const remote = await loadRemoteStore(result.user!.id, email, email.split("@")[0]);
      setRemoteUserId(result.user!.id); setStore(remote); return;
    }
    const auth = loadLocalAuth();
    if (auth.passwords[email.toLowerCase()]) { setAuthError("璇ラ偖绠卞凡缁忔敞鍐岋紝璇风洿鎺ョ櫥褰曘€?); return; }
    saveLocalAuth({ passwords: { ...auth.passwords, [email.toLowerCase()]: password } });
    setStore((current) => ({ ...current, user: { email, nickname: email.split("@")[0], isAdmin: false, role: "student" } }));
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) { if (authMode === "login") await signIn(event); else await register(event); }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setRemoteUserId(null); setStore((current) => ({ ...current, user: null })); setView("today");
  }

  async function forgotPassword() {
    if (!email.includes("@")) { setAuthError("璇峰厛杈撳叆娉ㄥ唽閭銆?); return; }
    if (supabase && supabaseEnabled) { const result = await remoteResetPassword(email); setToast(result.error ? result.error.message : "閲嶇疆閾炬帴宸插彂閫侊紝璇锋鏌ラ偖绠便€?); }
    else setToast("鏈湴妯″紡涓嶅彂閫侀偖浠讹紝璇风櫥褰曞悗鍦ㄨ处鍙疯缃腑鐩存帴鏇存柊瀵嗙爜銆?);
  }

  async function beginPractice(ids?: string[]) {
    const remote = remoteUserId && !ids ? await refreshRemoteContent(true) : null;
    const availableQuestions = remote?.questions || store.questions;
    const practiceIds = ids || availableQuestions.filter((question) => question.status === "published").slice(0, 10).map((question) => question.id);
    if (!practiceIds.length) { setToast("褰撳墠娌℃湁鍙粌涔犵殑棰樼洰锛岃鍏堝彂甯冮鐩垨鍚屾浜戠鍐呭銆?); return; }
    setPracticeIds(practiceIds); setPracticeIndex(0); setSelected(null); setSubmitted(false); setSelectedReasons([]); setPracticeAnswers([]); setSessionResult(null); setStartedAt(Date.now()); setView("practice");
  }

  function submitAnswer() {
    if (!currentQuestion || selected === null || submitted) return;
    const attempt: Attempt = { questionId: currentQuestion.id, correct: selected === currentQuestion.answer, seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)), selectedAnswer: selected, createdAt: new Date().toISOString() };
    setSubmitted(true); setPracticeAnswers((answers) => [...answers, attempt]);
    setStore((current) => {
      const attempts = [...current.attempts, attempt];
      if (attempt.correct) return { ...current, attempts };
      const existing = current.mistakes.find((mistake) => mistake.questionId === currentQuestion.id);
      const nextMistake = { questionId: currentQuestion.id, count: (existing?.count || 0) + 1, reasons: existing?.reasons || [], lastWrongAt: today, dueAt: today, mastered: false };
      return { ...current, attempts, mistakes: existing ? current.mistakes.map((mistake) => mistake.questionId === currentQuestion.id ? nextMistake : mistake) : [...current.mistakes, nextMistake] };
    });
    if (remoteUserId) { void persistAttempt(remoteUserId, attempt); if (!attempt.correct) void persistMistake(remoteUserId, { questionId: currentQuestion.id, count: (store.mistakes.find((item) => item.questionId === currentQuestion.id)?.count || 0) + 1, reasons: [], lastWrongAt: today, dueAt: today, mastered: false }); }
  }

  function toggleReason(reason: string) {
    const reasons = selectedReasons.includes(reason) ? selectedReasons.filter((item) => item !== reason) : selectedReasons.length < 2 ? [...selectedReasons, reason] : selectedReasons;
    setSelectedReasons(reasons);
    if (currentQuestion && !((selected ?? -1) === currentQuestion.answer)) setStore((current) => ({ ...current, mistakes: current.mistakes.map((mistake) => mistake.questionId === currentQuestion.id ? { ...mistake, reasons } : mistake) }));
  }

  function finishPractice() {
    const total = practiceAnswers.length;
    const correct = practiceAnswers.filter((answer) => answer.correct).length;
    const seconds = practiceAnswers.reduce((sum, answer) => sum + answer.seconds, 0);
    const session = { id: crypto.randomUUID(), date: today, total, correct, seconds };
    setStore((current) => ({ ...current, sessions: [session, ...current.sessions], completedToday: Math.min(20, current.completedToday + total) }));
    if (remoteUserId) void persistSession(remoteUserId, session);
    setSessionResult({ total, correct, seconds });
  }

  function nextQuestion() {
    if (practiceIndex >= practiceIds.length - 1) { finishPractice(); return; }
    setPracticeIndex((index) => index + 1); setSelected(null); setSubmitted(false); setSelectedReasons([]); setStartedAt(Date.now());
  }

  function toggleFavorite(id: string) {
    const active = !store.favoriteIdioms.includes(id);
    setStore((current) => ({ ...current, favoriteIdioms: active ? [...current.favoriteIdioms, id] : current.favoriteIdioms.filter((item) => item !== id) }));
    if (remoteUserId) void persistFavorite(remoteUserId, id, active);
    setToast(active ? "宸插姞鍏ヤ粖鏃ュ涔? : "宸茬Щ鍑轰粖鏃ュ涔?);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (remoteUserId) void persistPreferences(remoteUserId, store); setToast("瀛︿範璁″垝宸蹭繚瀛?); }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordError("");
    const data = new FormData(event.currentTarget); const current = String(data.get("currentPassword") || ""); const next = String(data.get("newPassword") || ""); const confirm = String(data.get("confirmPassword") || "");
    if (next.length < 6 || next !== confirm) { setPasswordError("鏂板瘑鐮佽嚦灏?6 浣嶏紝涓斾袱娆¤緭鍏ュ繀椤讳竴鑷淬€?); return; }
    if (remoteUserId && supabase) { const result = await remoteChangePassword(next); if (result.error) { setPasswordError(result.error.message); return; } }
    else if (store.user) { const auth = loadLocalAuth(); const old = auth.passwords[store.user.email.toLowerCase()] || (store.user.isAdmin ? "123456" : ""); if (old && old !== current) { setPasswordError("褰撳墠瀵嗙爜涓嶆纭€?); return; } saveLocalAuth({ passwords: { ...auth.passwords, [store.user.email.toLowerCase()]: next } }); }
    event.currentTarget.reset(); setToast("瀵嗙爜宸叉洿鏂?);
  }

  function exportData() { downloadFile("2028鍥借€冨鑰冨姪鎵?瀛︿範璁板綍.json", JSON.stringify(store, null, 2), "application/json;charset=utf-8"); setToast("瀛︿範璁板綍宸插鍑?); }
  function exportQuestions() { downloadFile("2028鍥借€冨鑰冨姪鎵?棰樺簱.csv", questionsToCsv(store.questions), "text/csv;charset=utf-8"); setToast("棰樺簱 CSV 宸插鍑?); }
  function downloadTemplate() { downloadFile("2028鍥借€冨鑰冨姪鎵?棰樺簱妯℃澘.csv", csvTemplate(), "text/csv;charset=utf-8"); setToast("CSV 妯℃澘宸蹭笅杞?); }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const result = importQuestions(String(reader.result || ""), file.name); if (result.errors.length) { setToast(result.errors[0]); return; } setStore((current) => ({ ...current, questions: [...result.questions, ...current.questions] })); result.questions.forEach((question) => { if (remoteUserId) void saveRemoteQuestion(question); }); setToast(result.warnings.length ? `宸插鍏?${result.questions.length} 閬撻锛?{result.warnings.length} 鏉¤鍛奰 : `宸插鍏?${result.questions.length} 閬撻鐩甡); }; reader.readAsText(file, "UTF-8");
  }

  function importIdiomsCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const result = importIdioms(String(reader.result || ""), file.name); if (result.errors.length) { setToast(result.errors[0]); return; } setStore((current) => ({ ...current, idioms: [...result.idioms, ...current.idioms] })); result.idioms.forEach((idiom) => { if (remoteUserId) void saveRemoteIdiom(idiom); }); setToast(result.warnings.length ? `宸插鍏?${result.idioms.length} 鏉℃垚璇紝${result.warnings.length} 鏉″緟鏍″鎻愰啋` : `宸插鍏?${result.idioms.length} 鏉℃垚璇璥); }; reader.readAsText(file, "UTF-8");
  }

  function updateQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!adminDraft?.stem.trim()) return;
    const draft = { ...adminDraft, sourceRef: adminDraft.sourceRef.trim() || "寰呰ˉ鍏呮潵婧愯鏄? };
    setStore((current) => ({ ...current, questions: current.questions.some((question) => question.id === draft.id) ? current.questions.map((question) => question.id === draft.id ? draft : question) : [draft, ...current.questions] }));
    if (remoteUserId) void saveRemoteQuestion(draft); setAdminDraft(null); setToast("棰樼洰宸蹭繚瀛?);
  }

  function setQuestionStatus(question: Question, status: QuestionStatus) {
    const nextQuestion = { ...question, status };
    setStore((current) => ({ ...current, questions: current.questions.map((item) => item.id === question.id ? nextQuestion : item) }));
    if (remoteUserId) void saveRemoteQuestion(nextQuestion);
    setToast(status === "published" ? "棰樼洰宸插彂甯冿紝鏅€氱敤鎴风幇鍦ㄥ彲浠ョ湅鍒? : "棰樼洰宸蹭笅鏋?);
  }

  function batchQuestionUpdate(ids: string[], updates: Partial<Pick<Question, "status" | "difficulty">>) {
    const changed = store.questions.filter((question) => ids.includes(question.id)).map((question) => ({ ...question, ...updates }));
    setStore((current) => ({ ...current, questions: current.questions.map((question) => ids.includes(question.id) ? { ...question, ...updates } : question) }));
    if (remoteUserId) changed.forEach((question) => { void saveRemoteQuestion(question); });
    if (updates.status === "published") setToast(`宸插彂甯?${ids.length} 閬撻鐩甡);
    else if (updates.status === "offline") setToast(`宸蹭笅鏋?${ids.length} 閬撻鐩甡);
    else setToast(`宸叉洿鏂?${ids.length} 閬撻鐩甡);
  }

  function batchQuestionDelete(ids: string[]) {
    setStore((current) => ({ ...current, questions: current.questions.filter((question) => !ids.includes(question.id)) }));
    if (remoteUserId) void deleteRemoteQuestions(ids);
    setToast(`宸插垹闄?${ids.length} 閬撻鐩甡);
  }

  function batchIdiomUpdate(ids: string[], updates: Partial<Pick<Idiom, "reviewStatus" | "category" | "status">>) {
    const changed = store.idioms.filter((idiom) => ids.includes(idiom.id)).map((idiom) => ({ ...idiom, ...updates }));
    setStore((current) => ({ ...current, idioms: current.idioms.map((idiom) => ids.includes(idiom.id) ? { ...idiom, ...updates } : idiom) }));
    if (remoteUserId) changed.forEach((idiom) => { void saveRemoteIdiom(idiom); });
    if (updates.status === "published") setToast(`宸插彂甯?${ids.length} 涓垚璇璥);
    else if (updates.status === "offline") setToast(`宸蹭笅鏋?${ids.length} 涓垚璇璥);
    else setToast(updates.reviewStatus === "宸叉牎瀹? ? `宸叉牎瀹?${ids.length} 涓垚璇璥 : `宸叉洿鏂?${ids.length} 涓垚璇璥);
  }

  function batchIdiomDelete(ids: string[]) {
    setStore((current) => ({ ...current, idioms: current.idioms.filter((idiom) => !ids.includes(idiom.id)) }));
    if (remoteUserId) void deleteRemoteIdioms(ids);
    setToast(`宸插垹闄?${ids.length} 涓垚璇璥);
  }

  function updateIdiom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!idiomDraft?.name.trim()) return;
    const draft = { ...idiomDraft, name: idiomDraft.name.trim(), pinyin: idiomDraft.pinyin.trim(), meaning: idiomDraft.meaning.trim(), example: idiomDraft.example.trim(), category: idiomDraft.category.trim() || "寰呭垎绫?, sourceRef: idiomDraft.sourceRef.trim() || "寰呰ˉ鍏呮潵婧愯鏄? };
    if (store.idioms.some((idiom) => idiom.id !== draft.id && idiom.name === draft.name)) { setToast("鎴愯鍚嶇О宸插瓨鍦紝璇峰嬁閲嶅娣诲姞"); return; }
    setStore((current) => ({ ...current, idioms: current.idioms.some((idiom) => idiom.id === draft.id) ? current.idioms.map((idiom) => idiom.id === draft.id ? draft : idiom) : [draft, ...current.idioms] }));
    if (remoteUserId) void saveRemoteIdiom(draft); setIdiomDraft(null); setToast("鎴愯宸蹭繚瀛?);
  }

  function deleteAccount() {
    if (!window.confirm("纭畾娓呴櫎褰撳墠璐﹀彿鍜屽叏閮ㄥ涔犺褰曞悧锛熸鎿嶄綔涓嶅彲鎭㈠銆?)) return;
    if (remoteUserId) { void remoteDeleteAccount(); }
    window.localStorage.removeItem("exam-assistant-local-v2"); setStore((current) => ({ ...current, user: null, mistakes: [], sessions: [], attempts: [], completedToday: 0 })); setRemoteUserId(null); setToast("璐﹀彿涓庡涔犳暟鎹凡娓呴櫎");
  }

  if (!hydrated) return <div className="loading-screen"><div className="brand-mark small"><span>鍗?/span></div><span>姝ｅ湪鍑嗗瀛︿範绌洪棿</span></div>;
  if (!store.user) return <AuthScreen mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={authError} onSubmit={handleAuthSubmit} onForgotPassword={forgotPassword} remoteEnabled={supabaseEnabled} />;

  return <div className="app-shell"><aside className={`sidebar ${mobileNav ? "is-open" : ""}`}><div className="brand-lockup"><div className="brand-mark"><span>鍗?/span></div><div><strong>鍥借€冨鑰冨姪鎵?/strong><small>2028 路 DAILY STUDY</small></div></div><div className="profile-chip"><div className="avatar">{store.user.nickname.slice(0, 1).toUpperCase()}</div><div><strong>{store.user.nickname}</strong><span>{store.user.isAdmin ? "绠＄悊鍛樻ā寮? : "澶囪€冭繘琛屼腑"}</span></div><button className="icon-button" title="鎵撳紑璁剧疆" onClick={() => showView("settings")}><Settings size={16} /></button></div><nav className="main-nav" aria-label="涓诲鑸?>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => showView(id)}><Icon size={18} /><span>{label}</span>{id === "mistakes" && dueMistakes.length > 0 && <em>{dueMistakes.length}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={16} /><span>浠婃棩淇濇寔涓撴敞锛屽畬鎴愪竴灏忔銆?/span></div><button className="nav-item" onClick={() => showView("settings")}><Settings size={18} /><span>璐﹀彿璁剧疆</span></button>{store.user.isAdmin && <button className={`nav-item ${view === "admin" ? "active" : ""}`} onClick={() => showView("admin")}><ShieldCheck size={18} /><span>棰樺簱鍚庡彴</span></button>}<button className="nav-item logout" onClick={signOut}><LogOut size={18} /><span>閫€鍑虹櫥褰?/span></button></div></aside>{mobileNav && <button className="scrim" aria-label="鍏抽棴瀵艰埅" onClick={() => setMobileNav(false)} />}<main className="main-content"><header className="topbar"><button className="mobile-menu icon-button" title="鎵撳紑瀵艰埅" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb"><span>2028 鍥借€冨鑰冨姪鎵?/span><strong>{navItems.find((item) => item.id === view)?.label || (view === "admin" ? "棰樺簱鍚庡彴" : "璐﹀彿璁剧疆")}</strong></div><div className="top-actions"><span className="demo-badge"><span className="status-dot" />{supabaseEnabled ? "浜戠鍚屾妯″紡" : "鏈湴婕旂ず妯″紡"}</span><button className="icon-button" title="鍚屾浜戠鍐呭" onClick={() => void refreshRemoteContent()}><RefreshCw size={18} /></button><button className="icon-button" title="甯姪" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /></button></div></header><div className="page-wrap">{view === "today" && <TodayPage store={store} completedPercent={completedPercent} dueCount={dueMistakes.length} daysToExam={daysToExam} beginPractice={() => beginPractice()} showView={showView} />}{view === "practice" && <PracticePage question={currentQuestion} index={practiceIndex} total={practiceIds.length} selected={selected} setSelected={setSelected} submitted={submitted} submitAnswer={submitAnswer} nextQuestion={nextQuestion} selectedReasons={selectedReasons} toggleReason={toggleReason} sessionResult={sessionResult} beginPractice={() => beginPractice()} showView={showView} />}{view === "mistakes" && <MistakesPage mistakes={store.mistakes} questions={store.questions} dueCount={dueMistakes.length} beginPractice={beginPractice} />}{view === "vocabulary" && <VocabularyPage idioms={store.idioms} favoriteIds={store.favoriteIdioms} toggleFavorite={toggleFavorite} />}{view === "progress" && <ProgressPage store={store} accuracy={accuracy} streak={streak} totalAnswered={totalAnswered} onExport={exportData} />}{view === "settings" && <SettingsPage store={store} setStore={setStore} onSaveProfile={saveProfile} onChangePassword={changePassword} onExport={exportData} onDelete={deleteAccount} passwordError={passwordError} />}{view === "admin" && store.user.isAdmin && <AdminPage questions={store.questions} idioms={store.idioms} questionSearch={questionSearch} setQuestionSearch={setQuestionSearch} idiomSearch={idiomSearch} setIdiomSearch={setIdiomSearch} filter={questionFilter} setFilter={setQuestionFilter} questionCategory={questionCategory} setQuestionCategory={setQuestionCategory} idiomCategory={idiomCategory} setIdiomCategory={setIdiomCategory} idiomReviewFilter={idiomReviewFilter} setIdiomReviewFilter={setIdiomReviewFilter} idiomStatusFilter={idiomStatusFilter} setIdiomStatusFilter={setIdiomStatusFilter} setDraft={setAdminDraft} idiomDraft={idiomDraft} setIdiomDraft={setIdiomDraft} importRef={importRef} importCsv={importCsv} idiomImportRef={idiomImportRef} importIdiomsCsv={importIdiomsCsv} onBatchQuestionUpdate={batchQuestionUpdate} onBatchQuestionDelete={batchQuestionDelete} onBatchIdiomUpdate={batchIdiomUpdate} onBatchIdiomDelete={batchIdiomDelete} onExport={exportQuestions} onDownloadTemplate={downloadTemplate} />}</div></main>{adminDraft && <QuestionModal draft={adminDraft} setDraft={setAdminDraft} onSubmit={updateQuestion} />}{idiomDraft && <IdiomModal draft={idiomDraft} setDraft={setIdiomDraft} onSubmit={updateIdiom} />}{helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}{toast && <div className="toast">{toast}</div>}</div>;
}
