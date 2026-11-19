import { z } from "zod";

export const QuestionType = z.enum(["text", "single_choice", "multi_choice", "rating"]);
export type QuestionType = z.infer<typeof QuestionType>;

export const Option = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(200),
});
export type Option = z.infer<typeof Option>;

export const Condition = z.object({
  questionId: z.string().min(1), // the SOURCE question (must come earlier)
  operator: z.enum(["equals", "not_equals", "includes", "gt", "lt"]),
  value: z.union([z.string(), z.number()]), // option id for choices, number for rating
});
export type Condition = z.infer<typeof Condition>;

export const ConditionGroup = z.object({
  logic: z.enum(["and", "or"]),
  conditions: z.array(Condition).min(1).max(5),
});
export type ConditionGroup = z.infer<typeof ConditionGroup>;

const base = {
  id: z.string().min(1),
  label: z.string().trim().min(1).max(300),
  helpText: z.string().max(500).optional(),
  required: z.boolean().default(false),
  showIf: ConditionGroup.optional(),
};

export const Question = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("text"),
    maxLength: z.number().int().min(1).max(5000).default(1000),
  }),
  z.object({
    ...base,
    type: z.literal("single_choice"),
    options: z.array(Option).min(2).max(20),
  }),
  z.object({
    ...base,
    type: z.literal("multi_choice"),
    options: z.array(Option).min(2).max(20),
  }),
  z.object({
    ...base,
    type: z.literal("rating"),
    min: z.literal(1).default(1),
    max: z.literal(5).default(5),
  }),
]);

export const SurveySchema = z.object({
  questions: z.array(Question).min(1).max(100),
});

export type Question = z.infer<typeof Question>;
export type SurveySchema = z.infer<typeof SurveySchema>;
export type Answers = Record<string, string | number | string[]>;
