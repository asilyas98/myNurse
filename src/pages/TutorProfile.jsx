import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabase.js";
import { Avatar, Stars } from "../components/Stars.jsx";
import { useAuth } from "../lib/auth.jsx";

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function TutorProfile() {
  const { id } = useParams();
  const { session } = useAuth();
  const [t, setT] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [contact, setContact] = useState(null);
  const [mine, setMine] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    const [tt, st, rv, ct, bk] = await Promise.all([
      supabase.from("tutors").select("*, profile:profiles!tutors_user_id_fkey(display_name)").eq("user_id", id).maybeSingle(),
      supabase.from("tutor_stats").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("reviews").select("*, student:profiles!reviews_student_id_fkey(display_name)").eq("tutor_id", id).order("created_at", { ascending: false }).limit(30),
      supabase.rpc("get_tutor_contact", { tutor: id }),
      supabase.from("bookings").select("*").eq("tutor_id", id).eq("student_id", session.user.id).order("start_at", { ascending: false }).limit(5),
    ]);
    if (!tt.data) { setErr("This tutor profile isn't available."); return; }
    setT(tt.data); setStats(st.data || { avg_rating: 0, review_count: 0, lessons: 0 });
    setReviews(rv.data || []); setContact(ct.data || null); setMine(bk.data || []);
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  useEffect(() => {
    if (t && window.location.hash === "#book") document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  }, [t]);

  if (err) return <div className="card"><p className="err">{err}</p><Link to="/tutors">Back to tutors</Link></div>;
  if (!t) return <p className="note">Loading…</p>;
  const isSelf = t.user_id === session.user.id;
  const name = t.profile?.display_name || "Tutor";

  return (
    <section>
      <Link to="/tutors" className="backlink">← All tutors</Link>
      <div className="profilegrid">
        <div>
          <div className="card profilehead">
            <Avatar id={t.user_id} name={name} size={84} />
            <div>
              <h2>{name}</h2>
              {t.headline && <p className="tc-headline">{t.headline}</p>}
              <div className="tc-meta">
                <Stars value={stats.avg_rating} count={stats.review_count} />
                <span className="meta">{stats.lessons} lessons</span>
                {t.years_experience > 0 && <span className="meta">{t.years_experience} yrs experience</span>}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>About</h3>
            {t.credentials && <p className="meta">{t.credentials}</p>}
            <p className="prewrap">{t.bio || "This tutor hasn't written a bio yet."}</p>
            <dl className="facts">
              <dt>Exams</dt><dd>{t.exams.join(", ") || "—"}</dd>
              <dt>Subjects</dt><dd>{t.subjects.join(", ") || "—"}</dd>
              <dt>Languages</dt><dd>{t.languages || "—"}</dd>
              <dt>Availability</dt><dd>{t.availability || "Ask in your request"}</dd>
            </dl>
          </div>

          <div className="card">
            <h3>Reviews</h3>
            {reviews.length === 0 ? <p className="note">No reviews yet. Students can leave one after a completed lesson.</p> : (
              <div className="reviews">
                {reviews.map((r) => (
                  <div key={r.booking_id} className="reviewitem">
                    <div className="row tight"><Stars value={r.rating} /><strong>{r.student?.display_name || "Student"}</strong><span className="meta">{new Date(r.created_at).toLocaleDateString()}</span></div>
                    {r.comment && <p>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside id="book">
          <div className="card sticky">
            <div className="tc-price big"><strong>${t.hourly_rate}</strong><span className="meta">per hour</span></div>
            {contact && <p className="callout ok-c">Your lesson is confirmed. Reach {name} at: <strong>{contact}</strong></p>}
            {mine.length > 0 && (
              <div className="minebookings">
                <p className="meta">Your requests with {name}:</p>
                {mine.map((b) => <div key={b.id} className="meta">• {new Date(b.start_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} — <StatusPill s={b.status} /></div>)}
              </div>
            )}
            {isSelf ? <p className="note">This is how students see your profile. <Link to="/account#tutor">Edit it</Link>.</p> : <BookingForm tutor={t} name={name} onBooked={load} />}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function StatusPill({ s }) {
  const label = { pending: "Waiting for tutor", accepted: "Confirmed", declined: "Declined", cancelled: "Cancelled", completed: "Completed" }[s] || s;
  const cls = { pending: "open", accepted: "taken", completed: "taken" }[s] || "muted";
  return <span className={"status " + cls}>{label}</span>;
}

function BookingForm({ tutor, name, onBooked }) {
  const { session } = useAuth();
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setMinutes(0, 0, 0); tomorrow.setHours(18);
  const [f, setF] = useState({ start: toLocalInput(tomorrow), duration: 60, topic: "", message: "", contact: session.user.email || "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const cost = ((tutor.hourly_rate * f.duration) / 60).toFixed(2).replace(/\.00$/, "");

  async function submit(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    const start = new Date(f.start);
    if (isNaN(start) || start <= new Date()) return setErr("Pick a time in the future.");
    if (!f.topic.trim()) return setErr("Tell the tutor what you want to work on.");
    setBusy(true);
    const { error } = await supabase.from("bookings").insert({
      student_id: session.user.id, tutor_id: tutor.user_id, start_at: start.toISOString(), duration_min: f.duration,
      topic: f.topic.trim().slice(0, 120), message: f.message.trim().slice(0, 800), student_contact: f.contact.trim().slice(0, 160),
    });
    setBusy(false);
    if (error) return setErr("The request didn't send. Try again.");
    setMsg(`Request sent. ${name} will confirm or suggest another time — track it under My lessons.`);
    setF({ ...f, topic: "", message: "" });
    onBooked();
  }

  return (
    <form onSubmit={submit}>
      <h3>Request a lesson</h3>
      <label htmlFor="b-start">Date & time <span className="meta">(your time zone)</span></label>
      <input id="b-start" type="datetime-local" value={f.start} min={toLocalInput(new Date())} onChange={(e) => setF({ ...f, start: e.target.value })} />
      <label>Length</label>
      <div className="seg compact">
        {[30, 60, 90].map((d) => (
          <label key={d} className={f.duration === d ? "on" : ""}>
            <input type="radio" name="dur" checked={f.duration === d} onChange={() => setF({ ...f, duration: d })} />{d} min
          </label>
        ))}
      </div>
      <label htmlFor="b-topic">What do you want to work on?</label>
      <input id="b-topic" type="text" maxLength={120} placeholder="e.g. NCLEX prioritization questions" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
      <label htmlFor="b-msg">Message <span className="meta">(optional)</span></label>
      <textarea id="b-msg" maxLength={800} placeholder="Your exam date, what's been hard, how you learn best" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      <label htmlFor="b-contact">How should the tutor reach you?</label>
      <input id="b-contact" type="text" maxLength={160} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
      <p className="meta">Estimated ${cost} for {f.duration} minutes. You arrange payment directly with the tutor.</p>
      <button className="btn full" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="err">{err}</p>}
    </form>
  );
}
