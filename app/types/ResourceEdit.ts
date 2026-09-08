import type { ResourceEntry } from "~/types/ResourceEntry";

/**
 * Review status of a `resource_edits` row.
 */
export type EditReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * A crowdsourced submission staged in `resource_edits` — either a proposed
 * edit to an existing resource (`mapped_resource` set) or a brand-new site
 * submission (`mapped_resource` is null).
 *
 * Shape mirrors `ResourceEntry` (full proposed snapshot) plus the review
 * lifecycle columns. Unlike `resource_revisions`, `status` here is a purely
 * mirrored *operational* status field (`ResourceEntry["status"]`) — review
 * state lives in the dedicated `review_status` column instead, so there's no
 * column-overload ambiguity.
 */
export type ResourceEdit = ResourceEntry & {
  id: number;
  mapped_resource: number | null;
  review_status: EditReviewStatus;
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
};

/** A row from `resource_edits_queue`: a pending edit joined to its target resource. */
export type ResourceEditQueueRow = ResourceEdit & {
  current_resource: ResourceEntry & { id: number };
};

/**
 * A row from `resource_edit_counts` — the number of PENDING edits currently
 * queued against a given resource. Useful for flagging resources with
 * multiple competing proposed edits before a reviewer picks one to approve.
 */
export type ResourceEditCount = {
  resource_id: number;
  pending_count: number;
};

/**
 * A row from `resource_change_log` — a decided (APPROVED or REJECTED) edit,
 * stripped down to just the review-lifecycle columns. One row per past
 * decision, ordered by `resource_id` then most-recently-reviewed first.
 */
export type ResourceChangeLogEntry = {
  edit_id: number;
  resource_id: number | null;
  review_status: EditReviewStatus;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
};
