import { describe, expect, it } from "vitest";
import { normalizeForCompare, valuesDiffer } from "./resourceDiff";

describe("valuesDiffer", () => {
  it("treats every flavour of empty as the same", () => {
    for (const [a, b] of [
      [null, undefined],
      [null, ""],
      ["", []],
      [{}, null],
      [{ tags: [] }, null],
      [{ tags: null, dispenser_type: [] }, {}],
    ]) {
      expect(valuesDiffer(a, b)).toBe(false);
    }
  });

  it("compares tag arrays as sets", () => {
    expect(
      valuesDiffer(
        { dispenser_type: ["SINK"], tags: ["BYOB", "FILTERED"] },
        { tags: ["FILTERED", "BYOB"], dispenser_type: ["SINK"] },
      ),
    ).toBe(false);
    expect(valuesDiffer({ tags: ["BYOB"] }, { tags: ["FILTERED"] })).toBe(true);
  });

  it("treats any coordinate change as a change", () => {
    expect(valuesDiffer(39.9540848, 39.9540849)).toBe(true);
    expect(valuesDiffer(39.9540848, 39.9540848)).toBe(false);
  });

  it("is case and whitespace sensitive for text", () => {
    expect(valuesDiffer("Grace Cafe", "grace cafe")).toBe(true);
    expect(valuesDiffer("Grace Cafe", "Grace Cafe ")).toBe(true);
  });

  it("keeps the order of arrays of objects", () => {
    const a = [{ day: 1 }, { day: 2 }];
    const b = [{ day: 2 }, { day: 1 }];
    expect(valuesDiffer(a, b)).toBe(true);
  });
});

describe("normalizeForCompare", () => {
  it("drops empty keys and sorts object keys", () => {
    expect(
      JSON.stringify(normalizeForCompare({ b: 1, a: "", c: [], d: "x" })),
    ).toBe(JSON.stringify({ b: 1, d: "x" }));
  });

  it("maps NaN to empty", () => {
    expect(normalizeForCompare(Number.NaN)).toBeUndefined();
  });
});
