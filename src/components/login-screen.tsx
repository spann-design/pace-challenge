"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/store/supabase-store";

export function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const handle = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,24}$/.test(handle))
          throw new Error("Username must be 3–24 characters: lowercase letters, numbers or _.");
        const { data: taken } = await supabase().from("profiles").select("id").eq("username", handle).maybeSingle();
        if (taken) throw new Error("That username is taken.");
        const { data, error } = await supabase().auth.signUp({
          email,
          password,
          options: {
            data: { username: handle, display_name: displayName.trim() || handle },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) setInfo("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold">Pace</h1>
        <p className="mt-1 text-sm text-ink-2">Set your goals, check in daily, and keep each other on track.</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 text-sm font-semibold">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md py-1.5 ${mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === "signup" && (
            <>
              <Field label="Your name">
                <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </Field>
              <Field label="Username" hint="Friends add you with this.">
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  required
                />
              </Field>
            </>
          )}
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input
              className="input"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <p className="text-sm text-critical">{error}</p>}
          {info && <p className="text-sm text-good-text">{info}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-1 text-xs text-muted">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
