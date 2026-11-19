import type { SurveySchema, Answers } from "./types";

type Cond = NonNullable<SurveySchema["questions"][number]["showIf"]>["conditions"][number];

export function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

export function evaluateCondition(c: Cond, answer: unknown): boolean {
  if (isEmpty(answer)) return false;
  switch (c.operator) {
    case "equals":
      return answer === c.value;
    case "not_equals":
      return answer !== c.value;
    case "includes":
      return Array.isArray(answer) && answer.includes(c.value as string);
    case "gt":
      return typeof answer === "number" && typeof c.value === "number" && answer > c.value;
    case "lt":
      return typeof answer === "number" && typeof c.value === "number" && answer < c.value;
    default:
      return false;
  }
}

export function getVisibleQuestionIds(schema: SurveySchema, answers: Answers): Set<string> {
  const visible = new Set<string>();
  for (const q of schema.questions) {
    if (!q.showIf) {
      visible.add(q.id);
      continue;
    }
    const results = q.showIf.conditions.map(
      (c) => visible.has(c.questionId) && evaluateCondition(c, answers[c.questionId])
    );
    const ok = q.showIf.logic === "and" ? results.every(Boolean) : results.some(Boolean);
    if (ok) {
      visible.add(q.id);
    }
  }
  return visible;
}
