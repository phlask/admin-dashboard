import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResourceEdit,
  ResourceEditReviewStatus,
} from "~/types/ResourceRevision";

const TABLE_NAME = "resource_edits";

export const getResourceRevisionAPI = (client: SupabaseClient) => {
  const table = client.from(TABLE_NAME);

  return {
    getList: async (params: { status?: ResourceEditReviewStatus } = {}) => {
      let query = table.select("*").order("date_created", { ascending: false });

      if (params.status) {
        query = query.eq("review_status", params.status);
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
    updateStatus: async (id: number, status: ResourceEditReviewStatus) => {
      const { data, error } = await table
        .update({ status })
        .eq("id", id)
        .select()
        .single<ResourceEdit>();

      if (error) {
        throw error;
      }

      return data;
    },
    updateFields: async (id: number, values: Partial<ResourceEdit>) => {
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
  };
};

export default getResourceRevisionAPI;
