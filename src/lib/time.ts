// Migrated from the prototype part(s): app_3_screens


// =====================================================================
//  Screens — tabs
// =====================================================================
// Relative-time strings in the seed data → minutes, so every list can sort by recency the same way (audit: one ordering rule everywhere)
export const AR_COUNT = { "يوم": 1, "يومين": 2, "أسبوع": 1, "أسبوعين": 2, "ساعة": 1, "ساعتين": 2, "دقيقة": 1, "شهر": 1 };

export function whenMinutes(w) {
  if (!w || /الآن/.test(w)) return 0; if (/^اليوم/.test(w)) return 30;
  const m = /منذ\s+(\d+)?\s*(دقائق|دقيقة|ساعتين|ساعات|ساعة|يومين|يومًا|أيام|يوم|أسبوعين|أسابيع|أسبوع|شهور|شهر)/.exec(w); if (!m) return 99999;
  const n = m[1] ? Number(m[1]) : (AR_COUNT[m[2]] || 1); const u = m[2];
  return /دقيق/.test(u) ? n : /ساع/.test(u) ? n * 60 : /يوم|أيام/.test(u) ? n * 1440 : /أسبوع|أسابيع/.test(u) ? n * 10080 : n * 43200;
}

export const byNewest = (a, b) => whenMinutes(a.when) - whenMinutes(b.when);
