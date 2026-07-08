import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResourceRevision,
  RevisionStatus,
} from "~/types/ResourceRevision";

const TABLE_NAME = "resource_revisions";

export const getResourceRevisionAPI = (client: SupabaseClient) => {
  const table = client.from(TABLE_NAME);

  return {
    getList: async (params: { status?: RevisionStatus } = {}) => {
      let query = table.select("*").order("date_created", { ascending: false });

      if (params.status) {
        query = query.eq("status", params.status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []) as ResourceRevision[];
    },
    getById: async (id: number) => {
      const { data, error } = await table
        .select("*")
        .eq("id", id)
        .single<ResourceRevision>();

      if (error) {
        throw error;
      }

      return data;
    },
    updateStatus: async (id: number, status: RevisionStatus) => {
      const { data, error } = await table
        .update({ status })
        .eq("id", id)
        .select()
        .single<ResourceRevision>();

      if (error) {
        throw error;
      }

      return data;
    },
    updateFields: async (id: number, values: Partial<ResourceRevision>) => {
      const { data, error } = await table
        .update(values)
        .eq("id", id)
        .select()
        .single<ResourceRevision>();

      if (error) {
        throw error;
      }

      return data;
    },
  };
};

export default getResourceRevisionAPI;
