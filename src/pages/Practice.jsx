import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXAMS, EXAM_NAMES, bankFor } from "../lib/exams.js";
import { useAuth } from "../lib/auth.jsx";

export default function Practice() {
  const { session, profile } = useAuth();
  const [exam, setExam] = useState(profile?.target_exam || "NCLEX-RN");
  const [count, setCount] = useState(10);
  const nav = useNavigate();
  const start = (subject) => nav("/quiz", { state: { source: "practice", exam, subject, count } });

  return (
    <section>
      <h2>Practice tests</h2>
      <p className="lede">Choose your exam, then a subject. Check each answer to see the rationale, flag items to revisit, and review everything at the end.</p>

      <div className="examtabs" role="tablist" aria-label="Exam">
        {EXAM_NAMES.map((x) => (
          <button key={x} role="tab" aria-selected={exam === x} onClick={() => setExam(x)}>{x}</button>
        ))}
      </div>
      <p className="note">{EXAMS[exam].blurb}</p>

      <div className="toolbar">
        <label className="inline">Questions per quiz
          <select value={count} onChange={(e) => setCount(+e.target.value)}>
            {[5, 10, 15, 20].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="row tight">
          <Link className="btn ghost small" to="/quizzes/new">Build a custom quiz</Link>
          {session && <Link className="btn ghost small" to="/quizzes">My quizzes & scores</Link>}
        </div>
      </div>
      {!session && (
        <p className="callout">You're practicing with the free starter questions. <Link to="/signin">Sign in</Link> to get fresh questions written for every subject.</p>
      )}

      <div className="tiles">
        <button className="tile accent" onClick={() => start(null)}>
          <span className="tile-k">Mixed</span>
          <strong>All {exam} subjects</strong>
          <span className="meta">A random spread, like test day</span>
          <span className="tile-go">Start quiz →</span>
        </button>
        {EXAMS[exam].subjects.map((s) => {
          const have = bankFor(exam, s).length;
          return (
            <button className="tile" key={s} onClick={() => start(s)}>
              <span className="tile-k">{exam}</span>
              <strong>{s}</strong>
              <span className="meta">{session ? "Fresh questions every time" : have ? `${have} starter question${have > 1 ? "s" : ""}` : "Sign in to unlock"}</span>
              <span className="tile-go">Start quiz →</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
