import { describe, it, expect } from "vitest";
import { validateSurveySchema } from "../src/lib/survey/schemaChecks";
import type { SurveySchema } from "../src/lib/survey/types";

describe("validateSurveySchema", () => {
  it("detects duplicate question IDs", () => {
    const schema: SurveySchema = {
      questions: [
        { id: "q1", type: "text", label: "Q1", maxLength: 100, required: false },
        { id: "q1", type: "text", label: "Q2", maxLength: 100, required: false },
      ],
    };
    const errors = validateSurveySchema(schema);
    expect(errors.some((e) => e.message.includes("Duplicate question ID"))).toBe(true);
  });

  it("detects duplicate option IDs within a question", () => {
    const schema: SurveySchema = {
      questions: [
        {
          id: "q1",
          type: "single_choice",
          label: "Q1",
          required: false,
          options: [
            { id: "opt1", label: "Opt 1" },
            { id: "opt1", label: "Opt 2" },
          ],
        },
      ],
    };
    const errors = validateSurveySchema(schema);
    expect(errors.some((e) => e.message.includes("duplicate option ID"))).toBe(true);
  });

  it("fails if condition references a later question or non-existent question", () => {
    const schema: SurveySchema = {
      questions: [
        {
          id: "q1",
          type: "single_choice",
          label: "Q1",
          required: false,
          options: [{ id: "o1", label: "O1" }, { id: "o2", label: "O2" }],
          showIf: {
            logic: "and",
            conditions: [{ questionId: "q2", operator: "equals", value: "x" }],
          },
        },
        {
          id: "q2",
          type: "single_choice",
          label: "Q2",
          required: false,
          options: [{ id: "x", label: "X" }, { id: "y", label: "Y" }],
        },
      ],
    };
    const errors = validateSurveySchema(schema);
    expect(errors.some((e) => e.message.includes("references invalid or later question"))).toBe(true);
  });

  it("disallows conditions referencing text questions", () => {
    const schema: SurveySchema = {
      questions: [
        { id: "q1", type: "text", label: "Q1", maxLength: 100, required: false },
        {
          id: "q2",
          type: "text",
          label: "Q2",
          maxLength: 100,
          required: false,
          showIf: {
            logic: "and",
            conditions: [{ questionId: "q1", operator: "equals", value: "hello" }],
          },
        },
      ],
    };
    const errors = validateSurveySchema(schema);
    expect(errors.some((e) => e.message.includes("Condition cannot reference text question"))).toBe(true);
  });

  it("validates operator compatibility for rating questions", () => {
    const schema: SurveySchema = {
      questions: [
        { id: "q1", type: "rating", label: "Q1", min: 1, max: 5, required: false },
        {
          id: "q2",
          type: "text",
          label: "Q2",
          maxLength: 100,
          required: false,
          showIf: {
            logic: "and",
            conditions: [
              // 'includes' is invalid for rating
              { questionId: "q1", operator: "includes", value: 3 },
            ],
          },
        },
      ],
    };
    const errors = validateSurveySchema(schema);
    expect(errors.some((e) => e.message.includes("Rating condition supports only"))).toBe(true);
  });

  it("validates publish requirements (non-empty title and at least one question)", () => {
    const emptySchema: SurveySchema = { questions: [] };
    const errors = validateSurveySchema(emptySchema, { isPublishing: true, title: "" });
    expect(errors.some((e) => e.message.includes("title is required"))).toBe(true);
    expect(errors.some((e) => e.message.includes("at least one question"))).toBe(true);
  });
});
