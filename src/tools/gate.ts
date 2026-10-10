// =====================================================================
//  Tool gate — who may open which tool and which tool documents (one answer, used by the tab, push, the render switch,
//  the tool sheet, deep links and the document store)
//  · engineer / owner: every tool · supervisor: every non-money tool · hr: the CV review only (not in the registry).
//  · Staff keep their account role here (staff is a console permission, not a tool role).
// =====================================================================
import { TOOL_REGISTRY, toolById } from "./registry";
import type { ToolDef, ToolRole } from "./types";

export function toolRole(p?: { role?: string } | null): ToolRole {
  const r = p && p.role;
  if (r === "supervisor") return "supervisor";
  if (r === "hr") return "hr";
  if (r === "owner" || r === "company") return "owner";
  return "engineer";
}

export const toolAllowed = (role: ToolRole, id: string | undefined | null) => {
  const t = toolById(id);
  if (!t) return false;
  if (t.money && role === "supervisor") return false;
  return t.roles.includes(role);
};

export const toolsForRole = (role: ToolRole): ToolDef[] => TOOL_REGISTRY.filter((t) => toolAllowed(role, t.id));

// the document kinds a role may see anywhere (headers, search, Today, backup): money kinds disappear for supervisors
export const toolKindsForRole = (role: ToolRole): string[] =>
  toolsForRole(role).flatMap((t) => t.docKinds || []);

// stack entries owned by the tools: { type: "tool", id } and { type: "tooldoc", id: "<kind>:<docId|new>" }
export function toolOfStack(e: { type: string; id?: string }): string | null {
  if (e.type === "tool") return e.id || "";
  if (e.type === "tooldoc") return String(e.id || "").split(":")[0];
  return null;
}
