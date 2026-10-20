// «المهندس الذكي» — the structured outputs (Gemini responseSchema, an OpenAPI subset). The app validates and clamps every field
// again on arrival (src/services/ai-cv.ts, ai-forms.ts): a schema shapes the answer, it does not make it trustworthy.

const S = (description?: string) => ({ type: "STRING", ...(description ? { description } : {}) });
const I = (description?: string) => ({ type: "INTEGER", ...(description ? { description } : {}) });
const E = (values: string[]) => ({ type: "STRING", enum: values });
const A = (items: unknown, description?: string) => ({ type: "ARRAY", items, ...(description ? { description } : {}) });
const O = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({ type: "OBJECT", properties, required });

const CV_DOC = O({
  headline: S("title line under the name"),
  personal: A(S(), "personal lines: date of birth, marital status, nationality, military status — only what the CV states"),
  summary: S(),
  sections: A(O({
    id: E(["experience", "training", "projects", "grad", "education", "skills", "certs", "languages"]),
    title: S(),
    items: A(O({ head: S("role line: title — employer — city · dates; empty for plain lines"), lines: A(S()) })),
  })),
});

export const CV_REVIEW_SCHEMA = O({
  pillars: A(O({ id: E(["software", "scope", "track", "codes", "ats"]), pts: { type: "NUMBER" }, why: S() })),
  projectedScore: I("0–100, with facts the CV already has"),
  verdict: S("one short status line"),
  reviewers: A(O({
    id: E(["screen", "manager", "recruiter", "teammate"]),
    verdict: E(["pass", "maybe", "reject"]),
    score: I(),
    findings: A(O({ issue: S(), severity: E(["critical", "high", "rec"]), cvLine: S("exact CV line or empty"), fix: S() })),
  })),
  top3: A(O({ issue: S(), severity: E(["critical", "high", "rec"]), fix: S(), reviewer: E(["screen", "manager", "recruiter", "teammate"]) })),
  interviewQuestions: A(O({ question: S(), why: S(), howToAnswer: S() })),
  honestyLine: S(),
  inconsistencies: A(S()),
  knownProjects: A(O({ name: S(), context: S(), confidence: E(["high", "medium", "low"]) })),
  rebuilt: O({ en: CV_DOC, ar: CV_DOC }),
}, ["pillars", "projectedScore", "verdict", "reviewers", "top3", "interviewQuestions", "honestyLine", "rebuilt"]);

const ROWS = (props: Record<string, unknown>) => A(O(props));

export const FORM_SCHEMAS: Record<string, unknown> = {
  rfi: O({
    title: S(), discipline: S(), location: S("area / level / grid"), description: S("the question, precise and complete"),
    references: A(S(), "drawings, specification clauses, prior RFIs named in the description; slots where unknown"),
    proposedSolution: S("the contractor's proposal if the description has one, else empty"),
    impact: S("time / cost impact if stated, else empty"), responseNeededDays: I(),
  }, ["title", "discipline", "location", "description", "references", "proposedSolution", "impact", "responseNeededDays"]),
  submittal: O({
    title: S(), material: S(), manufacturer: S(), model: S("model / series / grade"), origin: S(),
    specs: ROWS({ property: S(), value: S() }), areaOfUse: S(), quantity: S(), specReference: S(),
    attachments: A(S(), "documents that should accompany the submittal (datasheet, test certificates, samples…)"),
    remarks: S(),
  }),
  custody: O({
    from: S(), to: S(), purpose: S(),
    items: ROWS({ description: S(), qty: { type: "NUMBER" }, unit: S(), condition: E(["new", "good", "fair", "needs repair"]), serial: S() }),
    remarks: S(),
  }),
  toolbox: O({
    topic: S(), activity: S(), hazards: A(S()), precautions: A(S()), ppe: A(S()),
    emergency: A(S()), keyMessage: S("one sentence the crew should remember"),
  }),
  permit: O({
    type: E(["hot", "excavation", "height", "confined", "electrical", "lifting", "general"]),
    location: S(), description: S(), durationHours: { type: "NUMBER" },
    hazards: A(S()), precautions: A(S()), ppe: A(S()), gasTest: { type: "BOOLEAN" }, fireWatch: { type: "BOOLEAN" },
    approvals: A(S(), "roles that must sign"),
  }),
};
