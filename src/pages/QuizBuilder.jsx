import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EXAMS, EXAM_NAMES } from "../lib/exams.js";
import { generateQuestions } from "../api.js";
import { supabase } from "../supabase.js";
import { useAuth } from "../lib/auth.jsx";

const L = "ABCDEF";
const blankQ = () => ({ type: "single", subject: "", stem: "", options: ["", "", "", ""], answers: [], rationale: "" });

export default function QuizBuilder() {
  const { id } = useParams();
  const { profile } = useAuth();
  const nav = useNavigate();
  const [meta, setMeta] = useState({ title: "", exam: profile?.target_exam || "NCLEX-RN", subjects: [], difficulty: "mixed", timed: false });
  const [count, setCount] = useState(10);
  const [focus, setFocus] = useState("");
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(null); // { index | null, q }
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("quizzes").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { setErr("That quiz couldn't be found."); return; }
      setMeta({ title: data.title, exam: data.exam, subjects: data.subjects, difficulty: data.difficulty, timed: data.timed });
      setQuestions(data.questions);
    });
  }, [id]);

  const subjectsFor = EXAMS[meta.exam].subjects;
  const toggleSubject = (s) => setMeta((m) => ({ ...m, subjects: m.subjects.includes(s) ? m.subjects.filter((x) => x !== s) : [...m.subjects, s] }));

  async function generate() {
    setErr(""); setBusy("Writing questions…");
    try {
      const subs = meta.subjects.length ? meta.subjects : subjectsFor;
      const fresh = await generateQuestions({
        exam: meta.exam, subjects: subs, count, difficulty: meta.difficulty, focus,
        avoid: questions.map((q) => q.stem),
        onProgress: (d, t) => t > 1 && setBusy(`Writing questions… ${d} of ${t} sets ready`),
      });
      setQuestions((qs) => [...qs, ...fresh]);
      if (!meta.title.trim()) setMeta((m) => ({ ...m, title: `${m.exam} — ${m.subjects.length === 1 ? m.subjects[0] : focus || "Custom quiz"}`.slice(0, 100) }));
    } catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  }

  async function save(andStart) {
    setErr("");
    if (!meta.title.trim()) return setErr("Give your quiz a title.");
    if (!questions.length) return setErr("Add at least one question.");
    setBusy("Saving…");
    const row = { ...meta, title: meta.title.trim().slice(0, 100), questions };
    const res = id
      ? await supabase.from("quizzes").update(row).eq("id", id).select("id").single()
      : await supabase.from("quizzes").insert(row).select("id").single();
    setBusy("");
    if (res.error) return setErr("That didn't save. Check your connection and try again.");
    nav(andStart ? `/quiz/${res.data.id}` : "/quizzes");
  }

  function saveEdited(q) {
    setQuestions((qs) => editing.index == null ? [...qs, q] : qs.map((x, i) => (i === editing.index ? q : x)));
    setEditing(null);
  }

  return (
    <section>
      <Link to="/quizzes" className="backlink">← My quizzes</Link>
      <h2>{id ? "Edit quiz" : "Build a custom quiz"}</h2>
      <p className="lede">Pick the exam and subjects you want to drill, have questions written for you, add your own, then save it to retake any time.</p>

      <div className="card">
        <label htmlFor="qb-title">Quiz title</label>
        <input id="qb-title" type="text" maxLength={100} value={meta.title} placeholder="e.g. Cardiac meds before Friday's exam"
          onChange={(e) => setMeta({ ...meta, title: e.target.value })} />

        <div className="two">
          <div>
            <label htmlFor="qb-exam">Exam</label>
            <select id="qb-exam" value={meta.exam} onChange={(e) => setMeta({ ...meta, exam: e.target.value, subjects: [] })}>
              {EXAM_NAMES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="qb-diff">Difficulty</label>
            <select id="qb-diff" value={meta.difficulty} onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })}>
              <option value="easier">Easier</option><option value="mixed">Mixed</option><option value="harder">Harder</option>
            </select>
          </div>
        </div>

        <label>Subjects <span className="meta">(none selected = all)</span></label>
        <div className="chips">
          {subjectsFor.map((s) => (
            <button key={s} type="button" className={"chip" + (meta.subjects.includes(s) ? " on" : "")} aria-pressed={meta.subjects.includes(s)} onClick={() => toggleSubject(s)}>{s}</button>
          ))}
        </div>

        <label htmlFor="qb-focus">Focus <span className="meta">(optional)</span></label>
        <input id="qb-focus" type="text" maxLength={300} value={focus} placeholder="e.g. heart failure meds, ABGs, pediatric vital signs" onChange={(e) => setFocus(e.target.value)} />

        <div className="two">
          <div>
            <label htmlFor="qb-count">Questions to write</label>
            <select id="qb-count" value={count} onChange={(e) => setCount(+e.target.value)}>
              {[5, 10, 15, 20].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className="check toggle"><input type="checkbox" checked={meta.timed} onChange={(e) => setMeta({ ...meta, timed: e.target.checked })} /> Timed (about 72 seconds per question)</label>
        </div>

        <div className="row">
          <button className="btn" onClick={generate} disabled={!!busy}>{busy && busy.startsWith("Writing") ? busy : "Write questions"}</button>
          <button className="btn ghost" onClick={() => setEditing({ index: null, q: { ...blankQ(), subject: meta.subjects[0] || subjectsFor[0] } })} disabled={!!busy}>Add my own question</button>
        </div>
        {err && <p className="err">{err}</p>}
      </div>

      {editing && <QuestionEditor initial={editing.q} subjects={subjectsFor} onCancel={() => setEditing(null)} onSave={saveEdited} />}

      <div className="qlist-head">
        <h3>{questions.length} question{questions.length === 1 ? "" : "s"}</h3>
        {questions.length > 0 && (
          <div className="row tight">
            <button className="btn ghost" onClick={() => save(false)} disabled={!!busy}>Save</button>
            <button className="btn" onClick={() => save(true)} disabled={!!busy}>Save & start</button>
          </div>
        )}
      </div>
      {questions.length === 0 ? (
        <div className="empty">No questions yet. Write some with AI or add your own above.</div>
      ) : (
        <ol className="qlist">
          {questions.map((q, i) => (
            <li key={i} className="card">
              <p className="qtopic">{q.subject}{q.type === "sata" && <span className="pill">SATA</span>}</p>
              <p className="qstem small">{q.stem}</p>
              <ul className="mini">{q.options.map((o, k) => <li key={k} className={q.answers.includes(k) ? "ans" : ""}>{L[k]}. {o}</li>)}</ul>
              <div className="row tight">
                <button className="btn ghost small" onClick={() => setEditing({ index: i, q })}>Edit</button>
                <button className="btn ghost small" onClick={() => setQuestions((qs) => qs.filter((_, k) => k !== i))}>Remove</button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function QuestionEditor({ initial, subjects, onSave, onCancel }) {
  const [q, setQ] = useState(initial);
  const [err, setErr] = useState("");
  const setOpt = (i, v) => setQ({ ...q, options: q.options.map((o, k) => (k === i ? v : o)) });
  const toggleAns = (i) => setQ({ ...q, answers: q.answers.includes(i) ? q.answers.filter((x) => x !== i) : [...q.answers, i].sort() });

  function submit() {
    const options = q.options.map((o) => o.trim());
    if (!q.stem.trim()) return setErr("Write the question.");
    if (options.some((o) => !o)) return setErr("Fill in every answer option, or remove the empty ones.");
    if (!q.answers.length) return setErr("Mark at least one correct answer.");
    if (q.answers.length > 1 && options.length < 5) return setErr("Select-all-that-apply questions need at least 5 options.");
    if (q.answers.length === 1 && options.length !== 4) return setErr("Single-answer questions need exactly 4 options.");
    onSave({ ...q, stem: q.stem.trim(), options, rationale: q.rationale.trim(), type: q.answers.length > 1 ? "sata" : "single" });
  }

  return (
    <div className="card editor">
      <h3>{initial.stem ? "Edit question" : "Your question"}</h3>
      <label>Subject</label>
      <select value={q.subject} onChange={(e) => setQ({ ...q, subject: e.target.value })}>
        {subjects.map((s) => <option key={s}>{s}</option>)}
      </select>
      <label>Question</label>
      <textarea value={q.stem} maxLength={800} onChange={(e) => setQ({ ...q, stem: e.target.value })} />
      <label>Options <span className="meta">— tick every correct one (2+ makes it select-all-that-apply)</span></label>
      {q.options.map((o, i) => (
        <div className="optedit" key={i}>
          <input type="checkbox" aria-label={`Option ${L[i]} is correct`} checked={q.answers.includes(i)} onChange={() => toggleAns(i)} />
          <span className="k">{L[i]}</span>
          <input type="text" value={o} maxLength={300} onChange={(e) => setOpt(i, e.target.value)} aria-label={`Option ${L[i]}`} />
          {q.options.length > 4 && (
            <button type="button" className="linkbtn" aria-label={`Remove option ${L[i]}`}
              onClick={() => setQ({ ...q, options: q.options.filter((_, k) => k !== i), answers: q.answers.filter((a) => a !== i).map((a) => (a > i ? a - 1 : a)) })}>✕</button>
          )}
        </div>
      ))}
      {q.options.length < 6 && <button type="button" className="linkbtn" onClick={() => setQ({ ...q, options: [...q.options, ""] })}>+ Add option</button>}
      <label>Rationale</label>
      <textarea value={q.rationale} maxLength={1200} placeholder="Why the answer is right and the others are wrong" onChange={(e) => setQ({ ...q, rationale: e.target.value })} />
      <div className="row">
        <button className="btn" onClick={submit}>Save question</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
