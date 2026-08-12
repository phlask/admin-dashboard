import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EditReviewStatus,
  ResourceEdit,
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
    getList: async (params: { review_status?: EditReviewStatus } = {}) => {
      let query = table.select("*").order("submitted_at", { ascending: false });

      if (params.review_status) {
        query = query.eq("review_status", params.review_status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []) as ResourceEdit[];
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
