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
  { id: "today", label: "今日", icon: House },
  { id: "practice", label: "刷题", icon: ClipboardList },
  { id: "mistakes", label: "错题", icon: RotateCcw },
  { id: "vocabulary", label: "词库", icon: BookOpen },
  { id: "progress", label: "进度", icon: BarChart3 },
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
  const [questionCategory, setQuestionCategory] = useState<"all" | "基础" | "进阶">("all");
  const [idiomCategory, setIdiomCategory] = useState("全部");
  const [idiomReviewFilter, setIdiomReviewFilter] = useState<"all" | "待校审" | "已校审">("all");
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
          const remote = await loadRemoteStore(data.session.user.id, data.session.user.email || "", data.session.user.user_metadata?.nickname || data.session.user.email?.split("@")[0] || "备考者");
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
    if (!remoteUserId || !store.user) { if (!silent) setToast("当前未连接云端账号"); return null; }
    const remote = await loadRemoteStore(remoteUserId, store.user.email, store.user.nickname);
    setStore(remote);
    if (!silent) setToast(`云端内容已同步：${remote.questions.length} 道题目，${remote.idioms.length} 个成语`);
    return remote;
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError("");
    if (!email.includes("@") || password.length < 6) { setAuthError("请输入有效邮箱和至少 6 位密码。"); return; }
    if (supabase && supabaseEnabled) {
      const result = await remoteSignIn(email, password);
      if (result.error || !result.user) { setAuthError(result.error?.message || "登录失败，请检查邮箱和密码。"); return; }
      const remote = await loadRemoteStore(result.user.id, email, result.user.user_metadata?.nickname || email.split("@")[0]);
      setRemoteUserId(result.user.id); setStore(remote); setToast("已登录云端学习空间"); return;
    }
    const auth = loadLocalAuth();
    const storedPassword = auth.passwords[email.toLowerCase()];
    if (storedPassword && storedPassword !== password) { setAuthError("密码不正确。"); return; }
    if (!storedPassword && email.toLowerCase() !== "admin@example.com") { setAuthError("本地演示账号尚未注册，请先注册。"); return; }
    setStore((current) => ({ ...current, user: { email, nickname: email.split("@")[0], isAdmin: email.toLowerCase() === "admin@example.com", role: email.toLowerCase() === "admin@example.com" ? "admin" : "student" } }));
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError("");
    if (!email.includes("@") || password.length < 6) { setAuthError("请输入有效邮箱和至少 6 位密码。"); return; }
    if (supabase && supabaseEnabled) {
      const result = await remoteSignUp(email, password, email.split("@")[0]);
      if (result.error) { setAuthError(result.error.message); return; }
      if (!result.session) { setToast("注册成功，请检查邮箱完成验证后登录。"); setAuthMode("login"); return; }
      const remote = await loadRemoteStore(result.user!.id, email, email.split("@")[0]);
      setRemoteUserId(result.user!.id); setStore(remote); return;
    }
    const auth = loadLocalAuth();
    if (auth.passwords[email.toLowerCase()]) { setAuthError("该邮箱已经注册，请直接登录。"); return; }
    saveLocalAuth({ passwords: { ...auth.passwords, [email.toLowerCase()]: password } });
    setStore((current) => ({ ...current, user: { email, nickname: email.split("@")[0], isAdmin: false, role: "student" } }));
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) { if (authMode === "login") await signIn(event); else await register(event); }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setRemoteUserId(null); setStore((current) => ({ ...current, user: null })); setView("today");
  }

  async function forgotPassword() {
    if (!email.includes("@")) { setAuthError("请先输入注册邮箱。"); return; }
    if (supabase && supabaseEnabled) { const result = await remoteResetPassword(email); setToast(result.error ? result.error.message : "重置链接已发送，请检查邮箱。"); }
    else setToast("本地模式不发送邮件，请登录后在账号设置中直接更新密码。");
  }

  async function beginPractice(ids?: string[]) {
    const remote = remoteUserId && !ids ? await refreshRemoteContent(true) : null;
    const availableQuestions = remote?.questions || store.questions;
    const practiceIds = ids || availableQuestions.filter((question) => question.status === "published").slice(0, 10).map((question) => question.id);
    if (!practiceIds.length) { setToast("当前没有可练习的题目，请先发布题目或同步云端内容。"); return; }
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
    setToast(active ? "已加入今日复习" : "已移出今日复习");
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (remoteUserId) void persistPreferences(remoteUserId, store); setToast("学习计划已保存"); }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordError("");
    const data = new FormData(event.currentTarget); const current = String(data.get("currentPassword") || ""); const next = String(data.get("newPassword") || ""); const confirm = String(data.get("confirmPassword") || "");
    if (next.length < 6 || next !== confirm) { setPasswordError("新密码至少 6 位，且两次输入必须一致。"); return; }
    if (remoteUserId && supabase) { const result = await remoteChangePassword(next); if (result.error) { setPasswordError(result.error.message); return; } }
    else if (store.user) { const auth = loadLocalAuth(); const old = auth.passwords[store.user.email.toLowerCase()] || (store.user.isAdmin ? "123456" : ""); if (old && old !== current) { setPasswordError("当前密码不正确。"); return; } saveLocalAuth({ passwords: { ...auth.passwords, [store.user.email.toLowerCase()]: next } }); }
    event.currentTarget.reset(); setToast("密码已更新");
  }

  function exportData() { downloadFile("2028国考备考助手-学习记录.json", JSON.stringify(store, null, 2), "application/json;charset=utf-8"); setToast("学习记录已导出"); }
  function exportQuestions() { downloadFile("2028国考备考助手-题库.csv", questionsToCsv(store.questions), "text/csv;charset=utf-8"); setToast("题库 CSV 已导出"); }
  function downloadTemplate() { downloadFile("2028国考备考助手-题库模板.csv", csvTemplate(), "text/csv;charset=utf-8"); setToast("CSV 模板已下载"); }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const result = importQuestions(String(reader.result || ""), file.name); if (result.errors.length) { setToast(result.errors[0]); return; } setStore((current) => ({ ...current, questions: [...result.questions, ...current.questions] })); result.questions.forEach((question) => { if (remoteUserId) void saveRemoteQuestion(question); }); setToast(result.warnings.length ? `已导入 ${result.questions.length} 道题，${result.warnings.length} 条警告` : `已导入 ${result.questions.length} 道题目`); }; reader.readAsText(file, "UTF-8");
  }

  function importIdiomsCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const result = importIdioms(String(reader.result || ""), file.name); if (result.errors.length) { setToast(result.errors[0]); return; } setStore((current) => ({ ...current, idioms: [...result.idioms, ...current.idioms] })); result.idioms.forEach((idiom) => { if (remoteUserId) void saveRemoteIdiom(idiom); }); setToast(result.warnings.length ? `已导入 ${result.idioms.length} 条成语，${result.warnings.length} 条待校审提醒` : `已导入 ${result.idioms.length} 条成语`); }; reader.readAsText(file, "UTF-8");
  }

  function updateQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!adminDraft?.stem.trim()) return;
    const draft = { ...adminDraft, sourceRef: adminDraft.sourceRef.trim() || "待补充来源说明" };
    setStore((current) => ({ ...current, questions: current.questions.some((question) => question.id === draft.id) ? current.questions.map((question) => question.id === draft.id ? draft : question) : [draft, ...current.questions] }));
    if (remoteUserId) void saveRemoteQuestion(draft); setAdminDraft(null); setToast("题目已保存");
  }

  function setQuestionStatus(question: Question, status: QuestionStatus) {
    const nextQuestion = { ...question, status };
    setStore((current) => ({ ...current, questions: current.questions.map((item) => item.id === question.id ? nextQuestion : item) }));
    if (remoteUserId) void saveRemoteQuestion(nextQuestion);
    setToast(status === "published" ? "题目已发布，普通用户现在可以看到" : "题目已下架");
  }

  function batchQuestionUpdate(ids: string[], updates: Partial<Pick<Question, "status" | "difficulty">>) {
    const changed = store.questions.filter((question) => ids.includes(question.id)).map((question) => ({ ...question, ...updates }));
    setStore((current) => ({ ...current, questions: current.questions.map((question) => ids.includes(question.id) ? { ...question, ...updates } : question) }));
    if (remoteUserId) changed.forEach((question) => { void saveRemoteQuestion(question); });
    if (updates.status === "published") setToast(`已发布 ${ids.length} 道题目`);
    else if (updates.status === "offline") setToast(`已下架 ${ids.length} 道题目`);
    else setToast(`已更新 ${ids.length} 道题目`);
  }

  function batchQuestionDelete(ids: string[]) {
    setStore((current) => ({ ...current, questions: current.questions.filter((question) => !ids.includes(question.id)) }));
    if (remoteUserId) void deleteRemoteQuestions(ids);
    setToast(`已删除 ${ids.length} 道题目`);
  }

  function batchIdiomUpdate(ids: string[], updates: Partial<Pick<Idiom, "reviewStatus" | "category" | "status">>) {
    const changed = store.idioms.filter((idiom) => ids.includes(idiom.id)).map((idiom) => ({ ...idiom, ...updates }));
    setStore((current) => ({ ...current, idioms: current.idioms.map((idiom) => ids.includes(idiom.id) ? { ...idiom, ...updates } : idiom) }));
    if (remoteUserId) changed.forEach((idiom) => { void saveRemoteIdiom(idiom); });
    if (updates.status === "published") setToast(`已发布 ${ids.length} 个成语`);
    else if (updates.status === "offline") setToast(`已下架 ${ids.length} 个成语`);
    else setToast(updates.reviewStatus === "已校审" ? `已校审 ${ids.length} 个成语` : `已更新 ${ids.length} 个成语`);
  }

  function batchIdiomDelete(ids: string[]) {
    setStore((current) => ({ ...current, idioms: current.idioms.filter((idiom) => !ids.includes(idiom.id)) }));
    if (remoteUserId) void deleteRemoteIdioms(ids);
    setToast(`已删除 ${ids.length} 个成语`);
  }

  function updateIdiom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!idiomDraft?.name.trim()) return;
    const draft = { ...idiomDraft, name: idiomDraft.name.trim(), pinyin: idiomDraft.pinyin.trim(), meaning: idiomDraft.meaning.trim(), example: idiomDraft.example.trim(), category: idiomDraft.category.trim() || "待分类", sourceRef: idiomDraft.sourceRef.trim() || "待补充来源说明" };
    if (store.idioms.some((idiom) => idiom.id !== draft.id && idiom.name === draft.name)) { setToast("成语名称已存在，请勿重复添加"); return; }
    setStore((current) => ({ ...current, idioms: current.idioms.some((idiom) => idiom.id === draft.id) ? current.idioms.map((idiom) => idiom.id === draft.id ? draft : idiom) : [draft, ...current.idioms] }));
    if (remoteUserId) void saveRemoteIdiom(draft); setIdiomDraft(null); setToast("成语已保存");
  }

  function deleteAccount() {
    if (!window.confirm("确定清除当前账号和全部学习记录吗？此操作不可恢复。")) return;
    if (remoteUserId) { void remoteDeleteAccount(); }
    window.localStorage.removeItem("exam-assistant-local-v2"); setStore((current) => ({ ...current, user: null, mistakes: [], sessions: [], attempts: [], completedToday: 0 })); setRemoteUserId(null); setToast("账号与学习数据已清除");
  }

  if (!hydrated) return <div className="loading-screen"><div className="brand-mark small"><span>卷</span></div><span>正在准备学习空间</span></div>;
  if (!store.user) return <AuthScreen mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={authError} onSubmit={handleAuthSubmit} onForgotPassword={forgotPassword} remoteEnabled={supabaseEnabled} />;

  return <div className="app-shell"><aside className={`sidebar ${mobileNav ? "is-open" : ""}`}><div className="brand-lockup"><div className="brand-mark"><span>卷</span></div><div><strong>国考备考助手</strong><small>2028 · DAILY STUDY</small></div></div><div className="profile-chip"><div className="avatar">{store.user.nickname.slice(0, 1).toUpperCase()}</div><div><strong>{store.user.nickname}</strong><span>{store.user.isAdmin ? "管理员模式" : "备考进行中"}</span></div><button className="icon-button" title="打开设置" onClick={() => showView("settings")}><Settings size={16} /></button></div><nav className="main-nav" aria-label="主导航">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => showView(id)}><Icon size={18} /><span>{label}</span>{id === "mistakes" && dueMistakes.length > 0 && <em>{dueMistakes.length}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={16} /><span>今日保持专注，完成一小步。</span></div><button className="nav-item" onClick={() => showView("settings")}><Settings size={18} /><span>账号设置</span></button>{store.user.isAdmin && <button className={`nav-item ${view === "admin" ? "active" : ""}`} onClick={() => showView("admin")}><ShieldCheck size={18} /><span>题库后台</span></button>}<button className="nav-item logout" onClick={signOut}><LogOut size={18} /><span>退出登录</span></button></div></aside>{mobileNav && <button className="scrim" aria-label="关闭导航" onClick={() => setMobileNav(false)} />}<main className="main-content"><header className="topbar"><button className="mobile-menu icon-button" title="打开导航" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb"><span>2028 国考备考助手</span><strong>{navItems.find((item) => item.id === view)?.label || (view === "admin" ? "题库后台" : "账号设置")}</strong></div><div className="top-actions"><span className="demo-badge"><span className="status-dot" />{supabaseEnabled ? "云端同步模式" : "本地演示模式"}</span><button className="icon-button" title="同步云端内容" onClick={() => void refreshRemoteContent()}><RefreshCw size={18} /></button><button className="icon-button" title="帮助" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /></button></div></header><div className="page-wrap">{view === "today" && <TodayPage store={store} completedPercent={completedPercent} dueCount={dueMistakes.length} daysToExam={daysToExam} beginPractice={() => beginPractice()} showView={showView} />}{view === "practice" && <PracticePage question={currentQuestion} index={practiceIndex} total={practiceIds.length} selected={selected} setSelected={setSelected} submitted={submitted} submitAnswer={submitAnswer} nextQuestion={nextQuestion} selectedReasons={selectedReasons} toggleReason={toggleReason} sessionResult={sessionResult} beginPractice={() => beginPractice()} showView={showView} />}{view === "mistakes" && <MistakesPage mistakes={store.mistakes} questions={store.questions} dueCount={dueMistakes.length} beginPractice={beginPractice} />}{view === "vocabulary" && <VocabularyPage idioms={store.idioms} favoriteIds={store.favoriteIdioms} toggleFavorite={toggleFavorite} />}{view === "progress" && <ProgressPage store={store} accuracy={accuracy} streak={streak} totalAnswered={totalAnswered} onExport={exportData} />}{view === "settings" && <SettingsPage store={store} setStore={setStore} onSaveProfile={saveProfile} onChangePassword={changePassword} onExport={exportData} onDelete={deleteAccount} passwordError={passwordError} />}{view === "admin" && store.user.isAdmin && <AdminPage questions={store.questions} idioms={store.idioms} questionSearch={questionSearch} setQuestionSearch={setQuestionSearch} idiomSearch={idiomSearch} setIdiomSearch={setIdiomSearch} filter={questionFilter} setFilter={setQuestionFilter} questionCategory={questionCategory} setQuestionCategory={setQuestionCategory} idiomCategory={idiomCategory} setIdiomCategory={setIdiomCategory} idiomReviewFilter={idiomReviewFilter} setIdiomReviewFilter={setIdiomReviewFilter} idiomStatusFilter={idiomStatusFilter} setIdiomStatusFilter={setIdiomStatusFilter} setDraft={setAdminDraft} idiomDraft={idiomDraft} setIdiomDraft={setIdiomDraft} importRef={importRef} importCsv={importCsv} idiomImportRef={idiomImportRef} importIdiomsCsv={importIdiomsCsv} onBatchQuestionUpdate={batchQuestionUpdate} onBatchQuestionDelete={batchQuestionDelete} onBatchIdiomUpdate={batchIdiomUpdate} onBatchIdiomDelete={batchIdiomDelete} onExport={exportQuestions} onDownloadTemplate={downloadTemplate} />}</div></main>{adminDraft && <QuestionModal draft={adminDraft} setDraft={setAdminDraft} onSubmit={updateQuestion} />}{idiomDraft && <IdiomModal draft={idiomDraft} setDraft={setIdiomDraft} onSubmit={updateIdiom} />}{helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}{toast && <div className="toast">{toast}</div>}</div>;
}
