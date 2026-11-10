import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { EXAM_NAMES, EXAMS } from "../lib/exams.js";
import { useNavigate } from "react-router-dom";

export default function Account() {
  const { session, profile, refreshProfile } = useAuth();
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => { if (profile && !p) setP({ display_name: profile.display_name, role: profile.role, target_exam: profile.target_exam }); }, [profile, p]);
  useEffect(() => {
    const h = window.location.hash;
    if (h === "#tutor" || h === "#password") setTimeout(() => document.getElementById(h.slice(1))?.scrollIntoView({ behavior: "smooth" }), 300);
  }, []);

  async function saveProfile() {
    setMsg(""); setErr("");
    if (!p.display_name.trim()) return setErr("Your name can't be empty.");
    const { error } = await supabase.from("profiles").update({ display_name: p.display_name.trim().slice(0, 60), role: p.role, target_exam: p.target_exam }).eq("user_id", session.user.id);
    if (error) return setErr("That didn't save. Try again.");
    await refreshProfile();
    setMsg("Saved.");
  }

  async function changePassword() {
    setPwMsg("");
    if (pw.next.length < 8) return setPwMsg("Use at least 8 characters.");
    if (pw.next !== pw.confirm) return setPwMsg("Passwords don't match.");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setPwMsg(error ? error.message : "Password updated.");
    if (!error) setPw({ next: "", confirm: "" });
  }

  if (!p) return <p className="note">Loading…</p>;
  return (
    <section>
      <h2>Account</h2>
      <p className="lede">Signed in as {session.user.email}</p>

      <div className="card">
        <h3>Profile</h3>
        <label htmlFor="ac-name">Name</label>
        <input id="ac-name" type="text" maxLength={60} value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} />
        <fieldset className="seg">
          <legend>I use MyNurse as a</legend>
          {[["student", "Student"], ["tutor", "Tutor"]].map(([v, l]) => (
            <label key={v} className={p.role === v ? "on" : ""}><input type="radio" name="ac-role" checked={p.role === v} onChange={() => setP({ ...p, role: v })} />{l}</label>
          ))}
        </fieldset>
        <label htmlFor="ac-exam">Exam I'm focused on</label>
        <select id="ac-exam" value={p.target_exam} onChange={(e) => setP({ ...p, target_exam: e.target.value })}>
          {EXAM_NAMES.map((x) => <option key={x}>{x}</option>)}
        </select>
        <div className="row"><button className="btn" onClick={saveProfile}>Save profile</button></div>
        {msg && <p className="ok">{msg}</p>}{err && <p className="err">{err}</p>}
      </div>

      {(profile.role === "tutor") ? <TutorEditor /> : (
        <div className="card" id="tutor">
          <h3>Want to tutor?</h3>
          <p className="note">Switch your role to Tutor above and save, then publish a profile students can book.</p>
        </div>
      )}

      <div className="card" id="password">
        <h3>Change password</h3>
        <div className="two">
          <div><label htmlFor="pw1">New password</label><input id="pw1" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <div><label htmlFor="pw2">Confirm new password</label><input id="pw2" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
        </div>
        <div className="row"><button className="btn ghost" onClick={changePassword}>Update password</button></div>
        {pwMsg && <p className={pwMsg === "Password updated." ? "ok" : "err"}>{pwMsg}</p>}
      </div>

      <div className="card">
        <h3>More</h3>
        <nav className="linklist" aria-label="More pages">
          <Link to="/quizzes">My quizzes & scores<span>→</span></Link>
          <Link to="/lessons">My lessons<span>→</span></Link>
          <Link to="/ask">AI study tutor<span>→</span></Link>
          <Link to="/privacy">Privacy policy<span>→</span></Link>
        </nav>
      </div>

      <div className="row"><button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button></div>

      <DeleteAccount />
    </section>
  );
}

