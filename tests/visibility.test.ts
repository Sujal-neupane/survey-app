import { describe, it, expect } from "vitest";
import { getVisibleQuestionIds, evaluateCondition } from "../src/lib/survey/visibility";
import type { SurveySchema } from "../src/lib/survey/types";

describe("evaluateCondition", () => {
  it("evaluates equals correctly", () => {
    expect(evaluateCondition({ questionId: "q1", operator: "equals", value: "opt1" }, "opt1")).toBe(true);
    expect(evaluateCondition({ questionId: "q1", operator: "equals", value: "opt1" }, "opt2")).toBe(false);
  });

  it("evaluates not_equals correctly", () => {
    expect(evaluateCondition({ questionId: "q1", operator: "not_equals", value: "opt1" }, "opt2")).toBe(true);
    expect(evaluateCondition({ questionId: "q1", operator: "not_equals", value: "opt1" }, "opt1")).toBe(false);
  });

  it("returns false for unanswered or empty values even for not_equals", () => {
    expect(evaluateCondition({ questionId: "q1", operator: "not_equals", value: "opt1" }, undefined)).toBe(false);
    expect(evaluateCondition({ questionId: "q1", operator: "not_equals", value: "opt1" }, null)).toBe(false);
    expect(evaluateCondition({ questionId: "q1", operator: "not_equals", value: "opt1" }, "")).toBe(false);
    expect(evaluateCondition({ questionId: "q1", operator: "not_equals", value: "opt1" }, [])).toBe(false);
  });

  it("evaluates includes for multi-choice", () => {
    expect(evaluateCondition({ questionId: "q1", operator: "includes", value: "opt1" }, ["opt1", "opt2"])).toBe(true);
    expect(evaluateCondition({ questionId: "q1", operator: "includes", value: "opt3" }, ["opt1", "opt2"])).toBe(false);
  });

  it("evaluates gt and lt for rating", () => {
    expect(evaluateCondition({ questionId: "q1", operator: "gt", value: 3 }, 4)).toBe(true);
    expect(evaluateCondition({ questionId: "q1", operator: "gt", value: 3 }, 3)).toBe(false);
    expect(evaluateCondition({ questionId: "q1", operator: "lt", value: 3 }, 2)).toBe(true);
    expect(evaluateCondition({ questionId: "q1", operator: "lt", value: 3 }, 3)).toBe(false);
  });
});

describe("getVisibleQuestionIds", () => {
  const schema: SurveySchema = {
    questions: [
      {
        id: "q1",
        type: "single_choice",
        label: "Do you use product?",
        required: true,
        options: [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ],
      },
      {
        id: "q2",
        type: "text",
        label: "What do you like?",
        maxLength: 1000,
        required: false,
        showIf: {
          logic: "and",
          conditions: [{ questionId: "q1", operator: "equals", value: "yes" }],
        },
      },
      {
        id: "q3",
        type: "rating",
        label: "Rating",
        min: 1,
        max: 5,
        required: false,
        showIf: {
          logic: "and",
          conditions: [{ questionId: "q2", operator: "not_equals", value: "hate it" }],
        },
      },
    ],
  };

  it("unconditional question is always visible", () => {
    const visible = getVisibleQuestionIds(schema, {});
    expect(visible.has("q1")).toBe(true);
    expect(visible.has("q2")).toBe(false);
    expect(visible.has("q3")).toBe(false);
  });

  it("shows conditional question when source satisfies condition", () => {
    const visible = getVisibleQuestionIds(schema, { q1: "yes" });
    expect(visible.has("q1")).toBe(true);
    expect(visible.has("q2")).toBe(true);
  });

  it("hides conditional question when source does not satisfy condition", () => {
    const visible = getVisibleQuestionIds(schema, { q1: "no" });
    expect(visible.has("q1")).toBe(true);
    expect(visible.has("q2")).toBe(false);
  });

  it("handles cascading dependencies: if A hides B, C depending on B is hidden", () => {
    // q1 is 'no' -> q2 is hidden. Even if q2 had some answer in raw state, since q2 is not visible, q3 is hidden!
    const visible = getVisibleQuestionIds(schema, { q1: "no", q2: "love it" });
    expect(visible.has("q1")).toBe(true);
    expect(visible.has("q2")).toBe(false);
    expect(visible.has("q3")).toBe(false);
  });

  it("cascades positively when dependency chain is met", () => {
    const visible = getVisibleQuestionIds(schema, { q1: "yes", q2: "love it" });
    expect(visible.has("q1")).toBe(true);
    expect(visible.has("q2")).toBe(true);
    expect(visible.has("q3")).toBe(true);
  });

  it("supports and vs or condition groups", () => {
    const schemaWithGroups: SurveySchema = {
      questions: [
        {
          id: "q1",
          type: "single_choice",
          label: "Q1",
          required: false,
          options: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
        },
        {
          id: "q2",
          type: "rating",
          label: "Q2",
          min: 1,
          max: 5,
          required: false,
        },
        {
          id: "q_or",
          type: "text",
          label: "OR Question",
          maxLength: 1000,
          required: false,
          showIf: {
            logic: "or",
            conditions: [
              { questionId: "q1", operator: "equals", value: "a" },
              { questionId: "q2", operator: "gt", value: 3 },
            ],
          },
        },
        {
          id: "q_and",
          type: "text",
          label: "AND Question",
          maxLength: 1000,
          required: false,
          showIf: {
            logic: "and",
            conditions: [
              { questionId: "q1", operator: "equals", value: "a" },
              { questionId: "q2", operator: "gt", value: 3 },
            ],
          },
        },
      ],
    };

    // When only q1 matches
    const vis1 = getVisibleQuestionIds(schemaWithGroups, { q1: "a", q2: 2 });
    expect(vis1.has("q_or")).toBe(true);
    expect(vis1.has("q_and")).toBe(false);

    // When both match
    const vis2 = getVisibleQuestionIds(schemaWithGroups, { q1: "a", q2: 4 });
    expect(vis2.has("q_or")).toBe(true);
    expect(vis2.has("q_and")).toBe(true);
  });
});
