export function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value || "No"} rating${count != null ? `, ${count} reviews` : ""}`}>
      <span aria-hidden="true">{"★".repeat(full)}<span className="dim">{"★".repeat(5 - full)}</span></span>
      {count != null && <span className="meta"> {value ? Number(value).toFixed(1) : "New"}{count ? ` · ${count}` : ""}</span>}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="starinput" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={n <= value ? "on" : ""} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}

const PALETTE = ["#3B6BC4", "#C4473B", "#237A5A", "#7A4BC4", "#B07318", "#1F7F8C"];
export const colorFor = (id = "") => PALETTE[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
export function Avatar({ id, name, size = 34 }) {
  return (
    <span className="avatar" style={{ background: colorFor(id), width: size, height: size, fontSize: size * 0.42 }}>
      {(name || "N").trim()[0]?.toUpperCase()}
    </span>
  );
}
