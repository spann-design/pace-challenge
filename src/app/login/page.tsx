"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/logo";
import { Button, IconButton } from "@/components/ui";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type Step = "welcome" | "email" | "code";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const linkFailed = params.get("error") === "link";
  // Coming from an invite link or a failed email link: skip the welcome screen.
  const [step, setStep] = useState<Step>(linkFailed || next.startsWith("/i/") ? "email" : "welcome");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    linkFailed ? "That sign-in link didn’t work. Enter your email to get a new code." : null,
  );

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Too many tries. Wait a minute, then try again." : error.message);
      return;
    }
    setCode("");
    setStep("code");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError("That code didn’t work. Check the latest email, or send a new one.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-hidden">
      <Glow />

      {step === "welcome" ? (
        <>
          <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-7 text-center">
            <Logo />
            <h1 className="text-[52px] leading-none">Pace</h1>
            <p className="max-w-[300px] text-[19px] font-medium leading-snug">Small daily wins, cheered on by your friends.</p>
          </div>
          <div className="pb-safe relative flex flex-col gap-2 px-6 pb-12">
            {!isSupabaseConfigured && <NotConfigured />}
            <Button variant="dark" className="h-[58px] text-[17px] shadow-[0_12px_30px_rgba(42,34,51,0.2)]" disabled={!isSupabaseConfigured} onClick={() => setStep("email")}>
              Get started
            </Button>
            <button type="button" className="h-11 cursor-pointer text-[15px] font-semibold disabled:opacity-50" disabled={!isSupabaseConfigured} onClick={() => setStep("email")}>
              I already have an account
            </button>
          </div>
        </>
      ) : (
        <div className="pt-safe relative flex flex-1 flex-col gap-6 px-5 pb-10">
          <div className="pt-8">
            <IconButton icon="back" label="Back" onClick={() => setStep(step === "code" ? "email" : "welcome")} />
          </div>

          {step === "email" ? (
            <form onSubmit={sendCode} className="flex flex-1 flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[32px] leading-tight">Sign in with email</h1>
                <p className="text-[15px] text-ink-2">We’ll email you a 6-digit code. New here? This creates your account.</p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-ink-2">Email</span>
                <input
                  className="field h-[52px]"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              {error && <ErrorText>{error}</ErrorText>}
              <Button type="submit" size="lg" className="mt-auto" disabled={busy || !email.includes("@")}>
                {busy ? "Sending…" : "Email me a code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="flex flex-1 flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <span className="bg-accent mb-2 flex h-14 w-14 items-center justify-center rounded-[18px]">
                  <Icon name="mail" size={26} />
                </span>
                <h1 className="text-[32px] leading-tight">Check your email</h1>
                <p className="text-[15px] text-ink-2">
                  We sent a code to <span className="font-semibold text-ink">{email}</span>. Enter it here, or tap the link in the email.
                </p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-ink-2">6-digit code</span>
                <input
                  className="field h-14 text-center font-display text-[28px] tracking-[0.3em] tabular"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={10}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              {error && <ErrorText>{error}</ErrorText>}
              <div className="mt-auto flex flex-col gap-2">
                <Button type="submit" size="lg" disabled={busy || code.length < 6}>
                  {busy ? "Checking…" : "Sign in"}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => sendCode()}>
                  Send a new code
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-[14px] text-warn-ink">
      {children}
    </p>
  );
}

function NotConfigured() {
  return (
    <p role="alert" className="mb-2 rounded-2xl bg-surface px-4 py-3 text-left text-[13px] leading-snug text-ink-2 shadow-card">
      Supabase isn’t connected yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see README), then reload.
    </p>
  );
}

/** Soft blurred accent glow behind the welcome screen. */
function Glow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[60px] blur-[40px]"
      style={{
        background:
          "radial-gradient(55% 28% at 20% 72%, var(--a1), transparent 70%), radial-gradient(60% 30% at 85% 60%, var(--a2), transparent 70%), radial-gradient(70% 30% at 50% 100%, var(--a1), transparent 70%), linear-gradient(180deg, var(--bg) 0%, var(--bg) 35%, #F3E9EE 100%)",
      }}
    />
  );
}
