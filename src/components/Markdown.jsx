// Tiny, safe markdown renderer: paragraphs, "- " bullets, **bold**. No HTML injection.
function inline(text, keyBase) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={keyBase + i}>{part.slice(2, -2)}</strong> : part
  );
}

export default function Markdown({ text }) {
  const blocks = [];
  let para = [], list = [];
  const flushPara = () => { if (para.length) { blocks.push({ type: "p", lines: para }); para = []; } };
  const flushList = () => { if (list.length) { blocks.push({ type: "ul", lines: list }); list = []; } };
  for (const raw of String(text || "").split("\n")) {
    const l = raw.trim();
    if (/^[-*•]\s+/.test(l)) { flushPara(); list.push(l.replace(/^[-*•]\s+/, "")); }
    else if (!l) { flushPara(); flushList(); }
    else { flushList(); para.push(l.replace(/^#+\s*/, "")); }
  }
  flushPara(); flushList();
  return blocks.map((b, i) =>
    b.type === "ul" ? (
      <ul key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l, `${i}-${j}-`)}</li>)}</ul>
    ) : (
      <p key={i}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l, `${i}-${j}-`)}</span>)}</p>
    )
  );
}
