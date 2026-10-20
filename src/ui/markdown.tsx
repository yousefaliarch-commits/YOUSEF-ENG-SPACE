// =====================================================================
//  The Smart Engineer's answers as rich text — a small Markdown subset parsed into React elements (never innerHTML, so
//  nothing the model writes can run): headings, paragraphs, bullet / numbered lists, tables, code blocks, inline `code`,
//  **bold**, *italic*, and «⚠️» lines as a warning callout. Streaming-safe: an unfinished table or code fence renders as
//  what has arrived so far.
// =====================================================================
import type { ReactNode } from "react";

export type MdBlock =
  | { t: "h"; level: 1 | 2 | 3; text: string }
  | { t: "p"; text: string }
  | { t: "warn"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[]; start: number }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "code"; text: string }
  | { t: "hr" };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
const isRule = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*(\d{1,3})[.)]\s+(.*)$/;

export function parseMd(src: string): MdBlock[] {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const out: MdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: "p", text: para.join(" ") });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const s = line.trim();
    if (!s) {
      flush();
      continue;
    }
    if (s.startsWith("```")) {
      flush();
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) body.push(lines[i]);
      out.push({ t: "code", text: body.join("\n") });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(s);
    if (h) {
      flush();
      out.push({ t: "h", level: Math.min(3, h[1].length) as 1 | 2 | 3, text: h[2].replace(/\s*#+\s*$/, "") });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(s)) {
      flush();
      out.push({ t: "hr" });
      continue;
    }
    // a table: a «| a | b |» line followed by its «|---|---|» rule
    if (s.includes("|") && i + 1 < lines.length && isRule(lines[i + 1])) {
      flush();
      const head = cells(s);
      const rows: string[][] = [];
      for (i += 2; i < lines.length && lines[i].trim().includes("|") && lines[i].trim(); i++) rows.push(cells(lines[i]));
      i--;
      out.push({ t: "table", head, rows });
      continue;
    }
    if (/^(⚠️|⚠)/.test(s)) {
      flush();
      out.push({ t: "warn", text: s.replace(/^(⚠️|⚠)\s*/, "") });
      continue;
    }
    if (BULLET.test(line)) {
      flush();
      const items: string[] = [];
      for (; i < lines.length && BULLET.test(lines[i]); i++) items.push((BULLET.exec(lines[i]) as RegExpExecArray)[1]);
      i--;
      out.push({ t: "ul", items });
      continue;
    }
    if (NUMBER.test(line)) {
      flush();
      const items: string[] = [];
      const start = Number((NUMBER.exec(line) as RegExpExecArray)[1]) || 1;
      for (; i < lines.length && NUMBER.test(lines[i]); i++) items.push((NUMBER.exec(lines[i]) as RegExpExecArray)[2]);
      i--;
      out.push({ t: "ol", items, start });
      continue;
    }
    para.push(s);
  }
  flush();
  return out;
}

// inline: `code`, **bold**, *italic* (numbers stay in reading order because the bubble isolates its direction)
export function inline(text: string, key = ""): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (tok.startsWith("`")) parts.push(<code key={k} dir="ltr" className="md-code">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("**")) parts.push(<strong key={k} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else parts.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseMd(text);
  return (
    <div className={`md ${className}`} translate="no" dir="auto">
      {blocks.map((b, i) => {
        const k = String(i);
        if (b.t === "h") {
          const cls = b.level === 1 ? "text-[15.5px]" : b.level === 2 ? "text-[14.5px]" : "text-[13.5px]";
          return <p key={k} dir="auto" className={`md-h ${cls} font-semibold`}>{inline(b.text, k)}</p>;
        }
        if (b.t === "p") return <p key={k} dir="auto">{inline(b.text, k)}</p>;
        if (b.t === "warn") {
          return (
            <p key={k} dir="auto" className="md-warn" role="note">
              <span aria-hidden="true">⚠️</span> <span>{inline(b.text, k)}</span>
            </p>
          );
        }
        if (b.t === "ul") return <ul key={k} className="md-ul">{b.items.map((x, j) => <li key={j} dir="auto">{inline(x, `${k}.${j}`)}</li>)}</ul>;
        if (b.t === "ol") return <ol key={k} start={b.start} className="md-ol">{b.items.map((x, j) => <li key={j} dir="auto">{inline(x, `${k}.${j}`)}</li>)}</ol>;
        if (b.t === "code") return <pre key={k} dir="ltr" className="md-pre"><code>{b.text}</code></pre>;
        if (b.t === "hr") return <hr key={k} className="md-hr" />;
        return (
          <div key={k} className="md-table">
            <table>
              <thead>
                <tr>{b.head.map((c, j) => <th key={j} dir="auto">{inline(c, `${k}h${j}`)}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j}>{b.head.map((_c, x) => <td key={x} dir="auto">{inline(r[x] || "", `${k}r${j}.${x}`)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