function TutorEditor() {
  const { session } = useAuth();
  const me = session.user.id;
  const [t, setT] = useState(null);
  const [exists, setExists] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [row, c] = await Promise.all([
        supabase.from("tutors").select("*").eq("user_id", me).maybeSingle(),
        supabase.from("tutor_contacts").select("contact").eq("user_id", me).maybeSingle(),
      ]);
      setExists(!!row.data);
      const d = row.data || {};
      setT({
        headline: d.headline || "", bio: d.bio || "", credentials: d.credentials || "",
        years_experience: d.years_experience ?? 0, hourly_rate: d.hourly_rate ?? 30,
        exams: d.exams || [], subjects: (d.subjects || []).join(", "), languages: d.languages || "English",
        availability: d.availability || "", is_active: d.is_active ?? true, contact: c.data?.contact || "",
      });
    })();
  }, [me]);

  const toggleExam = (x) => setT({ ...t, exams: t.exams.includes(x) ? t.exams.filter((e) => e !== x) : [...t.exams, x] });

  async function save() {
    setMsg(""); setErr("");
    const subjects = t.subjects.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
    if (!t.headline.trim()) return setErr("Add a headline — it's the first thing students see.");
    if (!t.exams.length) return setErr("Pick at least one exam you tutor.");
    if (!subjects.length) return setErr("Add at least one subject.");
    if (!t.contact.trim()) return setErr("Add how confirmed students should reach you (shared only after you accept).");
    setBusy(true);
    const row = {
      user_id: me, headline: t.headline.trim().slice(0, 90), bio: t.bio.trim().slice(0, 1500), credentials: t.credentials.trim().slice(0, 80),
      years_experience: Math.max(0, Math.min(60, +t.years_experience || 0)), hourly_rate: Math.max(0, Math.min(500, +t.hourly_rate || 0)),
      exams: t.exams, subjects, languages: t.languages.trim().slice(0, 80), availability: t.availability.trim().slice(0, 160),
      is_active: t.is_active, updated_at: new Date().toISOString(),
    };
    const a = await supabase.from("tutors").upsert(row);
    const b = a.error ? a : await supabase.from("tutor_contacts").upsert({ user_id: me, contact: t.contact.trim().slice(0, 160) });
    setBusy(false);
    if (a.error || b.error) return setErr("That didn't save. Check the fields and try again.");
    setExists(true);
    setMsg(t.is_active ? "Your profile is live." : "Saved. Your profile is hidden from search.");
  }

  if (!t) return <div className="card" id="tutor"><p className="note">Loading tutor profile…</p></div>;
  const allSubjects = [...new Set(t.exams.flatMap((x) => EXAMS[x].subjects))];
  return (
    <div className="card" id="tutor">
      <div className="pagehead"><h3>Tutor profile</h3>{exists && <Link className="btn ghost small" to={`/tutors/${me}`}>View public profile</Link>}</div>
      <label htmlFor="tp-head">Headline</label>
      <input id="tp-head" type="text" maxLength={90} placeholder="e.g. ICU RN helping you think like the NCLEX" value={t.headline} onChange={(e) => setT({ ...t, headline: e.target.value })} />
      <label htmlFor="tp-bio">About you</label>
      <textarea id="tp-bio" maxLength={1500} rows={5} placeholder="Your background, how you teach, and who you help best" value={t.bio} onChange={(e) => setT({ ...t, bio: e.target.value })} />
      <div className="two">
        <div><label htmlFor="tp-cred">Credentials</label><input id="tp-cred" type="text" maxLength={80} placeholder="e.g. RN, BSN, CCRN" value={t.credentials} onChange={(e) => setT({ ...t, credentials: e.target.value })} /></div>
        <div><label htmlFor="tp-yrs">Years of experience</label><input id="tp-yrs" type="number" min="0" max="60" value={t.years_experience} onChange={(e) => setT({ ...t, years_experience: e.target.value })} /></div>
      </div>
      <label>Exams you tutor</label>
      <div className="chips">{EXAM_NAMES.map((x) => <button key={x} type="button" className={"chip" + (t.exams.includes(x) ? " on" : "")} aria-pressed={t.exams.includes(x)} onClick={() => toggleExam(x)}>{x}</button>)}</div>
      <label htmlFor="tp-subj">Subjects <span className="meta">(comma separated)</span></label>
      <input id="tp-subj" type="text" maxLength={300} placeholder="e.g. Pharmacology, ECG interpretation, Dosage calculation" value={t.subjects} onChange={(e) => setT({ ...t, subjects: e.target.value })} />
      {allSubjects.length > 0 && (
        <div className="chips small">
          {allSubjects.filter((s) => !t.subjects.toLowerCase().includes(s.toLowerCase())).slice(0, 10).map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setT({ ...t, subjects: t.subjects.trim() ? `${t.subjects.replace(/,\s*$/, "")}, ${s}` : s })}>+ {s}</button>
          ))}
        </div>
      )}
      <div className="two">
        <div><label htmlFor="tp-rate">Hourly rate (USD)</label><input id="tp-rate" type="number" min="0" max="500" value={t.hourly_rate} onChange={(e) => setT({ ...t, hourly_rate: e.target.value })} /></div>
        <div><label htmlFor="tp-lang">Languages</label><input id="tp-lang" type="text" maxLength={80} value={t.languages} onChange={(e) => setT({ ...t, languages: e.target.value })} /></div>
      </div>
      <label htmlFor="tp-avail">Availability</label>
      <input id="tp-avail" type="text" maxLength={160} placeholder="e.g. Weeknights 6–9pm ET, Sunday afternoons" value={t.availability} onChange={(e) => setT({ ...t, availability: e.target.value })} />
      <label htmlFor="tp-contact">How confirmed students reach you <span className="meta">(private until you accept a lesson)</span></label>
      <input id="tp-contact" type="text" maxLength={160} placeholder="e.g. email, phone, or your Zoom link" value={t.contact} onChange={(e) => setT({ ...t, contact: e.target.value })} />
      <label className="check toggle"><input type="checkbox" checked={t.is_active} onChange={(e) => setT({ ...t, is_active: e.target.checked })} /> Show my profile in tutor search</label>
      <div className="row"><button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : exists ? "Save tutor profile" : "Publish tutor profile"}</button></div>
      {msg && <p className="ok">{msg}</p>}{err && <p className="err">{err}</p>}
    </div>
  );
}

function DeleteAccount() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function del() {
    setErr(""); setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setBusy(false); setErr("Your account couldn't be deleted. Try again, or contact support."); return; }
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    nav("/", { replace: true });
  }

  return (
    <div className="card danger" id="delete">
      <h3>Delete account</h3>
      <p className="note">Permanently deletes your account, quizzes, scores, flashcards, tutor profile, lessons, and reviews. This can't be undone.</p>
      {!open ? (
        <button className="btn ghost small dangerbtn" onClick={() => setOpen(true)}>Delete my account</button>
      ) : (
        <>
          <label htmlFor="del-confirm">Type DELETE to confirm</label>
          <input id="del-confirm" type="text" autoCapitalize="characters" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          <div className="row">
            <button className="btn dangerfill" disabled={typed.trim().toUpperCase() !== "DELETE" || busy} onClick={del}>{busy ? "Deleting…" : "Permanently delete"}</button>
            <button className="btn ghost" onClick={() => { setOpen(false); setTyped(""); }}>Cancel</button>
          </div>
        </>
      )}
      {err && <p className="err">{err}</p>}
    </div>
  );
}
