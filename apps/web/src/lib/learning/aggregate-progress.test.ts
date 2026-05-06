import { describe, expect, it } from "vitest";

import { overallPercentFromCounts } from "./aggregate-progress";

describe("overallPercentFromCounts", () => {
  it("returns null when total is zero", () => {
    expect(overallPercentFromCounts(0, 0)).toBeNull();
    expect(overallPercentFromCounts(5, 0)).toBeNull();
  });

  it("rounds percentage like dashboard aggregate", () => {
    expect(overallPercentFromCounts(1, 3)).toBe(33);
    expect(overallPercentFromCounts(2, 3)).toBe(67);
    expect(overallPercentFromCounts(50, 100)).toBe(50);
  });

  it("handles empty mastery", () => {
    expect(overallPercentFromCounts(0, 10)).toBe(0);
  });
});
