export type RelevanceCandidate = {
  key: string;
  firstName: string;
  lastName: string;
  position: string | null;
  company: string | null;
};

export type RelevanceResult = {
  key: string;
  cohort: "PERFECT_MATCH" | "NOT_FOR_PROVEN" | "UNCERTAIN";
  reason: string;
};

const PERFECT_MATCH_KEYWORDS = [
  // Recruiting / staffing / search
  "recruit", // covers recruiter, recruitment, recruiting
  "talent", // broad on purpose — talent acquisition/partner/advisor/engineering, per Marco
  "headhunt",
  "executive search",
  "retained search",
  "talent search",
  "recruitment search",
  "search firm",
  "search & selection",
  "search and selection",
  "staffing",
  "sourcing",
  "headcount",
  // HR / people
  "hr", // bare, per Marco — specialist/consultant/generalist/manager/director/business partner all roll up to this
  "human resources",
  "people partner",
  "people operations",
  "people & culture",
  "people and culture",
  "chief people officer",
  "head of people",
  "vp people",
  "vp hr",
  "hiring manager",
  "employer brand",
  "workforce planning",
  // Career coaching
  "career",
  "coach",
  // Agile / Scrum / project management — maps to Notion's "Professional" segment
  "scrum",
  "agile",
  "project manager",
  "program manager",
  "product owner",
  "pmp",
];

const NOT_FOR_PROVEN_KEYWORDS = [
  "software engineer",
  "developer",
  "designer",
  "accountant",
  "marketing",
  "sales representative",
  "account executive",
  "nurse",
  "physician",
  "teacher",
  "professor",
  "student",
  "founder",
  "artist",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Leading word-boundary only (not both ends) — blocks mid-word false hits like "hr"
// inside "Chrome", while still matching natural suffixes like "recruiter" from "recruit"
// or "careers" from "career".
function matchesAny(text: string, keywords: string[]): string | null {
  return keywords.find((k) => new RegExp(`\\b${escapeRegExp(k)}`, "i").test(text)) ?? null;
}

/**
 * Free, rule-based stand-in for an AI classifier: keyword-matches job title
 * and company against PROVEN's known segments. Blunter than a real relevance
 * judgment — genuinely ambiguous titles fall into UNCERTAIN for manual review.
 */
export function classifyRelevance(candidates: RelevanceCandidate[]): RelevanceResult[] {
  return candidates.map((c) => {
    const text = `${c.position ?? ""} ${c.company ?? ""}`.toLowerCase();

    const perfectHit = matchesAny(text, PERFECT_MATCH_KEYWORDS);
    if (perfectHit) {
      return { key: c.key, cohort: "PERFECT_MATCH", reason: `matched "${perfectHit}"` };
    }

    const excludeHit = matchesAny(text, NOT_FOR_PROVEN_KEYWORDS);
    if (excludeHit) {
      return { key: c.key, cohort: "NOT_FOR_PROVEN", reason: `matched "${excludeHit}"` };
    }

    return { key: c.key, cohort: "UNCERTAIN", reason: "no clear keyword match" };
  });
}

// A company itself being a staffing/search/recruiting firm — checked against the
// COMPANY name, not the title, since "Recruiter at Randstad" (Agency) and "Recruiter
// at Novartis" (in-house, Corporate HR) need the same title to mean different things.
const AGENCY_COMPANY_KEYWORDS = [
  "recruit",
  "staffing",
  "headhunt",
  "executive search",
  "talent solutions",
  "talent partners",
  "search & selection",
  "search and selection",
  "search firm",
  " search", // e.g. "Acme Search", "Acme Executive Search"
  "personnel",
  "hr solutions",
];

const HR_KEYWORDS = [
  "hr",
  "human resources",
  "people partner",
  "people operations",
  "chief people officer",
  "head of people",
  "vp people",
  "vp hr",
  "hiring manager",
  "employer brand",
  "workforce planning",
];

const CAREER_COACH_KEYWORDS = ["career coach", "career coaching", "coach"];

const PROFESSIONAL_KEYWORDS = ["scrum", "agile", "project manager", "program manager", "product owner", "pmp"];

/**
 * Best-guess Notion company segment for a newly-created contact's company.
 * Deliberately just a starting point — shown as an editable dropdown, not applied blindly.
 */
export function guessSegment(candidate: { position: string | null; company: string | null }): string {
  const companyText = (candidate.company ?? "").toLowerCase();
  const positionText = (candidate.position ?? "").toLowerCase();

  if (matchesAny(companyText, AGENCY_COMPANY_KEYWORDS)) return "Agency";
  if (matchesAny(positionText, ["recruit", "talent", "headhunt", "sourcing"])) return "Corporate HR";
  if (matchesAny(positionText, HR_KEYWORDS)) return "Corporate HR";
  if (matchesAny(positionText, CAREER_COACH_KEYWORDS)) return "Career coach";
  if (matchesAny(positionText, PROFESSIONAL_KEYWORDS)) return "Professional";
  return "?";
}
