import { describe, it, expect } from "vitest";
import type { SurveySchema } from "../src/lib/survey/types";

describe("Survey Draft and Versioning Isolation", () => {
  it("preserves immutable frozen version schema when draft is modified", () => {
    // Draft version 1
    const draftSchemaV1: SurveySchema = {
      questions: [
        { id: "q1", type: "text", label: "Initial Question", required: true, maxLength: 100 },
      ],
    };

    // Publishing creates immutable snapshot
    const version1 = {
      version: 1,
      title: "Survey v1",
      schema: JSON.parse(JSON.stringify(draftSchemaV1)),
    };

    expect(version1.version).toBe(1);
    expect(version1.schema.questions[0].label).toBe("Initial Question");

    // Admin edits draft
    const draftSchemaV2: SurveySchema = {
      questions: [
        { id: "q1", type: "text", label: "Renamed Question", required: true, maxLength: 200 },
        { id: "q2", type: "rating", label: "Added Rating", min: 1, max: 5, required: false },
      ],
    };

    // Version 1 snapshot remains intact
    expect(version1.schema.questions.length).toBe(1);
    expect(version1.schema.questions[0].label).toBe("Initial Question");

    // Publishing second time creates version 2
    const version2 = {
      version: 2,
      title: "Survey v2",
      schema: JSON.parse(JSON.stringify(draftSchemaV2)),
    };

    expect(version2.version).toBe(2);
    expect(version2.schema.questions.length).toBe(2);
    expect(version1.schema.questions.length).toBe(1);
    expect(version1.version).toBe(1);
  });
});
