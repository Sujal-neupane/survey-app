import type { SurveySchema, Question } from "./types";

export interface SchemaValidationError {
  questionId?: string;
  message: string;
}

export function validateSurveySchema(
  schema: SurveySchema,
  options?: { isPublishing?: boolean; title?: string }
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (options?.isPublishing) {
    if (!options.title || options.title.trim().length === 0) {
      errors.push({ message: "Survey title is required for publishing" });
    }
    if (!schema.questions || schema.questions.length === 0) {
      errors.push({ message: "Survey must contain at least one question for publishing" });
    }
  }

  const seenQuestionIds = new Set<string>();
  const questionMap = new Map<string, Question>();
  const questionIndexMap = new Map<string, number>();

  for (let i = 0; i < schema.questions.length; i++) {
    const q = schema.questions[i];

    // Check unique question ID
    if (seenQuestionIds.has(q.id)) {
      errors.push({
        questionId: q.id,
        message: `Duplicate question ID: "${q.id}"`,
      });
    }
    seenQuestionIds.add(q.id);
    questionMap.set(q.id, q);
    questionIndexMap.set(q.id, i);

    // Check unique option IDs within question
    if (q.type === "single_choice" || q.type === "multi_choice") {
      const seenOptionIds = new Set<string>();
      for (const opt of q.options) {
        if (seenOptionIds.has(opt.id)) {
          errors.push({
            questionId: q.id,
            message: `Question "${q.label || q.id}" has duplicate option ID: "${opt.id}"`,
          });
        }
        seenOptionIds.add(opt.id);
      }
    }
  }

  // Check showIf conditions
  for (let i = 0; i < schema.questions.length; i++) {
    const q = schema.questions[i];
    if (!q.showIf) continue;

    for (const cond of q.showIf.conditions) {
      const sourceIndex = questionIndexMap.get(cond.questionId);
      const sourceQuestion = questionMap.get(cond.questionId);

      // Must exist and appear earlier
      if (sourceIndex === undefined || sourceIndex >= i || !sourceQuestion) {
        errors.push({
          questionId: q.id,
          message: `Condition on question "${q.label || q.id}" references invalid or later question "${cond.questionId}"`,
        });
        continue;
      }

      // Text questions cannot be condition sources
      if (sourceQuestion.type === "text") {
        errors.push({
          questionId: q.id,
          message: `Condition cannot reference text question "${sourceQuestion.label || sourceQuestion.id}"`,
        });
        continue;
      }

      // Single choice checks
      if (sourceQuestion.type === "single_choice") {
        if (cond.operator !== "equals" && cond.operator !== "not_equals") {
          errors.push({
            questionId: q.id,
            message: `Single choice condition supports only "equals" or "not_equals", got "${cond.operator}"`,
          });
        }
        const validOptionIds = new Set(sourceQuestion.options.map((o) => o.id));
        if (typeof cond.value !== "string" || !validOptionIds.has(cond.value)) {
          errors.push({
            questionId: q.id,
            message: `Condition value "${cond.value}" is not a valid option of source question`,
          });
        }
      }

      // Multi choice checks
      if (sourceQuestion.type === "multi_choice") {
        if (cond.operator !== "includes") {
          errors.push({
            questionId: q.id,
            message: `Multi choice condition supports only "includes", got "${cond.operator}"`,
          });
        }
        const validOptionIds = new Set(sourceQuestion.options.map((o) => o.id));
        if (typeof cond.value !== "string" || !validOptionIds.has(cond.value)) {
          errors.push({
            questionId: q.id,
            message: `Condition value "${cond.value}" is not a valid option of source question`,
          });
        }
      }

      // Rating checks
      if (sourceQuestion.type === "rating") {
        if (cond.operator !== "equals" && cond.operator !== "gt" && cond.operator !== "lt") {
          errors.push({
            questionId: q.id,
            message: `Rating condition supports only "equals", "gt", or "lt", got "${cond.operator}"`,
          });
        }
        const numVal = Number(cond.value);
        if (typeof cond.value !== "number" || !Number.isInteger(numVal) || numVal < 1 || numVal > 5) {
          errors.push({
            questionId: q.id,
            message: `Rating condition value must be an integer between 1 and 5, got "${cond.value}"`,
          });
        }
      }
    }
  }

  return errors;
}
