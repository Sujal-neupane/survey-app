import type { SurveySchema, Answers } from "./types";
import { getVisibleQuestionIds, isEmpty } from "./visibility";

export type ValidationResult =
  | { ok: true; answers: Answers }
  | { ok: false; errors: Record<string, string> };

export function validateAnswers(
  schema: SurveySchema,
  rawAnswers: unknown,
  options: { partial: boolean } = { partial: false }
): ValidationResult {
  const safeRaw: Answers =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? (rawAnswers as Answers)
      : {};

  const visibleIds = getVisibleQuestionIds(schema, safeRaw);
  const cleanedAnswers: Answers = {};
  const errors: Record<string, string> = {};

  for (const q of schema.questions) {
    if (!visibleIds.has(q.id)) {
      // Drop any answer for questions that are not visible or unknown
      continue;
    }

    const value = safeRaw[q.id];
    const isValEmpty = isEmpty(value);

    // Required check
    if (isValEmpty) {
      if (q.required && !options.partial) {
        errors[q.id] = "This question is required";
      }
      continue;
    }

    // Type-specific validations
    switch (q.type) {
      case "text": {
        if (typeof value !== "string") {
          errors[q.id] = "Answer must be a text string";
          break;
        }
        const trimmed = value.trim();
        if (trimmed.length > (q.maxLength ?? 1000)) {
          errors[q.id] = `Answer cannot exceed ${q.maxLength ?? 1000} characters`;
          break;
        }
        cleanedAnswers[q.id] = trimmed;
        break;
      }

      case "single_choice": {
        if (typeof value !== "string") {
          errors[q.id] = "Answer must be a selected option";
          break;
        }
        const validOptionIds = new Set(q.options.map((o) => o.id));
        if (!validOptionIds.has(value)) {
          errors[q.id] = "Selected option is not valid";
          break;
        }
        cleanedAnswers[q.id] = value;
        break;
      }

      case "multi_choice": {
        if (!Array.isArray(value)) {
          errors[q.id] = "Answer must be an array of selected options";
          break;
        }
        const validOptionIds = new Set(q.options.map((o) => o.id));
        const seen = new Set<string>();
        let hasDuplicate = false;
        let hasInvalidOption = false;

        for (const item of value) {
          if (typeof item !== "string" || !validOptionIds.has(item)) {
            hasInvalidOption = true;
            break;
          }
          if (seen.has(item)) {
            hasDuplicate = true;
            break;
          }
          seen.add(item);
        }

        if (hasInvalidOption) {
          errors[q.id] = "Contains invalid option selection";
          break;
        }
        if (hasDuplicate) {
          errors[q.id] = "Duplicate options are not allowed";
          break;
        }
        cleanedAnswers[q.id] = value as string[];
        break;
      }

      case "rating": {
        const num = typeof value === "number" ? value : Number(value);
        if (
          typeof value !== "number" ||
          !Number.isInteger(num) ||
          num < (q.min ?? 1) ||
          num > (q.max ?? 5)
        ) {
          errors[q.id] = "Rating must be an integer between 1 and 5";
          break;
        }
        cleanedAnswers[q.id] = num;
        break;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, answers: cleanedAnswers };
}
