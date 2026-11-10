import { useState } from "react";
import { questionOfTheDay } from "../lib/exams.js";

const L = "ABCDEF";

export default function QOTD({ exam, compact = false }) {
  const q = questionOfTheDay(exam);
  const [sel, setSel] = useState([]);
  const [done, setDone] = useState(false);
  const right = done && [...sel].sort().join() === [...q.answers].sort().join();
  const pick = (i) => !done && setSel(q.type === "sata" ? (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]) : [i]);
  return (
    <div className={"card qotd" + (compact ? " compact" : "")}>
      <p className="qtopic"><span className="pill red">Question of the day</span> {q.exam} · {q.subject}</p>
      <p className="qstem">{q.stem}</p>
      <ul className="opts">
        {q.options.map((o, i) => {
          let cls = "opt" + (q.type === "sata" ? " multi" : "");
          if (done && q.answers.includes(i)) cls += " right"; else if (done && sel.includes(i)) cls += " wrong";
          return <li key={i}><button className={cls} aria-pressed={sel.includes(i)} disabled={done} onClick={() => pick(i)}><span className="k">{L[i]}</span><span>{o}</span></button></li>;
        })}
      </ul>
      {done && <div className={"rationale" + (right ? "" : " miss")}><strong>{right ? "Correct." : `The answer is ${q.answers.map((a) => L[a]).join(", ")}.`}</strong> {q.rationale}</div>}
      {!done && <div className="row"><button className="btn" disabled={!sel.length} onClick={() => setDone(true)}>Check answer</button></div>}
    </div>
  );
}
