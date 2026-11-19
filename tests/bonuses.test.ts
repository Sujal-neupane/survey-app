import { describe, it, expect } from "vitest";
import { checkRateLimit, getIpHash } from "../src/lib/rateLimit";

describe("Bonuses: Rate Limiting & Security", () => {
  it("hashes IP address with salt and never exposes raw IP", () => {
    const rawIp = "192.168.1.100";
    const hash1 = getIpHash(rawIp);
    const hash2 = getIpHash(rawIp);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(rawIp);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
    expect(hash1).not.toContain(rawIp);
  });

  it("blocks rapid requests after limit is reached (6th returns rate limited)", async () => {
    const testKey = `test_rate_limit_${Date.now()}`;
    const limit = 5;

    // 5 allowed requests
    for (let i = 0; i < limit; i++) {
      const res = await checkRateLimit(testKey, limit, 60);
      expect(res.success).toBe(true);
    }

    // 6th request fails (rate limited)
    const blockedRes = await checkRateLimit(testKey, limit, 60);
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });
});
