import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";

export default function MyQuizzes() {
  const [quizzes, setQuizzes] = useState(null);
  const [attempts, setAttempts] = useState([]);

  async function load() {
    const [q, a] = await Promise.all([
      supabase.from("quizzes").select("id,title,exam,subjects,timed,questions,created_at").order("created_at", { ascending: false }),
      supabase.from("quiz_attempts").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setQuizzes(q.data || []); setAttempts(a.data || []);
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm("Delete this quiz? Your past scores stay in your history.")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    load();
  }

  return (
    <section>
      <div className="pagehead">
        <div><h2>My quizzes</h2><p className="lede">Custom quizzes you've built, plus your recent scores.</p></div>
        <Link to="/quizzes/new" className="btn">New quiz</Link>
      </div>

      {quizzes === null ? <p className="note">Loading…</p> : quizzes.length === 0 ? (
        <div className="empty">No custom quizzes yet. <Link to="/quizzes/new">Build your first one</Link> — pick subjects, set a length, and save it to retake any time.</div>
      ) : (
        <div className="list">
          {quizzes.map((q) => (
            <article key={q.id} className="card rowcard">
              <div>
                <strong>{q.title}</strong>
                <div className="meta">{q.exam} · {q.questions.length} questions{q.timed ? " · timed" : ""}{q.subjects.length ? ` · ${q.subjects.slice(0, 3).join(", ")}${q.subjects.length > 3 ? "…" : ""}` : ""}</div>
              </div>
              <div className="row tight">
                <Link className="btn small" to={`/quiz/${q.id}`}>Start</Link>
                <Link className="btn ghost small" to={`/quizzes/${q.id}/edit`}>Edit</Link>
                <button className="btn ghost small" onClick={() => remove(q.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h3 className="sectionhead">Recent scores</h3>
      {attempts.length === 0 ? <p className="note">Finish a quiz and your score shows up here.</p> : (
        <div className="table-wrap">
          <table className="scores">
            <thead><tr><th>Quiz</th><th>Score</th><th>Date</th></tr></thead>
            <tbody>
              {attempts.map((a) => {
                const pct = Math.round((a.score / a.total) * 100);
                return (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td><span className={"scorepill " + (pct >= 75 ? "good" : pct >= 50 ? "mid" : "low")}>{pct}%</span> <span className="meta">{a.score}/{a.total}</span></td>
                    <td className="meta">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
