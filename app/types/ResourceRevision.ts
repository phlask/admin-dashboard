import type { ResourceEntry } from "~/types/ResourceEntry";

/**
 * Review status of a `resource_revisions` row. Note this table reuses the
 * `status` column for review state rather than the resource's operational
 * status (`ResourceStatus`) — the two are unrelated despite the shared
 * column name.
 */
export type RevisionStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * A proposed edit to an existing resource, staged in `resource_revisions`.
 *
 * Shape mirrors `ResourceEntry` (it's a full proposed snapshot of the
 * resource) plus:
 * - `mapped_resources`: FK to `resources.id` — the resource this revision
 *   proposes changes to. Every revision maps to an existing resource; this
 *   table has no concept of a brand-new, not-yet-existing resource.
 * - `mapped_resource`: a second, unconstrained (no FK) int column that
 *   exists on the table but isn't used by this feature.
 * - `status`: review state (`PENDING` / `APPROVED` / `REJECTED`), not the
 *   resource's operational status.
 */
export type ResourceRevision = Omit<ResourceEntry, "id" | "status"> & {
  id: number;
  mapped_resource: number;
  mapped_resources: number;
  status: RevisionStatus;
};
