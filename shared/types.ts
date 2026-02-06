/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/**
 * Cambridge AS & A Level paper code reference data.
 * Each subject has a syllabus code (e.g. 9709 for Mathematics).
 * Each component within a subject has a component number (e.g. 12 = Paper 1 variant 2).
 */

export interface CambridgeComponent {
  /** Component number, e.g. "12" */
  component: string;
  /** Human-readable label */
  label: string;
  /** Internal paper type category */
  paperType: "paper1" | "paper2" | "paper3" | "paper4" | "paper5" | "paper6" | "mcq";
}

export interface CambridgeSubject {
  /** Syllabus code, e.g. "9709" */
  syllabusCode: string;
  /** Subject name */
  label: string;
  /** Internal subject key */
  value: string;
  /** Available components */
  components: CambridgeComponent[];
}

export const CAMBRIDGE_SUBJECTS: CambridgeSubject[] = [
  {
    syllabusCode: "9709",
    label: "Mathematics",
    value: "math",
    components: [
      { component: "11", label: "Pure Mathematics 1 (Variant 1)", paperType: "paper1" },
      { component: "12", label: "Pure Mathematics 1 (Variant 2)", paperType: "paper1" },
      { component: "13", label: "Pure Mathematics 1 (Variant 3)", paperType: "paper1" },
      { component: "21", label: "Pure Mathematics 2 (Variant 1)", paperType: "paper2" },
      { component: "22", label: "Pure Mathematics 2 (Variant 2)", paperType: "paper2" },
      { component: "23", label: "Pure Mathematics 2 (Variant 3)", paperType: "paper2" },
      { component: "31", label: "Pure Mathematics 3 (Variant 1)", paperType: "paper3" },
      { component: "32", label: "Pure Mathematics 3 (Variant 2)", paperType: "paper3" },
      { component: "33", label: "Pure Mathematics 3 (Variant 3)", paperType: "paper3" },
      { component: "41", label: "Mechanics (Variant 1)", paperType: "paper4" },
      { component: "42", label: "Mechanics (Variant 2)", paperType: "paper4" },
      { component: "43", label: "Mechanics (Variant 3)", paperType: "paper4" },
      { component: "51", label: "Probability & Statistics 1 (Variant 1)", paperType: "paper5" },
      { component: "52", label: "Probability & Statistics 1 (Variant 2)", paperType: "paper5" },
      { component: "53", label: "Probability & Statistics 1 (Variant 3)", paperType: "paper5" },
      { component: "61", label: "Probability & Statistics 2 (Variant 1)", paperType: "paper6" },
      { component: "62", label: "Probability & Statistics 2 (Variant 2)", paperType: "paper6" },
      { component: "63", label: "Probability & Statistics 2 (Variant 3)", paperType: "paper6" },
    ],
  },
  {
    syllabusCode: "9702",
    label: "Physics",
    value: "physics",
    components: [
      { component: "11", label: "Multiple Choice (AS) (Variant 1)", paperType: "mcq" },
      { component: "12", label: "Multiple Choice (AS) (Variant 2)", paperType: "mcq" },
      { component: "13", label: "Multiple Choice (AS) (Variant 3)", paperType: "mcq" },
      { component: "21", label: "AS Structured Questions (Variant 1)", paperType: "paper2" },
      { component: "22", label: "AS Structured Questions (Variant 2)", paperType: "paper2" },
      { component: "23", label: "AS Structured Questions (Variant 3)", paperType: "paper2" },
      { component: "31", label: "Advanced Practical Skills (Variant 1)", paperType: "paper3" },
      { component: "32", label: "Advanced Practical Skills (Variant 2)", paperType: "paper3" },
      { component: "41", label: "A Level Structured Questions (Variant 1)", paperType: "paper4" },
      { component: "42", label: "A Level Structured Questions (Variant 2)", paperType: "paper4" },
      { component: "43", label: "A Level Structured Questions (Variant 3)", paperType: "paper4" },
      { component: "51", label: "Planning, Analysis and Evaluation (Variant 1)", paperType: "paper5" },
      { component: "52", label: "Planning, Analysis and Evaluation (Variant 2)", paperType: "paper5" },
    ],
  },
  {
    syllabusCode: "9701",
    label: "Chemistry",
    value: "chemistry",
    components: [
      { component: "11", label: "Multiple Choice (AS) (Variant 1)", paperType: "mcq" },
      { component: "12", label: "Multiple Choice (AS) (Variant 2)", paperType: "mcq" },
      { component: "13", label: "Multiple Choice (AS) (Variant 3)", paperType: "mcq" },
      { component: "21", label: "AS Structured Questions (Variant 1)", paperType: "paper2" },
      { component: "22", label: "AS Structured Questions (Variant 2)", paperType: "paper2" },
      { component: "23", label: "AS Structured Questions (Variant 3)", paperType: "paper2" },
      { component: "31", label: "Advanced Practical Skills (Variant 1)", paperType: "paper3" },
      { component: "32", label: "Advanced Practical Skills (Variant 2)", paperType: "paper3" },
      { component: "41", label: "A Level Structured Questions (Variant 1)", paperType: "paper4" },
      { component: "42", label: "A Level Structured Questions (Variant 2)", paperType: "paper4" },
      { component: "43", label: "A Level Structured Questions (Variant 3)", paperType: "paper4" },
      { component: "51", label: "Planning, Analysis and Evaluation (Variant 1)", paperType: "paper5" },
      { component: "52", label: "Planning, Analysis and Evaluation (Variant 2)", paperType: "paper5" },
    ],
  },
];

