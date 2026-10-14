import type { SupabaseClient } from "@supabase/supabase-js";
import type { GetModelAPI } from "~/api/types";
import type {
  ResourceEntry,
  ResourceStatus,
  ResourceType,
} from "~/types/ResourceEntry";

/**
 * Options for paginated fetching of resources
 */
export type ResourceEntryGetListParams = {
  /** The number of resources to fetch per page */
  limit?: number;
  /** The offset for pagination */
  offset?: number;
  /** Filter by resource type */
  resourceType?: ResourceType;
  /** Filter by status */
  status?: ResourceStatus;
  /** Case-insensitive match against name or address */
  search?: string;
};

/** PostgREST `or=(...)` filters are comma/paren delimited, `"` quotes and
 * `*`/`%` are wildcards, so strip those from user input rather than escaping.
 * Dots are fine inside a value ("N. Broad St"). */
const sanitizeSearch = (value: string) =>
  value
    .replace(/[,()*%"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TABLE_NAME = "resources";

export const getResourceEntryAPI: GetModelAPI<
  ResourceEntry,
  ResourceEntryGetListParams
> = (client) => {
  const table = client.from(TABLE_NAME);

  return {
    getList: async (params) => {
      const { limit, offset, resourceType, status, search } = params;
      const isPaginating =
        typeof limit === "number" && typeof offset === "number";

      // Stable order so pages don't overlap or skip rows.
      let query = table
        .select("*", { count: "exact" })
        .order("id", { ascending: true });

      if (isPaginating) {
        query = query.range(offset, offset + limit - 1);
      }

      if (resourceType) {
        query = query.eq("resource_type", resourceType);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const term = search ? sanitizeSearch(search) : "";
      if (term) {
        query = query.or(`name.ilike.*${term}*,address.ilike.*${term}*`);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      if (!data?.length || !count) {
        return { data: [], count: 0, hasMore: false };
      }

      return {
        data,
        count,
        hasMore: isPaginating ? offset + limit < count : false,
      };
    },
    getById: async (id) => {
      const { data, error } = await table
        .select("*")
        .eq("id", id)
        .single<ResourceEntry>();

      if (error) {
        throw error;
      }

      return data;
    },
    create: async (values) => {
      const { data, error } = await table
        .insert(values)
        .select()
        .single<ResourceEntry>();

      if (error) {
        throw error;
      }

      return data;
    },
    updateById: async (id, values) => {
      const { data, error } = await table
        .update(values)
        .eq("id", id)
        .single<ResourceEntry>();

      if (error) {
        throw error;
      }

      return data;
    },
    delete: async (id) => {
      const { error } = await table.delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
  };
};

export default getResourceEntryAPI;

/** Rough metres-per-degree of latitude; good enough for a search box. */
const METERS_PER_DEGREE = 111_320;

/**
 * Resources inside a square box around a point (plus any sharing the Google
 * Place ID), for duplicate detection. The box is a cheap index-friendly
 * pre-filter; callers do the exact distance check.
 */
export const getNearbyResources = async (
  client: SupabaseClient,
  point: { latitude: number; longitude: number; gpId?: string | null },
  radiusMeters: number,
  limit = 50,
) => {
  const latDelta = radiusMeters / METERS_PER_DEGREE;
  const lngDelta =
    radiusMeters /
    (METERS_PER_DEGREE *
      Math.max(Math.cos((point.latitude * Math.PI) / 180), 0.01));

  const [nearby, samePlace] = await Promise.all([
    client
      .from(TABLE_NAME)
      .select("*")
      .gte("latitude", point.latitude - latDelta)
      .lte("latitude", point.latitude + latDelta)
      .gte("longitude", point.longitude - lngDelta)
      .lte("longitude", point.longitude + lngDelta)
      .limit(limit),
    point.gpId
      ? client.from(TABLE_NAME).select("*").eq("gp_id", point.gpId).limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (nearby.error) {
    throw nearby.error;
  }
  if (samePlace.error) {
    throw samePlace.error;
  }

  const byId = new Map<number, ResourceEntry & { id: number }>();
  for (const row of [...(nearby.data ?? []), ...(samePlace.data ?? [])]) {
    byId.set(Number(row.id), row as ResourceEntry & { id: number });
  }
  return [...byId.values()];
};
