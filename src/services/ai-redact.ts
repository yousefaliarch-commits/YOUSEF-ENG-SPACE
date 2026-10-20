// «المهندس الذكي» — what leaves the phone when a CV is reviewed by the AI (docs/AI.md → privacy).
// The name, e-mail, phones, LinkedIn, street address and national ID are replaced by tokens BEFORE the text is sent; the model
// writes the rebuilt CV with the tokens and the app puts the real values back on the device. Employers, projects, titles and
// dates stay — they are what a review is about. The national ID never comes back (the rebuilt CV drops it).
export type Redaction = { text: string; values: Record<string, string>; hadNationalId: boolean };

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s·|,؛;)]+/gi;
const NATIONAL_ID = /(?<!\d)[23]\d{13}(?!\d)/g;
// phone numbers: a run that starts with + / 00 / 0 and holds 9+ digits, whatever the spacing (dates use «/» and never match)
const PHONE = /(?:\+|00)\d[\d\s()-]{7,16}\d|(?<![\d/.])0\d[\d\s()-]{7,13}\d(?![\d/])/g;
const ADDRESS = /^(?:address|العنوان(?: التفصيلي)?|عنوان السكن)\s*[:：].*$/gim;

export function redactCV(text: string, name?: string): Redaction {
  const values: Record<string, string> = {};
  let t = String(text || "");
  const keep = (token: string, v: string) => {
    if (!values[token]) values[token] = v.trim();
    return `{{${token}}}`;
  };
  const hadNationalId = NATIONAL_ID.test(t);
  NATIONAL_ID.lastIndex = 0;
  t = t.replace(NATIONAL_ID, "{{NATIONAL_ID}}");
  t = t.replace(EMAIL, (m) => keep("EMAIL", m));
  t = t.replace(LINKEDIN, (m) => keep("LINKEDIN", m));
  t = t.replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 9 ? keep("PHONE", m) : m));
  t = t.replace(ADDRESS, (m) => {
    keep("ADDRESS", m.replace(/^[^:：]+[:：]\s*/, ""));
    return m.replace(/([:：]\s*).*$/, "$1{{ADDRESS}}");
  });
  const nm = String(name || "").trim();
  if (nm.length >= 3) {
    const esc = nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(esc, "g"), () => keep("NAME", nm));
  }
  return { text: t, values, hadNationalId };
}

// the real values back into what the model wrote; a token with no value (and the national ID) is removed cleanly
export function restore(s: string, values: Record<string, string>): string {
  return String(s || "")
    .replace(/\{\{(NAME|EMAIL|PHONE|LINKEDIN|ADDRESS|NATIONAL_ID)\}\}/g, (_m, k) => (k === "NATIONAL_ID" ? "" : values[k] || ""))
    .replace(/(\s*·\s*){2,}/g, " · ")
    .replace(/^\s*·\s*|\s*·\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// nothing identifying slipped through (used by the tests and as a last check before sending)
export function leaks(text: string, values: Record<string, string>): string[] {
  return Object.entries(values).filter(([, v]) => v && v.length >= 3 && text.includes(v)).map(([k]) => k);
}