/** Exam sessions */
export const EXAM_SESSIONS = [
  "February/March",
  "May/June",
  "October/November",
] as const;

/** Generate year options (current year back to 2015) */
export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 2015; y--) {
    years.push(y);
  }
  return years;
}

/**
 * Build a full paper code string, e.g. "9709/12"
 */
export function buildPaperCode(syllabusCode: string, component: string): string {
  return `${syllabusCode}/${component}`;
}

/**
 * Parse a paper code like "9709/12" into { syllabusCode, component }
 */
export function parsePaperCode(code: string): { syllabusCode: string; component: string } | null {
  const match = code.match(/^(\d{4})\/(\d{2})$/);
  if (!match) return null;
  return { syllabusCode: match[1], component: match[2] };
}

/**
 * Look up subject info from a syllabus code
 */
export function getSubjectBySyllabusCode(syllabusCode: string): CambridgeSubject | undefined {
  return CAMBRIDGE_SUBJECTS.find((s) => s.syllabusCode === syllabusCode);
}

/**
 * Look up component info
 */
export function getComponentInfo(
  syllabusCode: string,
  component: string
): CambridgeComponent | undefined {
  const subject = getSubjectBySyllabusCode(syllabusCode);
  if (!subject) return undefined;
  return subject.components.find((c) => c.component === component);
}

// ─── Legacy helpers (kept for backward compatibility) ───────────────────────

export const SUBJECTS = CAMBRIDGE_SUBJECTS.map((s) => ({
  value: s.value,
  label: s.label,
  syllabusCode: s.syllabusCode,
}));

export const PAPER_TYPES = [
  { value: "paper1", label: "Paper 1" },
  { value: "paper2", label: "Paper 2" },
  { value: "paper3", label: "Paper 3" },
  { value: "paper4", label: "Paper 4" },
  { value: "paper5", label: "Paper 5" },
  { value: "paper6", label: "Paper 6" },
  { value: "mcq", label: "MCQ" },
] as const;

/** Valid subject-paper combinations for Cambridge AS/A Level */
export const SUBJECT_PAPER_MAP: Record<string, string[]> = {
  math: ["paper1", "paper2", "paper3", "paper4", "paper5", "paper6"],
  physics: ["mcq", "paper2", "paper3", "paper4", "paper5"],
  chemistry: ["mcq", "paper2", "paper3", "paper4", "paper5"],
};

export type SubjectValue = (typeof SUBJECTS)[number]["value"];
export type PaperTypeValue = (typeof PAPER_TYPES)[number]["value"];

export function getSubjectLabel(value: string): string {
  return CAMBRIDGE_SUBJECTS.find((s) => s.value === value)?.label ?? value;
}

export function getPaperTypeLabel(value: string): string {
  return PAPER_TYPES.find((p) => p.value === value)?.label ?? value;
}

export function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    math: "#6366f1",
    physics: "#3b82f6",
    chemistry: "#10b981",
  };
  return colors[subject] ?? "#8b5cf6";
}

/**
 * Format a paper code with its component label for display
 * e.g. "9709/12" → "9709/12 — Pure Mathematics 1 (Variant 2)"
 */
export function formatPaperCodeLabel(paperCode: string): string {
  const parsed = parsePaperCode(paperCode);
  if (!parsed) return paperCode;
  const comp = getComponentInfo(parsed.syllabusCode, parsed.component);
  if (!comp) return paperCode;
  return `${paperCode} — ${comp.label}`;
}
