import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, KeyRound, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "登入 | 驗屋現場紀錄系統" },
      { name: "description", content: "驗屋現場紀錄系統登入頁：Google 或 Email 登入，管理者建立案件、檢查員現場記錄缺失與量測資料。" },
      { property: "og:title", content: "登入 | 驗屋現場紀錄系統" },
      { property: "og:description", content: "管理者建立案件、檢查員現場記錄缺失與量測資料。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      else if (event === "SIGNED_IN" && session && !window.location.hash.includes("type=recovery")) {
        void supabase.rpc("ensure_membership", { _full_name: "", _email: session.user.email ?? "" });
        void navigate({ to: "/home", replace: true });
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !window.location.hash.includes("type=recovery")) {
        void navigate({ to: "/home", replace: true });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
      }
      const { error: err2 } = await supabase.auth.signInWithPassword({ email, password });
      if (err2) throw err2;
      await supabase.rpc("ensure_membership", { _full_name: fullName, _email: email });
      await navigate({ to: "/home", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請再試一次");
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setBusy(true);
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setError(result.error.message || "Google 登入失敗");
      setBusy(false);
      return;
    }
    if (!("redirected" in result && result.redirected)) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.rpc("ensure_membership", {
          _full_name: (data.user.user_metadata?.["full_name"] as string) ?? "",
          _email: data.user.email ?? "",
        });
        await navigate({ to: "/home", replace: true });
      }
    }
    setBusy(false);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRecovery(false);
    setNotice("密碼已更新，請使用新密碼登入。");
    await supabase.auth.signOut();
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (recovery) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <form onSubmit={updatePassword} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h1 className="font-display text-lg font-bold">設定新密碼</h1>
          </div>
          <label className="block">
            <span className="field-label">新密碼</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring"
            />
          </label>
          {error && <p className="rounded-lg bg-defect-soft p-3 text-sm text-defect">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}更新密碼
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="mb-5 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="font-display text-xl font-bold tracking-tight">驗屋現場紀錄系統</h1>
        </div>

        <button
          type="button"
          onClick={googleSignIn}
          disabled={busy}
          className="mb-4 inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-sm font-bold disabled:opacity-60"
        >
          <GoogleIcon />
          使用 Google 帳號登入
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />或使用 Email<span className="h-px flex-1 bg-border" />
        </div>

        <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-border">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "h-11 text-sm font-semibold transition-colors " +
                (mode === m ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground")
              }
            >
              {m === "signin" ? "登入" : "註冊"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <label className="block">
              <span className="field-label">姓名</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                placeholder="王小明"
              />
            </label>
          )}
          <label className="block">
            <span className="field-label">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="field-label">密碼</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="rounded-lg bg-defect-soft p-3 text-sm text-defect">{error}</p>}
          {notice && <p className="rounded-lg bg-pass-soft p-3 text-sm text-pass">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "登入" : "註冊並登入"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReset(true)}
          className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          忘記密碼？
        </button>

        <p className="mt-4 text-xs text-muted-foreground">
          第一位註冊的帳號會成為管理者（Admin），之後註冊的帳號為檢查員（Inspector）。
        </p>
      </div>

      {showReset && <ResetPasswordModal defaultEmail={email} onClose={() => setShowReset(false)} />}
    </div>
  );
}

function ResetPasswordModal({ defaultEmail, onClose }: { defaultEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold">重設密碼</h2>
          <button type="button" onClick={onClose} aria-label="關閉" className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-pass-soft p-3 text-sm text-pass">
              重設連結已寄至 {email}，請至信箱點擊連結後設定新密碼。
            </p>
            <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              我知道了
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <label className="block">
              <span className="field-label">帳號 Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-12 w-full rounded-lg border border-input bg-surface px-3 text-[16px] outline-none focus:border-ring"
                placeholder="you@example.com"
              />
            </label>
            {error && <p className="rounded-lg bg-defect-soft p-3 text-sm text-defect">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}寄送重設連結
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4h6.6c-.1 1.1-.9 2.8-2.5 3.9l3.8 3c2.3-2.1 3.6-5.2 3.6-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-3c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-3.9 3C3.2 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.1 14.3c-.3-.8-.4-1.5-.4-2.3s.2-1.6.4-2.3l-4-3.1C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l3.9-3.1z" />
      <path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l3.9 3.1c1-2.9 3.7-5 6.9-5z" />
    </svg>
  );
}
