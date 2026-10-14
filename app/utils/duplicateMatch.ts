import type { ResourceEntry } from "~/types/ResourceEntry";
import { calculateDistance } from "~/utils/distance";

/**
 * Scores how likely a brand-new site submission is to duplicate a resource
 * that is already on the map (#35), so reviewers can turn it into an edit of
 * that resource instead of approving a second pin for the same place.
 *
 * Geography dominates — two submissions for the same fountain land within a
 * few metres — and name / address similarity separate neighbours (a cafe
 * and the park next door) from true duplicates. A shared Google Place ID is
 * treated as certain.
 */

/** Candidates further away than this are not considered at all. */
export const DUPLICATE_SEARCH_RADIUS_METERS = 150;

export type DuplicateCandidate = {
  resource: ResourceEntry & { id: number };
  /** 0–1 */
  confidence: number;
  level: "high" | "medium" | "low";
  distanceMeters: number;
  reasons: string[];
};

type Locatable = Pick<
  ResourceEntry,
  "latitude" | "longitude" | "name" | "address" | "gp_id" | "resource_type"
>;

const STOPWORDS = new Set(["the", "of", "and", "at", "a", "st", "street"]);

/** USPS-style abbreviations so "North Broad Street" matches "N Broad St". */
const ABBREVIATIONS: Record<string, string> = {
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  avenue: "ave",
  av: "ave",
  boulevard: "blvd",
  road: "rd",
  drive: "dr",
  place: "pl",
  square: "sq",
  parkway: "pkwy",
  lane: "ln",
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((word) => ABBREVIATIONS[word] ?? word)
    .filter((word) => word && !STOPWORDS.has(word))
    .join(" ");

const bigrams = (value: string) => {
  const compact = value.replace(/ /g, "");
  const grams: string[] = [];
  for (let i = 0; i < compact.length - 1; i++) {
    grams.push(compact.slice(i, i + 2));
  }
  return grams;
};

/** Sørensen–Dice coefficient over character bigrams, 0–1. */
export const textSimilarity = (
  a: string | null | undefined,
  b: string | null | undefined,
) => {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }

  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  if (leftGrams.length === 0 || rightGrams.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const gram of leftGrams) {
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  let overlap = 0;
  for (const gram of rightGrams) {
    const available = counts.get(gram) ?? 0;
    if (available > 0) {
      overlap += 1;
      counts.set(gram, available - 1);
    }
  }

  return (2 * overlap) / (leftGrams.length + rightGrams.length);
};

const levelFor = (confidence: number): DuplicateCandidate["level"] =>
  confidence >= 0.75 ? "high" : confidence >= 0.5 ? "medium" : "low";

export const scoreCandidate = (
  submission: Locatable,
  resource: ResourceEntry & { id: number },
): DuplicateCandidate | null => {
  const distanceMeters = calculateDistance(
    submission.latitude,
    submission.longitude,
    resource.latitude,
    resource.longitude,
  );

  if (submission.gp_id && submission.gp_id === resource.gp_id) {
    return {
      resource,
      confidence: 1,
      level: "high",
      distanceMeters,
      reasons: ["Same Google Place"],
    };
  }

  if (
    !Number.isFinite(distanceMeters) ||
    distanceMeters > DUPLICATE_SEARCH_RADIUS_METERS
  ) {
    return null;
  }

  const proximity = 1 - distanceMeters / DUPLICATE_SEARCH_RADIUS_METERS;
  const name = textSimilarity(submission.name, resource.name);
  const address = textSimilarity(submission.address, resource.address);
  const sameType = submission.resource_type === resource.resource_type;

  // Only weigh text that both sides actually have.
  const parts: [weight: number, score: number][] = [[0.55, proximity]];
  if (normalizeText(submission.name) && normalizeText(resource.name)) {
    parts.push([0.3, name]);
  }
  if (normalizeText(submission.address) && normalizeText(resource.address)) {
    parts.push([0.15, address]);
  }
  const totalWeight = parts.reduce((sum, [weight]) => sum + weight, 0);
  const weighted =
    parts.reduce((sum, [weight, score]) => sum + weight * score, 0) /
    totalWeight;
  // A different resource type (a bathroom next to a fountain) is much less
  // likely to be the same entry.
  const confidence = Math.min(1, weighted * (sameType ? 1 : 0.6));

  const reasons = [`${Math.round(distanceMeters)} m away`];
  if (name >= 0.6) {
    reasons.push(name === 1 ? "Same name" : "Similar name");
  }
  if (address >= 0.6) {
    reasons.push(address === 1 ? "Same address" : "Similar address");
  }
  if (sameType) {
    reasons.push("Same type");
  }

  return {
    resource,
    confidence,
    level: levelFor(confidence),
    distanceMeters,
    reasons,
  };
};

/** Candidates worth showing a reviewer, most likely first. */
export const rankDuplicates = (
  submission: Locatable,
  resources: (ResourceEntry & { id: number })[],
  minimumConfidence = 0.3,
) =>
  resources
    .map((resource) => scoreCandidate(submission, resource))
    .filter(
      (candidate): candidate is DuplicateCandidate =>
        candidate !== null && candidate.confidence >= minimumConfidence,
    )
    .sort((a, b) => b.confidence - a.confidence);
