import { describe, it, expect, vi, beforeEach } from "vitest";
import { signToken, verifyToken, requireSurveyOwner } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { ApiError } from "../src/lib/errors";

vi.mock("../src/lib/db", () => ({
  db: {
    survey: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Auth Token and Ownership", () => {
  it("signs and verifies JWT successfully", async () => {
    const token = await signToken("user_123");
    expect(typeof token).toBe("string");

    const payload = await verifyToken(token);
    expect(payload?.sub).toBe("user_123");
  });

  it("returns null for invalid token", async () => {
    const payload = await verifyToken("invalid-garbage-token");
    expect(payload).toBeNull();
  });

  it("requireSurveyOwner grants access when userId matches survey ownerId", async () => {
    vi.mocked(db.survey.findUnique).mockResolvedValueOnce({
      id: "survey_1",
      ownerId: "user_owner",
      title: "Test Survey",
    } as any);

    const survey = await requireSurveyOwner("survey_1", "user_owner");
    expect(survey.id).toBe("survey_1");
  });

  it("requireSurveyOwner throws 404 when survey is owned by another user (preventing leakage)", async () => {
    vi.mocked(db.survey.findUnique).mockResolvedValueOnce({
      id: "survey_1",
      ownerId: "user_owner",
      title: "Test Survey",
    } as any);

    await expect(requireSurveyOwner("survey_1", "user_attacker")).rejects.toThrow(
      new ApiError(404, "Survey not found", "NOT_FOUND")
    );
  });

  it("requireSurveyOwner throws 404 when survey does not exist", async () => {
    vi.mocked(db.survey.findUnique).mockResolvedValueOnce(null);

    await expect(requireSurveyOwner("non_existent", "user_1")).rejects.toThrow(
      new ApiError(404, "Survey not found", "NOT_FOUND")
    );
  });
});
