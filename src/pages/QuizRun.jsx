import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import QuizPlayer from "../components/QuizPlayer.jsx";
import { bankFor, EXAMS, shuffle } from "../lib/exams.js";
import { generateQuestions } from "../api.js";
import { supabase } from "../supabase.js";
import { useAuth } from "../lib/auth.jsx";

export default function QuizRun() {
  const { id } = useParams();
  const { state } = useLocation();
  const { session } = useAuth();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState(null); // { title, questions, timed, exam, subject, quizId }
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState("");
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (id) {
          const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
          if (error || !data) throw new Error("That quiz couldn't be found.");
          if (!data.questions.length) throw new Error("This quiz has no questions yet. Edit it to add some.");
          if (!cancelled) setQuiz({ title: data.title, questions: shuffle(data.questions), timed: data.timed, exam: data.exam, subject: data.subjects.join(", "), quizId: data.id });
          return;
        }
        if (state?.source === "practice") {
          const { exam, subject, count } = state;
          const local = shuffle(bankFor(exam, subject));
          let questions = local.slice(0, count);
          if (session && questions.length < count) {
            setProgress("Writing your questions…");
            const subjects = subject ? [subject] : EXAMS[exam].subjects;
            const fresh = await generateQuestions({
              exam, subjects, count: count - questions.length, difficulty: "mixed",
              avoid: local.map((x) => x.stem),
              onProgress: (d, t) => t > 1 && setProgress(`Writing your questions… ${d} of ${t} sets ready`),
            });
            questions = shuffle([...questions, ...fresh.map((x) => ({ ...x, subject: subject || x.subject }))]);
          }
          if (!questions.length) throw new Error("Sign in to get questions for this subject.");
          if (!cancelled) setQuiz({ title: `${exam} · ${subject || "Mixed practice"}`, questions, timed: false, exam, subject: subject || "Mixed" });
          return;
        }
        if (state?.questions?.length) { setQuiz(state); return; }
        nav("/practice", { replace: true });
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id, state, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveAttempt({ score, total, missed, breakdown, seconds }) {
    setQuiz((qz) => ({ ...qz, missed }));
    if (!session) return;
    await supabase.from("quiz_attempts").insert({
      quiz_id: quiz.quizId || null, title: quiz.title.slice(0, 120), exam: quiz.exam || "", subject: (quiz.subject || "").slice(0, 120), score, total,
      breakdown, seconds: Math.max(0, Math.round(seconds || 0)),
    });
  }

  function exit(kind) {
    if (kind === "retake") { setQuiz((qz) => ({ ...qz, questions: shuffle(qz.questions) })); setRound((r) => r + 1); }
    else if (kind === "missed") { setQuiz((qz) => ({ ...qz, questions: shuffle(qz.missed), title: qz.title + " · missed" })); setRound((r) => r + 1); }
    else nav(quiz?.quizId ? "/quizzes" : "/practice");
  }

  if (err) return <div className="card"><p className="err">{err}</p><button className="btn ghost" onClick={() => nav(-1)}>Go back</button></div>;
  if (!quiz) return <div className="card loadingcard"><span className="pulse-dot" />{progress || "Loading quiz…"}</div>;
  return <QuizPlayer key={round} title={quiz.title} questions={quiz.questions} timed={quiz.timed} onFinish={saveAttempt} onExit={exit} />;
}
