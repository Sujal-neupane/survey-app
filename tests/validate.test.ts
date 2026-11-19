import { describe, it, expect } from "vitest";
import { validateAnswers } from "../src/lib/survey/validate";
import type { SurveySchema } from "../src/lib/survey/types";

describe("validateAnswers", () => {
  const schema: SurveySchema = {
    questions: [
      {
        id: "q1",
        type: "single_choice",
        label: "Q1",
        required: true,
        options: [
          { id: "opt1", label: "Option 1" },
          { id: "opt2", label: "Option 2" },
        ],
      },
      {
        id: "q2_cond_req",
        type: "text",
        label: "Q2",
        maxLength: 100,
        required: true,
        showIf: {
          logic: "and",
          conditions: [{ questionId: "q1", operator: "equals", value: "opt1" }],
        },
      },
      {
        id: "q3_multi",
        type: "multi_choice",
        label: "Q3",
        required: false,
        options: [
          { id: "m1", label: "M1" },
          { id: "m2", label: "M2" },
        ],
      },
      {
        id: "q4_rating",
        type: "rating",
        label: "Q4",
        min: 1,
        max: 5,
        required: false,
      },
    ],
  };

  it("enforces required question when empty", () => {
    const result = validateAnswers(schema, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.q1).toBe("This question is required");
    }
  });

  it("does NOT enforce required when question is hidden by condition", () => {
    // q1 is 'opt2', so q2_cond_req is hidden. It should not fail validation even though q2 is required!
    const result = validateAnswers(schema, { q1: "opt2" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answers.q1).toBe("opt2");
      expect(result.answers.q2_cond_req).toBeUndefined();
    }
  });

  it("enforces required when conditional question is visible and unanswered", () => {
    // q1 is 'opt1', so q2_cond_req is visible and required
    const result = validateAnswers(schema, { q1: "opt1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.q2_cond_req).toBe("This question is required");
    }
  });

  it("drops answers for hidden or unknown questions", () => {
    // Even if client submits answer to q2 when q1 is opt2, it must be dropped
    const result = validateAnswers(schema, {
      q1: "opt2",
      q2_cond_req: "some hidden answer",
      random_unknown_field: "injected",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answers.q1).toBe("opt2");
      expect(result.answers.q2_cond_req).toBeUndefined();
      expect(result.answers.random_unknown_field).toBeUndefined();
    }
  });

  it("rejects invalid single_choice option id", () => {
    const result = validateAnswers(schema, { q1: "non_existent_id" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.q1).toBe("Selected option is not valid");
    }
  });

  it("rejects multi_choice duplicates and invalid option ids", () => {
    const resDup = validateAnswers(schema, { q1: "opt2", q3_multi: ["m1", "m1"] });
    expect(resDup.ok).toBe(false);
    if (!resDup.ok) {
      expect(resDup.errors.q3_multi).toBe("Duplicate options are not allowed");
    }

    const resInvalid = validateAnswers(schema, { q1: "opt2", q3_multi: ["invalid_id"] });
    expect(resInvalid.ok).toBe(false);
    if (!resInvalid.ok) {
      expect(resInvalid.errors.q3_multi).toBe("Contains invalid option selection");
    }
  });

  it("rejects rating 0, 6, and float numbers like 3.5", () => {
    for (const val of [0, 6, 3.5, "five"]) {
      const result = validateAnswers(schema, { q1: "opt2", q4_rating: val as unknown });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.q4_rating).toBe("Rating must be an integer between 1 and 5");
      }
    }

    const validRating = validateAnswers(schema, { q1: "opt2", q4_rating: 4 });
    expect(validRating.ok).toBe(true);
    if (validRating.ok) {
      expect(validRating.answers.q4_rating).toBe(4);
    }
  });

  it("partial validation skips required checks but validates types", () => {
    const partialValid = validateAnswers(schema, {}, { partial: true });
    expect(partialValid.ok).toBe(true);

    const partialInvalidType = validateAnswers(
      schema,
      { q4_rating: 10 },
      { partial: true }
    );
    expect(partialInvalidType.ok).toBe(false);
    if (!partialInvalidType.ok) {
      expect(partialInvalidType.errors.q4_rating).toBeDefined();
    }
  });
});
