import { useEffect, useMemo, useRef, useState } from "react";

const L = "ABCDEF";
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const isRight = (q, sel) => same([...sel].sort(), [...q.answers].sort());
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * NurseHub-style quiz: select → Check (rationale shows either way) → Next.
 * Skip, flag for review, and a Quiz Summary grid to jump between questions.
 */
export default function QuizPlayer({ title, questions, timed = false, onFinish, onExit }) {
  const n = questions.length;
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(() => questions.map(() => []));
  const [checked, setChecked] = useState(() => questions.map(() => false));
  const [flagged, setFlagged] = useState(() => questions.map(() => false));
  const [view, setView] = useState("question"); // question | summary | results
  const [secs, setSecs] = useState(timed ? n * 72 : 0); // ~72s per item, NCLEX pacing
  const reported = useRef(false);

  const q = questions[idx];
  const correct = useMemo(() => questions.map((qq, i) => checked[i] && isRight(qq, sel[i])), [questions, checked, sel]);
  const score = correct.filter(Boolean).length;

  useEffect(() => {
    if (view === "results") return;
    const t = setInterval(() => setSecs((s) => (timed ? Math.max(0, s - 1) : s + 1)), 1000);
    return () => clearInterval(t);
  }, [view, timed]);

  useEffect(() => { if (timed && secs === 0 && view !== "results") finish(); }); // eslint-disable-line

  function choose(i) {
    if (checked[idx]) return;
    setSel((s) => s.map((v, k) => k !== idx ? v : q.type === "sata" ? (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]) : [i]));
  }
  const check = () => setChecked((c) => c.map((v, k) => (k === idx ? true : v)));
  const go = (i) => { setIdx(i); setView("question"); };
  const next = () => (idx + 1 < n ? setIdx(idx + 1) : setView("summary"));
  const toggleFlag = () => setFlagged((f) => f.map((v, k) => (k === idx ? !v : v)));

  function finish() {
    setChecked(questions.map(() => true)); // reveal everything on the results screen
    setView("results");
    if (!reported.current) {
      reported.current = true;
      const finalScore = questions.filter((qq, i) => isRight(qq, sel[i])).length;
      const breakdown = {};
      questions.forEach((qq, i) => {
        const b = (breakdown[qq.subject || "General"] ||= { right: 0, total: 0 });
        b.total++; if (isRight(qq, sel[i])) b.right++;
      });
      const seconds = timed ? n * 72 - secs : secs;
      onFinish?.({ score: finalScore, total: n, breakdown, seconds, missed: questions.filter((qq, i) => !isRight(qq, sel[i])) });
    }
  }

  const status = (i) => (checked[i] ? (correct[i] ? "right" : "wrong") : sel[i].length ? "answered" : "blank");

  // ---------- results ----------
  if (view === "results") {
    const finalCorrect = questions.map((qq, i) => isRight(qq, sel[i]));
    const finalScore = finalCorrect.filter(Boolean).length;
    const pct = Math.round((finalScore / n) * 100);
    const bySubject = {};
    questions.forEach((qq, i) => {
      const s = (bySubject[qq.subject] ||= { right: 0, total: 0 });
      s.total++; if (finalCorrect[i]) s.right++;
    });
    return (
      <Results title={title} pct={pct} score={finalScore} n={n} bySubject={bySubject}
        questions={questions} sel={sel} finalCorrect={finalCorrect} onExit={onExit} />
    );
  }

  // ---------- summary ----------
  if (view === "summary") {
    const answered = questions.filter((_, i) => sel[i].length).length;
    return (
      <div className="card quizcard">
        <div className="quizhead"><strong>{title}</strong><span className="meta">{timed ? `Time left ${fmt(secs)}` : fmt(secs)}</span></div>
        <h3>Quiz summary</h3>
        <p className="note">{answered} of {n} answered · {flagged.filter(Boolean).length} flagged for review. Tap a number to go back to it.</p>
        <div className="grid-nums">
          {questions.map((_, i) => (
            <button key={i} className={`num ${status(i)} ${flagged[i] ? "flag" : ""}`} onClick={() => go(i)} aria-label={`Question ${i + 1}, ${status(i)}${flagged[i] ? ", flagged" : ""}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="legend meta">
          <span><i className="num right" />Correct</span><span><i className="num wrong" />Incorrect</span>
          <span><i className="num answered" />Answered</span><span><i className="num blank" />Not answered</span><span><i className="num blank flag" />Flagged</span>
        </div>
        <div className="row">
          <button className="btn" onClick={finish}>Finish quiz</button>
          <button className="btn ghost" onClick={() => setView("question")}>Back to questions</button>
        </div>
      </div>
    );
  }

  // ---------- question ----------
  const done = checked[idx];
  const ok = done && correct[idx];
  return (
    <div className="card quizcard">
      <div className="quizhead">
        <strong>{title}</strong>
        <span className={"meta" + (timed && secs < 60 ? " urgent" : "")}>{timed ? `Time left ${fmt(secs)}` : fmt(secs)}</span>
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${((idx + 1) / n) * 100}%` }} /></div>
      <p className="qtopic">Question {idx + 1} of {n} · {q.subject}{q.type === "sata" && <span className="pill">Select all that apply</span>}</p>
      <p className="qstem">{q.stem}</p>
      <ul className="opts">
        {q.options.map((o, i) => {
          let cls = "opt" + (q.type === "sata" ? " multi" : "");
          if (done && q.answers.includes(i)) cls += " right";
          else if (done && sel[idx].includes(i)) cls += " wrong";
          return (
            <li key={i}>
              <button className={cls} aria-pressed={sel[idx].includes(i)} disabled={done} onClick={() => choose(i)}>
                <span className="k">{L[i]}</span><span>{o}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {done && (
        <div className={"rationale" + (ok ? "" : " miss")}>
          <strong>{ok ? "Correct." : sel[idx].length ? `Incorrect — the answer is ${q.answers.map((a) => L[a]).join(", ")}.` : `Skipped — the answer is ${q.answers.map((a) => L[a]).join(", ")}.`}</strong> {q.rationale}
        </div>
      )}
      <div className="row quizbar">
        {!done
          ? <button className="btn" onClick={check} disabled={!sel[idx].length}>Check</button>
          : <button className="btn" onClick={next}>{idx + 1 < n ? "Next" : "Quiz summary"}</button>}
        {!done && <button className="btn ghost small" onClick={next}>Skip question</button>}
        <button className={"btn ghost small" + (flagged[idx] ? " flagged" : "")} onClick={toggleFlag} aria-pressed={flagged[idx]}>
          {flagged[idx] ? "⚑ Flagged" : "⚐ Review later"}
        </button>
        <button className="btn ghost small" onClick={() => setView("summary")}>Quiz summary</button>
      </div>
    </div>
  );
}

function Results({ title, pct, score, n, bySubject, questions, sel, finalCorrect, onExit }) {
  const [missedOnly, setMissedOnly] = useState(false);
  return (
    <div className="card quizcard">
      <p className="qtopic">{title}</p>
      <div className="result-hero">
        <div className={"bigscore " + (pct >= 75 ? "good" : pct >= 50 ? "mid" : "low")}>{pct}%</div>
        <div><h3>{score} of {n} correct</h3><p className="note">{pct >= 75 ? "Strong work. Keep the streak going." : pct >= 50 ? "Getting there. Review the rationales below." : "Worth another pass. Read each rationale, then retake."}</p></div>
      </div>
      {Object.keys(bySubject).length > 1 && (
        <div className="bysubj">
          {Object.entries(bySubject).map(([s, v]) => (
            <div key={s} className="subjrow">
              <span>{s}</span>
              <span className="bar"><span style={{ width: `${(v.right / v.total) * 100}%` }} /></span>
              <span className="meta">{v.right}/{v.total}</span>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn" onClick={() => onExit?.("retake")}>Retake</button>
        {finalCorrect.some((c) => !c) && <button className="btn ghost" onClick={() => onExit?.("missed")}>Retake missed only</button>}
        <button className="btn ghost" onClick={() => onExit?.("done")}>Done</button>
      </div>
      <div className="reviewhead">
        <h3>Review</h3>
        <label className="check"><input type="checkbox" checked={missedOnly} onChange={(e) => setMissedOnly(e.target.checked)} /> Missed only</label>
      </div>
      <ol className="review">
        {questions.map((q, i) => (missedOnly && finalCorrect[i]) ? null : (
          <li key={i} className={finalCorrect[i] ? "r-ok" : "r-miss"}>
            <p className="qstem small">{q.stem}</p>
            <p className="meta">Your answer: {sel[i].length ? sel[i].map((a) => L[a]).join(", ") : "—"} · Correct: {q.answers.map((a) => L[a]).join(", ")}</p>
            <ul className="mini">{q.options.map((o, k) => <li key={k} className={q.answers.includes(k) ? "ans" : ""}>{L[k]}. {o}</li>)}</ul>
            <p className="ratline">{q.rationale}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
