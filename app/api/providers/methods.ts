import type { SupabaseClient } from "@supabase/supabase-js";
import type { Provider, ProviderInput } from "~/types/Provider";

const TABLE_NAME = "providers";
const COUNTS_VIEW_NAME = "resource_provider_counts";

export const getProviderAPI = (client: SupabaseClient) => {
  const table = client.from(TABLE_NAME);

  return {
    getList: async () => {
      const { data, error } = await table
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as Provider[];
    },
    getById: async (id: number) => {
      const { data, error } = await table
        .select("*")
        .eq("id", id)
        .single<Provider>();

      if (error) {
        throw error;
      }

      return data;
    },
    create: async (values: ProviderInput) => {
      const { data, error } = await table
        .insert(values)
        .select()
        .single<Provider>();

      if (error) {
        throw error;
      }

      return data;
    },
    updateById: async (id: number, values: ProviderInput) => {
      const { data, error } = await table
        .update(values)
        .eq("id", id)
        .select()
        .single<Provider>();

      if (error) {
        throw error;
      }

      return data;
    },

    delete: async (id: number) => {
      const { data, error } = await table.delete().eq("id", id).select("id");

      if (error) {
        throw error;
      }

      return (data ?? []).length > 0;
    },

    getResourceCounts: async () => {
      const { data, error } = await client
        .from(COUNTS_VIEW_NAME)
        .select("provider_id, resource_count");

      if (error) {
        throw error;
      }

      const counts: Record<number, number> = {};
      for (const row of data ?? []) {
        counts[row.provider_id] = Number(row.resource_count);
      }

      return counts;
    },
  };
};

export default getProviderAPI;
