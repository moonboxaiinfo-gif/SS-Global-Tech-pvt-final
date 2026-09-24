import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import SSGlobalBrand from "@/components/SSGlobalBrand";
import {
  changePassword,
  sendPasswordResetEmail,
  signIn,
  updatePasswordFromRecovery,
} from "@/lib/auth";

type Mode = "signIn" | "changePassword" | "forgotPassword" | "resetPassword";
const REMEMBERED_EMAIL_KEY = "ss-global-remembered-email";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (remembered) setEmail(remembered);
      if (window.location.hash.includes("type=recovery"))
        setMode("resetPassword");
    } catch {
      // Storage may be unavailable in private browser contexts.
    }
  }, []);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setPassword("");
    setCurrentPassword("");
    setNextPassword("");
    setConfirmation("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "forgotPassword") {
        const result = await sendPasswordResetEmail(email);
        toast.success(result.reason || "Password reset email sent.");
        changeMode("signIn");
        return;
      }
      if (mode === "changePassword") {
        await changePassword(
          email,
          currentPassword,
          nextPassword,
          confirmation
        );
        toast.success(
          "Password changed successfully. Sign in with your new password."
        );
        changeMode("signIn");
        return;
      }
      if (mode === "resetPassword") {
        await updatePasswordFromRecovery(nextPassword, confirmation);
        toast.success(
          "Password reset successfully. Sign in with your new password."
        );
        window.history.replaceState({}, document.title, "/login");
        changeMode("signIn");
        return;
      }
      const session = await signIn(email, password);
      try {
        if (rememberEmail)
          localStorage.setItem(
            REMEMBERED_EMAIL_KEY,
            email.trim().toLowerCase()
          );
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        // Remember-email is optional and must never block authentication.
      }
      toast.success(
        `Welcome back, ${session.displayName || "SS Global user"}.`
      );
      navigate("/app/dashboard");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to complete authentication."
      );
    } finally {
      setLoading(false);
    }
  };

  const isSignIn = mode === "signIn";
  const isForgot = mode === "forgotPassword";
  const isReset = mode === "resetPassword";
  const title = isSignIn
    ? "Sign in securely."
    : isForgot
      ? "Reset your password."
      : isReset
        ? "Set a new password."
        : "Change password.";
  const description = isSignIn
    ? "Use your registered Supabase email and password to access the SS Global workspace."
    : isForgot
      ? "Enter your registered email and Supabase will send a secure password reset link."
      : isReset
        ? "Choose a new password to finish securing your SS Global account."
        : "Verify your current password and choose a new password for your account.";

  return (
    <main className="glass-login-shell relative flex min-h-screen w-full items-center justify-center overflow-hidden font-sans">
      <div
        className="absolute inset-0 bg-[linear-gradient(135deg,#081418_0%,#123A5B_52%,#0066CC_100%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#081418]/45" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,102,204,.18),transparent_58%)]"
        aria-hidden="true"
      />
      <section className="dashboard-enter relative z-10 mx-auto w-full max-w-[520px] px-5 lg:translate-x-12">
        <div className="glass-login-panel rounded-[32px] p-8 sm:p-12">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <SSGlobalBrand compact />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-white/80">
              {description}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[.14em] text-white/70">
                User email
              </span>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-3.5 text-[#19364d]/60"
                />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="glass-login-input h-12 w-full rounded-xl border-none pl-11 pr-4 text-sm font-bold outline-none transition focus:ring-2 focus:ring-white/30"
                />
              </div>
            </label>

            {isSignIn && (
              <>
                <PasswordField
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                  visible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                />
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-white/80">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={event => setRememberEmail(event.target.checked)}
                      className="h-4 w-4 rounded border-white/40 accent-[#0066CC]"
                    />{" "}
                    Remember email
                  </label>
                  <button
                    type="button"
                    onClick={() => changeMode("forgotPassword")}
                    className="text-white underline-offset-2 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}
            {mode === "changePassword" && (
              <PasswordField
                label="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                visible={showCurrentPassword}
                onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
              />
            )}
            {(mode === "changePassword" || isReset) && (
              <>
                <PasswordField
                  label="New password"
                  autoComplete="new-password"
                  value={nextPassword}
                  onChange={setNextPassword}
                  visible={showNextPassword}
                  onToggle={() => setShowNextPassword(!showNextPassword)}
                />
                <PasswordField
                  label="Confirm new password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={setConfirmation}
                  visible={showConfirmation}
                  onToggle={() => setShowConfirmation(!showConfirmation)}
                />
                <p className="flex items-center gap-2 text-[11px] font-semibold text-white/70">
                  <KeyRound size={13} /> Use at least 8 characters and confirm
                  the new password.
                </p>
              </>
            )}
            {isForgot && (
              <p className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-xs font-semibold text-white/80">
                <Mail size={15} /> The reset link will be sent by Supabase Auth
                to this email.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-400/30 bg-red-500/20 px-3 py-3 text-xs font-bold text-white"
              >
                {error}
              </p>
            )}
            <button
              disabled={loading}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#0066CC] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#0052A5] disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? (
                "Working…"
              ) : isSignIn ? (
                <>
                  Sign in to SS Global <ArrowRight size={17} />
                </>
              ) : isForgot ? (
                <>
                  Send reset link <Mail size={17} />
                </>
              ) : isReset ? (
                "Set new password"
              ) : (
                "Change password"
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
            <div className="flex flex-wrap gap-4">
              {!isReset && (
                <button
                  type="button"
                  onClick={() =>
                    changeMode(isSignIn ? "changePassword" : "signIn")
                  }
                  className="text-white hover:underline"
                >
                  {isSignIn ? "Change password" : "Back to sign in"}
                </button>
              )}
              {(isForgot || isReset) && (
                <button
                  type="button"
                  onClick={() => changeMode("signIn")}
                  className="text-white hover:underline"
                >
                  Sign in
                </button>
              )}
            </div>
            {isSignIn && (
              <span className="flex items-center gap-1.5 text-white/90">
                <ShieldCheck size={13} /> Owner-controlled access
              </span>
            )}
          </div>
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/login?preview=guest";
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-extrabold text-white/90 transition hover:bg-white/15"
            >
              <UserRound size={14} /> Open development guest preview
            </button>
          )}
        </div>
        <p className="mt-6 text-center text-[11px] font-bold text-white/60">
          Need access? Contact your SS Global workspace administrator.
        </p>
      </section>
    </main>
  );
}

function PasswordField({
  label,
  autoComplete,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[.14em] text-white/70">
        {label}
      </span>
      <div className="relative">
        <LockKeyhole
          size={16}
          className="absolute left-4 top-3.5 text-[#19364d]/60"
        />
        <input
          required
          minLength={8}
          autoComplete={autoComplete}
          type={visible ? "text" : "password"}
          value={value}
          onChange={event => onChange(event.target.value)}
          className="glass-login-input h-12 w-full rounded-xl border-none pl-11 pr-12 text-sm font-bold outline-none transition focus:ring-2 focus:ring-white/30"
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={onToggle}
          className="absolute right-3 top-2.5 rounded-lg p-2 text-[#19364d]/60 transition hover:bg-black/5"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
