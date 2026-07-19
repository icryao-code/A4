"use client";

import { ArrowRight, Info, LockKeyhole, Mail } from "lucide-react";

export function AuthScreen({ mode, setMode, email, setEmail, password, setPassword, error, onSubmit, onForgotPassword, remoteEnabled }: {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onForgotPassword: () => void;
  remoteEnabled: boolean;
}) {
  return <div className="auth-layout">
    <div className="auth-aside"><div className="auth-aside-inner">
      <div className="brand-lockup light"><div className="brand-mark"><span>卷</span></div><div><strong>国考备考助手</strong><small>2028 · DAILY STUDY</small></div></div>
      <div className="auth-quote"><span>把今天的任务，<br />变成明天的底气。</span><p>每天有计划地学习，及时复习真正薄弱的内容。</p></div>
      <div className="auth-aside-footer"><span>LOCAL FIRST</span><span>·</span><span>STUDY WITH INTENTION</span></div>
    </div></div>
    <div className="auth-panel"><div className="auth-panel-inner">
      <div className="mobile-auth-logo"><div className="brand-mark"><span>卷</span></div><strong>国考备考助手</strong></div>
      <div className="auth-heading"><span className="eyebrow">2028 NATIONAL EXAM</span><h1>{mode === "login" ? "欢迎回来" : "建立你的备考空间"}</h1><p>{mode === "login" ? "今天也从一个清晰的任务开始。" : "注册后，学习记录会保存在你的备考空间里。"}</p></div>
      <form className="auth-form" onSubmit={onSubmit}>
        <label><span><Mail size={14} />邮箱地址</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
        <label><span><LockKeyhole size={14} />密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位字符" minLength={6} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-width" type="submit">{mode === "login" ? "进入学习空间" : "创建账号"}<ArrowRight size={17} /></button>
      </form>
      {mode === "login" && <button className="text-button auth-forgot" onClick={onForgotPassword}>忘记密码？</button>}
      <div className="auth-switch">{mode === "login" ? "还没有账号？" : "已经有账号？"}<button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "立即注册" : "返回登录"}</button></div>
      <div className="auth-demo"><Info size={15} /><span>{remoteEnabled ? "当前已配置 Supabase 认证。" : "本地演示：输入任意有效邮箱即可体验；管理员演示账号为 admin@example.com。"}</span></div>
    </div></div>
  </div>;
}
