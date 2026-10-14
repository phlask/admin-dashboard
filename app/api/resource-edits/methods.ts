import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResourceChangeLogEntry,
  ResourceEdit,
  ResourceEditCount,
  ResourceEditQueueRow,
} from "~/types/ResourceEdit";
import type { ResourceEntry } from "~/types/ResourceEntry";

const TABLE_NAME = "resource_edits";

export const getResourceEditAPI = (client: SupabaseClient) => {
  const table = client.from(TABLE_NAME);

  return {
    /** All pending edits to existing resources, joined to the current resource for compare. */
    getEditsQueue: async () => {
      const { data, error } = await client
        .from("resource_edits_queue")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as ResourceEditQueueRow[];
    },
    /** All pending brand-new site submissions (no mapped_resource). */
    getNewResourcesQueue: async () => {
      const { data, error } = await client
        .from("new_resources_queue")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as ResourceEdit[];
    },
    /** Count of PENDING edits per resource — flags resources with multiple
     * competing proposed edits. Backed by `resource_edit_counts`. */
    getEditCounts: async () => {
      const { data, error } = await client
        .from("resource_edit_counts")
        .select("*");

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => ({
        resource_id: Number(row.resource_id),
        pending_count: Number(row.pending_count),
      })) as ResourceEditCount[];
    },
    /** Other PENDING edits targeting the same resource — competing
     * proposals the reviewer should see before approving this one. */
    getOtherPendingForResource: async (
      resourceId: number,
      exceptId: number,
    ) => {
      const { data, error } = await table
        .select("id, name, submitted_by, submitted_at")
        .eq("mapped_resource", resourceId)
        .eq("review_status", "PENDING")
        .neq("id", exceptId)
        .order("submitted_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as Pick<
        ResourceEdit,
        "id" | "name" | "submitted_by" | "submitted_at"
      >[];
    },
    getChangeLogForResource: async (resourceId: number) => {
      const { data, error } = await client
        .from("resource_change_log")
        .select("*")
        .eq("resource_id", resourceId)
        .order("reviewed_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as ResourceChangeLogEntry[];
    },

    /** Dashboard aggregates, computed in the DB so they aren't truncated by
     * PostgREST's max-rows cap. Backed by the `resource_edit_*_counts` and
     * `resource_edit_pending_by_type` views. */
    getStats: async (limit = 5) => {
      const [submitters, approvers, pendingByType] = await Promise.all([
        client
          .from("resource_edit_submitter_counts")
          .select("submitted_by, submission_count")
          .order("submission_count", { ascending: false })
          .order("submitted_by", { ascending: true })
          .limit(limit),
        client
          .from("resource_edit_approver_counts")
          .select("reviewed_by, approval_count")
          .order("approval_count", { ascending: false })
          .order("reviewed_by", { ascending: true })
          .limit(limit),
        client
          .from("resource_edit_pending_by_type")
          .select("resource_type, pending_count"),
      ]);

      for (const result of [submitters, approvers, pendingByType]) {
        if (result.error) {
          throw result.error;
        }
      }

      // count(*) is a bigint, which PostgREST may serialise as a string.
      return {
        topSubmitters: (submitters.data ?? []).map((row) => ({
          submitter: row.submitted_by as string,
          count: Number(row.submission_count),
        })),
        topApprovers: (approvers.data ?? []).map((row) => ({
          reviewer: row.reviewed_by as string,
          count: Number(row.approval_count),
        })),
        pendingByType: Object.fromEntries(
          (pendingByType.data ?? []).map((row) => [
            row.resource_type as string,
            Number(row.pending_count),
          ]),
        ) as Record<string, number>,
      };
    },

    getCounts: async () => {
      const [total, pending] = await Promise.all([
        table.select("id", { count: "exact", head: true }),
        table
          .select("id", { count: "exact", head: true })
          .eq("review_status", "PENDING"),
      ]);

      if (total.error) {
        throw total.error;
      }
      if (pending.error) {
        throw pending.error;
      }

      return { total: total.count ?? 0, pending: pending.count ?? 0 };
    },
    getById: async (id: number) => {
      const { data, error } = await table
        .select("*")
        .eq("id", id)
        .single<ResourceEdit>();

      if (error) {
        throw error;
      }

      return data;
    },
    /** Partial update to the proposed values while an edit is PENDING. */
    updateFields: async (id: number, values: Partial<ResourceEntry>) => {
      const { data, error } = await table
        .update(values)
        .eq("id", id)
        .select()
        .single<ResourceEdit>();

      if (error) {
        throw error;
      }

      return data;
    },
    /** Approves the edit via the `approve_edit` RPC — applies it to `resources`
     * (updating the mapped resource, or inserting a new one) so the change
     * goes live on the map. Returns the resulting `resources` row. */
    approve: async (id: number, reviewer: string) => {
      const { data, error } = await client
        .rpc("approve_edit", { p_edit_id: id, p_reviewer: reviewer })
        .single<ResourceEntry & { id: number }>();

      if (error) {
        throw error;
      }

      return data;
    },
    reject: async (id: number, reviewer: string, notes?: string) => {
      const { data, error } = await client
        .rpc("reject_edit", {
          p_edit_id: id,
          p_reviewer: reviewer,
          p_notes: notes ?? null,
        })
        .single<ResourceEdit>();

      if (error) {
        throw error;
      }

      return data;
    },
  };
};

export default getResourceEditAPI;
