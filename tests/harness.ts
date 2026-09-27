// Loads every app module into one lookup object C (name → export), the way the prototype suites saw the page's single scope,
// plus the app's source text for the static checks. Globals come first, so module top levels see a page-like environment.
import { store, localStorage } from "./setup-globals";
const modules = import.meta.glob(["../src/**/*.{ts,tsx}", "!../src/main.tsx", "!../src/types/**"], { eager: true }) as Record<string, Record<string, any>>;
const sources = import.meta.glob(["../src/**/*.{ts,tsx}", "!../src/types/**"], { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
export const C: Record<string, any> = Object.assign({}, ...Object.keys(modules).sort().map((k) => modules[k]));
export const src = Object.keys(sources).sort().map((k) => sources[k]).join("\n");
export const html = src;
export { store, localStorage };
