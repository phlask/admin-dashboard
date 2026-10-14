import { describe, expect, it } from "vitest";
import type { ResourceEntry } from "~/types/ResourceEntry";
import {
  rankDuplicates,
  scoreCandidate,
  textSimilarity,
} from "./duplicateMatch";

// ResourceEntry types `id` as an optional string while the DB (and these
// helpers) use numeric ids, so build fixtures loosely and cast once.
const resource = (
  values: Record<string, unknown> & { id: number },
): ResourceEntry & { id: number } =>
  ({
    resource_type: "WATER",
    latitude: 39.9540848,
    longitude: -75.1628833,
    ...values,
  }) as unknown as ResourceEntry & { id: number };

const graceCafe = resource({
  id: 1,
  name: "Grace Cafe Philly",
  address: "55 North Broad Street",
});

describe("textSimilarity", () => {
  it("normalises case, punctuation and street abbreviations", () => {
    expect(textSimilarity("55 North Broad Street", "55 N. Broad St")).toBe(1);
    expect(textSimilarity("Grace Café", "grace cafe")).toBe(1);
  });

  it("is 0 when either side is empty", () => {
    expect(textSimilarity("", "Grace Cafe")).toBe(0);
    expect(textSimilarity(null, null)).toBe(0);
  });
});

describe("scoreCandidate", () => {
  it("rates the same place with a typo'd name as high", () => {
    const match = scoreCandidate(
      {
        name: "Grace Cafe Phila",
        address: "55 N Broad St",
        latitude: 39.95415,
        longitude: -75.16283,
        resource_type: "WATER",
      },
      graceCafe,
    );
    expect(match?.level).toBe("high");
    expect(match?.reasons).toContain("Similar name");
    expect(match?.reasons).toContain("Same address");
  });

  it("treats a shared Google Place ID as certain, however far", () => {
    const match = scoreCandidate(
      {
        name: "x",
        latitude: 0,
        longitude: 0,
        resource_type: "FOOD",
        gp_id: "abc",
      },
      { ...graceCafe, gp_id: "abc" },
    );
    expect(match?.confidence).toBe(1);
    expect(match?.reasons).toEqual(["Same Google Place"]);
  });

  it("ignores anything outside the search radius", () => {
    expect(
      scoreCandidate(
        {
          name: "Grace Cafe Philly",
          latitude: 39.97,
          longitude: -75.16,
          resource_type: "WATER",
        },
        graceCafe,
      ),
    ).toBeNull();
  });

  it("discounts a different resource type at the same spot", () => {
    const sameType = scoreCandidate(
      {
        name: null,
        latitude: 39.95409,
        longitude: -75.16289,
        resource_type: "WATER",
      },
      graceCafe,
    );
    const otherType = scoreCandidate(
      {
        name: null,
        latitude: 39.95409,
        longitude: -75.16289,
        resource_type: "BATHROOM",
      },
      graceCafe,
    );
    expect(otherType?.confidence ?? 0).toBeLessThan(sameType?.confidence ?? 0);
  });
});

describe("rankDuplicates", () => {
  it("orders by confidence and drops weak matches", () => {
    const neighbour = resource({
      id: 2,
      name: "City Hall Fountain",
      address: "1400 John F Kennedy Blvd",
      latitude: 39.9536,
      longitude: -75.1636,
    });
    const ranked = rankDuplicates(
      {
        name: "Grace Cafe",
        address: "55 N Broad St",
        latitude: 39.95409,
        longitude: -75.16288,
        resource_type: "WATER",
      },
      [neighbour, graceCafe],
      0.5,
    );
    expect(ranked.map((candidate) => candidate.resource.id)).toEqual([1]);
  });
});
