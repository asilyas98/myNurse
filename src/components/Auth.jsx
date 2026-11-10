import { useState } from "react";
import { supabase } from "../supabase.js";
import { EXAM_NAMES } from "../lib/exams.js";
import { AUTH_REDIRECT, RESET_REDIRECT } from "../lib/platform.js";

export default function Auth({ reason, startMode = "signin" }) {
  const [mode, setMode] = useState(startMode);
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", role: "student", exam: "NCLEX-RN" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const mismatch = mode === "signup" && f.confirm.length > 0 && f.confirm !== f.password;

  async function submit(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (mode === "signup") {
      if (!f.name.trim()) return setErr("Add the name others will see.");
      if (f.password.length < 8) return setErr("Use at least 8 characters for your password.");
      if (f.password !== f.confirm) return setErr("Passwords don't match.");
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: f.email, password: f.password,
          options: { emailRedirectTo: AUTH_REDIRECT, data: { display_name: f.name.trim(), role: f.role, target_exam: f.exam } },
        });
        if (error) throw error;
        if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: RESET_REDIRECT });
        if (error) throw error;
        setMsg("If that email has an account, a reset link is on its way.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
      }
    } catch (e2) {
      setErr(e2.message || "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const switchTo = (m) => { setMode(m); setErr(""); setMsg(""); };

  return (
    <form className="card authcard" onSubmit={submit}>
      <h3>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset your password"}</h3>
      {reason && <p className="note">{reason}</p>}

      {mode === "signup" && (
        <>
          <label htmlFor="a-name">Your name</label>
          <input id="a-name" type="text" value={f.name} onChange={set("name")} maxLength={60} autoComplete="name" />
          <fieldset className="seg">
            <legend>I'm joining as</legend>
            {[["student", "Student"], ["tutor", "Tutor"]].map(([v, l]) => (
              <label key={v} className={f.role === v ? "on" : ""}>
                <input type="radio" name="role" value={v} checked={f.role === v} onChange={set("role")} />{l}
              </label>
            ))}
          </fieldset>
          <label htmlFor="a-exam">{f.role === "tutor" ? "Main exam you tutor" : "Exam you're studying for"}</label>
          <select id="a-exam" value={f.exam} onChange={set("exam")}>
            {EXAM_NAMES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </>
      )}

      <label htmlFor="a-email">Email</label>
      <input id="a-email" type="email" required value={f.email} onChange={set("email")} autoComplete="email" />

      {mode !== "reset" && (
        <>
          <label htmlFor="a-pass">Password</label>
          <input id="a-pass" type="password" required minLength={mode === "signup" ? 8 : undefined} value={f.password} onChange={set("password")}
            autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        </>
      )}
      {mode === "signup" && (
        <>
          <label htmlFor="a-confirm">Confirm password</label>
          <input id="a-confirm" type="password" required value={f.confirm} onChange={set("confirm")} autoComplete="new-password"
            aria-invalid={mismatch} className={mismatch ? "invalid" : ""} />
          {mismatch && <p className="err small">Passwords don't match.</p>}
        </>
      )}

      <div className="row">
        <button className="btn" disabled={busy || mismatch}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </button>
      </div>
      <div className="authlinks">
        {mode !== "signup" && <button type="button" className="linkbtn" onClick={() => switchTo("signup")}>New here? Create an account</button>}
        {mode !== "signin" && <button type="button" className="linkbtn" onClick={() => switchTo("signin")}>Have an account? Sign in</button>}
        {mode === "signin" && <button type="button" className="linkbtn" onClick={() => switchTo("reset")}>Forgot password?</button>}
      </div>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="err">{err}</p>}
    </form>
  );
}
