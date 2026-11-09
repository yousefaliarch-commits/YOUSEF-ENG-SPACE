// =====================================================================
//  A figure that rolls to its new value: only the characters that changed move (up when the number grew, down when it
//  shrank), a 240 ms transform + opacity slide — the result of an edit is seen arriving, not just replaced.
//  · The DOM text is exactly the value (one inline span per character, nothing hidden), so copying, search, assistive tech
//    and the tests read «1,962,000.00», never a strip of digits.
//  · Each character is keyed by its place counted from the END (units stay units when 9.5 becomes 10.5), and a span keeps
//    the direction it arrived with, so an unchanged digit never replays.
//  · Only a figure is split (digits, separators, signs, Latin units): Arabic letters join their neighbours, so a word is
//    always one text node. Nothing moves on the first paint or under prefers-reduced-motion (styles/app.css → .roll-d).
// =====================================================================
import { useEffect, useRef } from "react";

// the number inside a formatted figure («1,962,000.00» → 1962000, «−3.5» → −3.5); null when it is not a number
export function figureValue(s: string): number | null {
  const t = String(s ?? "").replace(/[٬,\s]/g, "").replace(/[−–]/g, "-");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// which way a change reads: up for a larger number, down for a smaller one, none when it cannot be compared
export function rollDirection(prev: string | null, next: string): "up" | "down" | "none" {
  if (prev == null || prev === next) return "none";
  const a = figureValue(prev);
  const b = figureValue(next);
  if (a == null || b == null || a === b) return "none";
  return b > a ? "up" : "down";
}

// one character; the class it mounted with stays for its whole life (a later change of direction must not replay it)
function RollChar({ ch, dir }: { ch: string; dir: "up" | "down" | "none" }) {
  const born = useRef(dir);
  const cls = born.current === "none" ? "roll-d" : `roll-d roll-${born.current}`;
  return <span className={cls}>{ch}</span>;
}

// digits, separators, signs and plain Latin: safe to draw one character per box (no joining, no reordering)
export const isFigure = (s: string) => /^[\d\s.,:+\-−–%/×()A-Za-z°#]*$/.test(s);

export function RollNumber({ value }: { value: string }) {
  const text = String(value ?? "");
  const prev = useRef<string | null>(null);
  const dir = rollDirection(prev.current, text);
  useEffect(() => {
    prev.current = text;
  }, [text]);
  if (!isFigure(text)) return <span data-roll="none">{text}</span>;
  const chars = Array.from(text);
  return (
    <span className="roll" data-roll={dir}>
      {chars.map((ch, i) => (
        <RollChar key={`${chars.length - i}:${ch}`} ch={ch} dir={dir} />
      ))}
    </span>
  );
}
