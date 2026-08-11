import type { SupabaseClient } from "@supabase/supabase-js";
import type { Provider, ProviderInput } from "~/types/Provider";

const TABLE_NAME = "providers";
const JOIN_TABLE_NAME = "resource_providers";

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
      const { error } = await table.delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
    /**
     * How many resources each provider is currently attributed to, keyed by
     * provider id. Used to warn before removing a provider that is still in use.
     */
    getResourceCounts: async () => {
      const { data, error } = await client
        .from(JOIN_TABLE_NAME)
        .select("provider_id");

      if (error) {
        throw error;
      }

      const counts: Record<number, number> = {};
      for (const row of data ?? []) {
        counts[row.provider_id] = (counts[row.provider_id] ?? 0) + 1;
      }

      return counts;
    },
  };
};

export default getProviderAPI;
