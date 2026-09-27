import {
  Monitor, Moon, Sun
} from "lucide-react";

// =====================================================================
//  Tokens
// =====================================================================
export const ACCENTS = {
  indigo:  { name: "إنديغو", en: "Luminous indigo", color: "#A89CFF", colorLight: "#5B4BC9", solid: "#7060D2", hover: "#6251C0", wash: "#28253B", washLight: "#EEEBFF",
             rgb: { accent: "168 156 255", solid: "112 96 210", solidHi: "128 112 226", hover: "98 81 192", wash: "40 37 59" },
             light: { accent: "91 75 201", solid: "112 96 210", solidHi: "128 112 226", hover: "98 81 192", wash: "238 235 255" } },
  emerald: { name: "زمردي", en: "Quiet emerald", color: "#80DFC0", colorLight: "#146E54", solid: "#26765D", hover: "#1D654E", wash: "#20332E", washLight: "#E2F5EE",
             rgb: { accent: "128 223 192", solid: "38 118 93", solidHi: "48 138 110", hover: "29 101 78", wash: "32 51 46" },
             light: { accent: "20 110 84", solid: "38 118 93", solidHi: "48 138 110", hover: "29 101 78", wash: "226 245 238" } },
  cyan:    { name: "سماوي", en: "Soft cyan", color: "#89DCEB", colorLight: "#19697A", solid: "#286E7B", hover: "#205C67", wash: "#213237", washLight: "#E0F2F6",
             rgb: { accent: "137 220 235", solid: "40 110 123", solidHi: "52 128 142", hover: "32 92 103", wash: "33 50 55" },
             light: { accent: "25 105 122", solid: "40 110 123", solidHi: "52 128 142", hover: "32 92 103", wash: "224 242 246" } },
};

export const labelOf = (list?: any, id?: any) => (list.find((x) => x[0] === id) || list[0])[1];

export const THEMES: any = [["system", "تلقائي", Monitor], ["light", "فاتح", Sun], ["dark", "داكن", Moon]];

export const accentHex = (a?: any, mode?: any) => (mode === "light" ? a.colorLight : a.color);

export const NEUTRALS = {
  dark: [["Canvas", "#09090B", "الخلفية · zinc-950"], ["Surface", "#18181B", "البطاقات · zinc-900"], ["Elevated", "#27272A", "الارتفاع · zinc-800"], ["Border", "#FFFFFF0F", "الحدود · white/6"], ["Text", "#F4F4F5", "النص الأساسي"], ["Muted", "#A1A1AA", "النص الثانوي"]],
  light: [["Canvas", "#FAFAFA", "الخلفية · zinc-50"], ["Surface", "#FFFFFF", "البطاقات · أبيض"], ["Elevated", "#F4F4F5", "الارتفاع · zinc-100"], ["Border", "#18181B14", "الحدود · black/8"], ["Text", "#18181B", "النص الأساسي"], ["Muted", "#52525B", "النص الثانوي"]],
};

export const DISCIPLINES = {
  civil:        { label: "مهندس مدني",     median: 24500, min: 18000, max: 32000 },
  architecture: { label: "مهندس معماري",   median: 27000, min: 20000, max: 35000 },
  mechanical:   { label: "مهندس ميكانيكا", median: 28500, min: 21000, max: 37000 },
};

export const fmt = (n?: any) => new Intl.NumberFormat("en-US").format(n);
