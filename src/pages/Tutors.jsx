import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";
import { EXAM_NAMES } from "../lib/exams.js";
import { Avatar, Stars } from "../components/Stars.jsx";
import { useAuth } from "../lib/auth.jsx";

export default function Tutors() {
  const { profile } = useAuth();
  const [tutors, setTutors] = useState(null);
  const [q, setQ] = useState("");
  const [exam, setExam] = useState("Any");
  const [maxRate, setMaxRate] = useState(150);
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    (async () => {
      const [t, s] = await Promise.all([
        supabase.from("tutors").select("*, profile:profiles!tutors_user_id_fkey(display_name)").eq("is_active", true).limit(200),
        supabase.from("tutor_stats").select("*"),
      ]);
      const stats = Object.fromEntries((s.data || []).map((x) => [x.user_id, x]));
      setTutors((t.data || []).map((x) => ({ ...x, stats: stats[x.user_id] || { avg_rating: 0, review_count: 0, lessons: 0 } })));
    })();
  }, []);

  const shown = useMemo(() => {
    if (!tutors) return [];
    const needle = q.trim().toLowerCase();
    return tutors
      .filter((t) => exam === "Any" || t.exams.includes(exam))
      .filter((t) => t.hourly_rate <= maxRate)
      .filter((t) => !needle || [t.profile?.display_name, t.headline, t.bio, t.credentials, ...t.subjects].join(" ").toLowerCase().includes(needle))
      .sort((a, b) =>
        sort === "price" ? a.hourly_rate - b.hourly_rate
          : sort === "lessons" ? b.stats.lessons - a.stats.lessons
          : (b.stats.avg_rating - a.stats.avg_rating) || (b.stats.review_count - a.stats.review_count));
  }, [tutors, q, exam, maxRate, sort]);

  return (
    <section>
      <div className="pagehead">
        <div><h2>Find a tutor</h2><p className="lede">Nurses and educators who've been where you are. Browse by exam and subject, read reviews, and request a lesson time.</p></div>
        <div className="row tight">
          <Link className="btn ghost small" to="/lessons">My lessons</Link>
          {profile?.role === "tutor" && <Link className="btn ghost small" to="/account#tutor">Edit my tutor profile</Link>}
        </div>
      </div>

      <div className="filters card">
        <input type="search" placeholder="Search subjects, e.g. pharmacology, ECGs, dosage calc" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tutors" />
        <div className="filterrow">
          <label className="inline">Exam
            <select value={exam} onChange={(e) => setExam(e.target.value)}>
              <option>Any</option>{EXAM_NAMES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="inline">Up to ${maxRate}/hr
            <input type="range" min="10" max="150" step="5" value={maxRate} onChange={(e) => setMaxRate(+e.target.value)} />
          </label>
          <label className="inline">Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="rating">Top rated</option><option value="price">Lowest price</option><option value="lessons">Most lessons</option>
            </select>
          </label>
        </div>
      </div>

      {tutors === null ? <p className="note">Loading tutors…</p> : shown.length === 0 ? (
        <div className="empty">{tutors.length ? "No tutors match those filters. Try widening the price or clearing the search." : "No tutors have joined yet. Tutors can sign up and publish a profile from their account page."}</div>
      ) : (
        <div className="list">
          {shown.map((t) => (
            <article key={t.user_id} className="card tutorcard">
              <Avatar id={t.user_id} name={t.profile?.display_name} size={64} />
              <div className="tc-main">
                <div className="tc-top">
                  <div>
                    <Link to={`/tutors/${t.user_id}`} className="tc-name">{t.profile?.display_name || "Tutor"}</Link>
                    {t.headline && <div className="tc-headline">{t.headline}</div>}
                  </div>
                  <div className="tc-price"><strong>${t.hourly_rate}</strong><span className="meta">per hour</span></div>
                </div>
                <div className="tc-meta">
                  <Stars value={t.stats.avg_rating} count={t.stats.review_count} />
                  <span className="meta">{t.stats.lessons} lesson{t.stats.lessons === 1 ? "" : "s"}</span>
                  {t.credentials && <span className="meta">{t.credentials}</span>}
                </div>
                <div className="tags">{t.exams.map((x) => <span className="tag exam" key={x}>{x}</span>)}{t.subjects.slice(0, 6).map((s) => <span className="tag" key={s}>{s}</span>)}</div>
                {t.bio && <p className="tc-bio">{t.bio}</p>}
                <div className="row tight">
                  <Link className="btn small" to={`/tutors/${t.user_id}#book`}>Book a lesson</Link>
                  <Link className="btn ghost small" to={`/tutors/${t.user_id}`}>View profile</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
