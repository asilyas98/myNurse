import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { EXAMS, EXAM_NAMES } from "../lib/exams.js";
import QOTD from "../components/QOTD.jsx";

const GOAL = 75; // passing-confidence target shown on charts
const pct = (r, t) => (t ? Math.round((r / t) * 100) : 0);
const band = (p) => (p >= GOAL ? "good" : p >= 60 ? "mid" : "low");
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };

function streakFrom(attempts) {
  const days = new Set(attempts.map((a) => dayKey(a.created_at)));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not studied yet → count from yesterday
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

const fmtTime = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.round(s / 60)}m`);

export default function Dashboard() {
  const { session, profile } = useAuth();
  const nav = useNavigate();
  const [exam, setExam] = useState(profile?.target_exam || "NCLEX-RN");
  const [attempts, setAttempts] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [cardsToStudy, setCardsToStudy] = useState(null);
  const [quizCount, setQuizCount] = useState(0);

  useEffect(() => { if (profile?.target_exam) setExam(profile.target_exam); }, [profile?.target_exam]);

  useEffect(() => {
    (async () => {
      const [a, l, c, q] = await Promise.all([
        supabase.from("quiz_attempts").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("bookings").select("id,start_at,topic,status,tutor_id,student_id").in("status", ["pending", "accepted"])
          .gte("start_at", new Date().toISOString()).order("start_at").limit(3),
        supabase.from("cards").select("id", { count: "exact", head: true }).eq("known", false),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
      ]);
      setAttempts(a.data || []); setLessons(l.data || []); setCardsToStudy(c.count ?? 0); setQuizCount(q.count ?? 0);
    })();
  }, [session.user.id]);

  const view = useMemo(() => (attempts || []).filter((a) => exam === "All" || a.exam === exam), [attempts, exam]);

  const stats = useMemo(() => {
    const answered = view.reduce((s, a) => s + a.total, 0);
    const right = view.reduce((s, a) => s + a.score, 0);
    const last10 = view.slice(0, 10);
    const recentAvg = last10.length ? Math.round(last10.reduce((s, a) => s + a.score / a.total, 0) / last10.length * 100) : null;
    const prev10 = view.slice(10, 20);
    const prevAvg = prev10.length ? Math.round(prev10.reduce((s, a) => s + a.score / a.total, 0) / prev10.length * 100) : null;
    return {
      quizzes: view.length, answered, accuracy: answered ? pct(right, answered) : null, recentAvg,
      change: recentAvg != null && prevAvg != null ? recentAvg - prevAvg : null,
      streak: streakFrom(attempts || []), seconds: view.reduce((s, a) => s + (a.seconds || 0), 0),
    };
  }, [view, attempts]);

  const subjects = useMemo(() => {
    const agg = {};
    for (const a of view) {
      const bd = a.breakdown && Object.keys(a.breakdown).length ? a.breakdown : (a.subject && a.subject !== "Mixed" ? { [a.subject]: { right: a.score, total: a.total } } : {});
      for (const [s, v] of Object.entries(bd)) {
        const x = (agg[s] ||= { right: 0, total: 0 });
        x.right += v.right; x.total += v.total;
      }
    }
    const known = exam !== "All" ? EXAMS[exam].subjects : [];
    const rows = Object.entries(agg).map(([s, v]) => ({ subject: s, ...v, p: pct(v.right, v.total), practicable: known.includes(s) }));
    const untouched = known.filter((s) => !agg[s]).map((s) => ({ subject: s, right: 0, total: 0, p: null, practicable: true }));
    rows.sort((a, b) => a.p - b.p);
    return { rows, untouched };
  }, [view, exam]);

  const trend = useMemo(() => view.slice(0, 20).reverse().map((a) => ({ p: pct(a.score, a.total), title: a.title, date: a.created_at })), [view]);

  const drill = (subject) => nav("/quiz", { state: { source: "practice", exam, subject, count: 10 } });
  const weakest = subjects.rows.filter((r) => r.practicable && r.total >= 3)[0];
  const first = profile?.display_name?.split(" ")[0];

  if (attempts === null) return <div className="card loadingcard"><span className="pulse-dot" />Loading your dashboard…</div>;

  return (
    <section className="dash">
      <div className="pagehead">
        <div>
          <h2>{first ? `Welcome back, ${first}` : "Your dashboard"}</h2>
          <p className="lede">{stats.quizzes ? "Here's how your studying is going." : "Take your first quiz and your progress will show up here."}</p>
        </div>
        <label className="inline">Exam
          <select value={exam} onChange={(e) => setExam(e.target.value)}>
            {EXAM_NAMES.map((x) => <option key={x}>{x}</option>)}<option>All</option>
          </select>
        </label>
      </div>

      <div className="quickacts">
        <Link to="/practice" className="qa accent"><strong>Start a practice test</strong><span>{exam === "All" ? "Any exam" : exam} by subject</span></Link>
        <Link to="/quizzes/new" className="qa"><strong>Build a custom quiz</strong><span>Your subjects, your length</span></Link>
        {weakest
          ? <button className="qa warn" onClick={() => drill(weakest.subject)}><strong>Drill your weakest area</strong><span>{weakest.subject} · {weakest.p}%</span></button>
          : <Link to="/flashcards" className="qa"><strong>Study flashcards</strong><span>{cardsToStudy ? `${cardsToStudy} cards to learn` : "Make your first deck"}</span></Link>}
        <Link to="/ask" className="qa"><strong>Ask the AI tutor</strong><span>Concepts explained with the "why"</span></Link>
      </div>

      <div className="statgrid">
        <Stat label="Recent average" value={stats.recentAvg != null ? `${stats.recentAvg}%` : "—"} hint={stats.change != null ? `${stats.change >= 0 ? "▲" : "▼"} ${Math.abs(stats.change)} pts vs. previous 10` : "last 10 quizzes"} tone={stats.change != null ? (stats.change >= 0 ? "up" : "down") : ""} />
        <Stat label="Overall accuracy" value={stats.accuracy != null ? `${stats.accuracy}%` : "—"} hint={`${stats.answered} questions answered`} />
        <Stat label="Study streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} hint={stats.streak ? "Keep it going today" : "Finish a quiz to start one"} />
        <Stat label="Quizzes taken" value={stats.quizzes} hint={stats.seconds ? `${fmtTime(stats.seconds)} studied` : `${quizCount} custom quiz${quizCount === 1 ? "" : "zes"} saved`} />
      </div>

      <div className="dashgrid">
        <div className="dashmain">
          <div className="card">
            <div className="cardhead"><h3>Score trend</h3><span className="meta">last {trend.length} quiz{trend.length === 1 ? "" : "zes"} · goal {GOAL}%</span></div>
            {trend.length < 2 ? <p className="note">Finish two or more quizzes to see your trend.</p> : <TrendChart points={trend} />}
          </div>

          <div className="card">
            <div className="cardhead"><h3>Performance by subject</h3><span className="meta">weakest first</span></div>
            {subjects.rows.length === 0 ? (
              <p className="note">Your subject breakdown appears after your first quiz.</p>
            ) : (
              <div className="subjtable">
                {subjects.rows.map((r) => (
                  <div className="subjline" key={r.subject}>
                    <div className="subjname"><strong title={r.subject}>{r.subject}</strong><span className="meta">{r.right}/{r.total} correct</span></div>
                    <div className="subjbar"><span className={band(r.p)} style={{ width: `${Math.max(r.p, 3)}%` }} /><i style={{ left: `${GOAL}%` }} /></div>
                    <span className={"scorepill " + band(r.p)}>{r.p}%</span>
                    {r.practicable ? <button className="btn ghost small" onClick={() => drill(r.subject)}>Practice</button> : <span />}
                  </div>
                ))}
              </div>
            )}
            {subjects.untouched.length > 0 && (
              <div className="untouched">
                <p className="meta">Not started yet:</p>
                <div className="chips">{subjects.untouched.map((s) => <button key={s.subject} className="chip" onClick={() => drill(s.subject)}>{s.subject} →</button>)}</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="cardhead"><h3>Recent quizzes</h3><Link to="/quizzes" className="linkbtn">My quizzes →</Link></div>
            {view.length === 0 ? <p className="note">No quizzes yet. <Link to="/practice">Start one now</Link>.</p> : (
              <div className="table-wrap">
                <table className="scores">
                  <thead><tr><th>Quiz</th><th>Score</th><th>Date</th><th /></tr></thead>
                  <tbody>
                    {view.slice(0, 8).map((a) => {
                      const p = pct(a.score, a.total);
                      return (
                        <tr key={a.id}>
                          <td>{a.title}</td>
                          <td><span className={"scorepill " + band(p)}>{p}%</span> <span className="meta">{a.score}/{a.total}</span></td>
                          <td className="meta">{new Date(a.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</td>
                          <td>{a.quiz_id && <Link className="linkbtn" to={`/quiz/${a.quiz_id}`}>Retake</Link>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="dashside">
          <QOTD exam={exam === "All" ? profile?.target_exam : exam} compact />
          <div className="card">
            <div className="cardhead"><h3>Flashcards</h3><Link to="/flashcards" className="linkbtn">Open →</Link></div>
            <p className="note">{cardsToStudy == null ? "…" : cardsToStudy ? `${cardsToStudy} card${cardsToStudy === 1 ? "" : "s"} still to learn across your decks.` : "You're caught up — or make a new deck from your notes."}</p>
          </div>
          <div className="card">
            <div className="cardhead"><h3>Upcoming lessons</h3><Link to="/lessons" className="linkbtn">All →</Link></div>
            {lessons.length === 0 ? <p className="note">Nothing booked. <Link to="/tutors">Find a tutor</Link> if a subject keeps tripping you up.</p>
              : lessons.map((b) => (
                <p key={b.id} className="lessonline">
                  <strong>{new Date(b.start_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong>
                  <span className="meta">{b.topic} · {b.status === "pending" ? (b.tutor_id === session.user.id ? "needs your reply" : "awaiting tutor") : "confirmed"}</span>
                </p>
              ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Stat({ label, value, hint, tone = "" }) {
  return (
    <div className="card stat">
      <span className="meta">{label}</span>
      <strong className="statnum">{value}</strong>
      <span className={"stathint " + tone}>{hint}</span>
    </div>
  );
}

function TrendChart({ points }) {
  const W = 640, H = 200, P = { l: 34, r: 12, t: 12, b: 24 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const x = (i) => P.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => P.t + ih - (v / 100) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.p).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z`;
  return (
    <svg className="trendchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Score trend over ${points.length} quizzes, latest ${points.at(-1).p}%`}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className={v === GOAL ? "goal" : "grid"} />
          <text x={P.l - 6} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={area} className="area" />
      <path d={line} className="line" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.p)} r={i === points.length - 1 ? 5 : 3.5} className={"dot " + band(p.p)}>
          <title>{`${p.title}: ${p.p}% (${new Date(p.date).toLocaleDateString()})`}</title>
        </circle>
      ))}
      <text x={P.l} y={H - 6} className="axis">older</text>
      <text x={W - P.r} y={H - 6} textAnchor="end" className="axis">latest</text>
    </svg>
  );
}
