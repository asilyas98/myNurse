import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { Avatar, StarInput } from "../components/Stars.jsx";
import { StatusPill } from "./TutorProfile.jsx";

const when = (b) => new Date(b.start_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function Lessons() {
  const { session, profile } = useAuth();
  const me = session.user.id;
  const [rows, setRows] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());
  const [isTutor, setIsTutor] = useState(false);

  const load = useCallback(async () => {
    const [b, r, t] = await Promise.all([
      supabase.from("bookings")
        .select("*, student:profiles!bookings_student_id_fkey(display_name), tutor:tutors!bookings_tutor_id_fkey(profile:profiles!tutors_user_id_fkey(display_name))")
        .order("start_at", { ascending: true }).limit(200),
      supabase.from("reviews").select("booking_id").eq("student_id", me),
      supabase.from("tutors").select("user_id").eq("user_id", me).maybeSingle(),
    ]);
    setRows(b.data || []);
    setReviewed(new Set((r.data || []).map((x) => x.booking_id)));
    setIsTutor(!!t.data);
  }, [me]);

  useEffect(() => {
    load();
    const ch = supabase.channel("my-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function setStatus(id, status) {
    const { error } = await supabase.rpc("set_booking_status", { booking: id, new_status: status });
    if (error) alert(error.message || "That change didn't save.");
    load();
  }

  if (rows === null) return <p className="note">Loading lessons…</p>;
  const asStudent = rows.filter((b) => b.student_id === me);
  const asTutor = rows.filter((b) => b.tutor_id === me);
  const pending = asTutor.filter((b) => b.status === "pending");
  const showTutor = isTutor || asTutor.length > 0 || profile?.role === "tutor";

  return (
    <section>
      <Link to="/tutors" className="backlink">← Tutors</Link>
      <h2>My lessons</h2>
      <p className="lede">Lesson requests and confirmed sessions. Contact details are shared once a tutor confirms.</p>

      {showTutor && (
        <>
          <h3 className="sectionhead">Students' requests {pending.length > 0 && <span className="countbadge">{pending.length} new</span>}</h3>
          {!isTutor && <p className="callout">Publish your tutor profile on <Link to="/account#tutor">your account page</Link> so students can find you.</p>}
          {asTutor.length === 0 ? <p className="note">No lesson requests yet.</p> : (
            <div className="list">
              {asTutor.map((b) => (
                <article key={b.id} className="card lesson">
                  <div className="who"><Avatar id={b.student_id} name={b.student?.display_name} /><div><strong>{b.student?.display_name || "Student"}</strong><div className="meta">{when(b)} · {b.duration_min} min</div></div></div>
                  <p><strong>{b.topic}</strong></p>
                  {b.message && <p className="prewrap">{b.message}</p>}
                  {["accepted", "completed"].includes(b.status) && b.student_contact && <p className="meta">Reach them at: <strong>{b.student_contact}</strong></p>}
                  <div className="row tight">
                    <StatusPill s={b.status} />
                    {b.status === "pending" && <><button className="btn small" onClick={() => setStatus(b.id, "accepted")}>Accept</button><button className="btn ghost small" onClick={() => setStatus(b.id, "declined")}>Decline</button></>}
                    {b.status === "accepted" && <><button className="btn small" onClick={() => setStatus(b.id, "completed")}>Mark completed</button><button className="btn ghost small" onClick={() => setStatus(b.id, "cancelled")}>Cancel</button></>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <h3 className="sectionhead">Lessons I booked</h3>
      {asStudent.length === 0 ? (
        <div className="empty">No lessons yet. <Link to="/tutors">Find a tutor</Link> and request a time that works for you.</div>
      ) : (
        <div className="list">
          {asStudent.map((b) => {
            const tname = b.tutor?.profile?.display_name || "Tutor";
            return (
              <article key={b.id} className="card lesson">
                <div className="who"><Avatar id={b.tutor_id} name={tname} /><div><Link to={`/tutors/${b.tutor_id}`}><strong>{tname}</strong></Link><div className="meta">{when(b)} · {b.duration_min} min</div></div></div>
                <p><strong>{b.topic}</strong></p>
                <div className="row tight">
                  <StatusPill s={b.status} />
                  {b.status === "accepted" && <Link className="btn ghost small" to={`/tutors/${b.tutor_id}`}>See contact info</Link>}
                  {["pending", "accepted"].includes(b.status) && <button className="btn ghost small" onClick={() => confirm("Cancel this lesson?") && setStatus(b.id, "cancelled")}>Cancel</button>}
                </div>
                {b.status === "completed" && !reviewed.has(b.id) && <ReviewForm booking={b} me={me} onDone={load} />}
                {b.status === "completed" && reviewed.has(b.id) && <p className="meta">Thanks for your review.</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewForm({ booking, me, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  async function submit() {
    if (!rating) return setErr("Choose a star rating.");
    const { error } = await supabase.from("reviews").insert({ booking_id: booking.id, tutor_id: booking.tutor_id, student_id: me, rating, comment: comment.trim().slice(0, 800) });
    if (error) return setErr("Your review didn't save. Try again.");
    onDone();
  }
  return (
    <div className="reviewform">
      <p className="meta">How was this lesson?</p>
      <StarInput value={rating} onChange={setRating} />
      <textarea maxLength={800} placeholder="What helped? (optional, shown on their profile)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn small" onClick={submit}>Post review</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
