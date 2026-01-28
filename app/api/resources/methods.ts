import type {
  ResourceEntry,
  ResourceStatus,
  ResourceType,
} from "~/types/ResourceEntry";
import type { ModelAPI } from "../types";
import { client } from "../client";

/**
 * Options for paginated fetching of resources
 */
export type ResourceEntryGetListParams = {
  /** The number of resources to fetch per page (default: 50) */
  limit?: number;
  /** The offset for pagination (default: 0) */
  offset?: number;
  /** Filter by resource type */
  resourceType?: ResourceType;
  /** Filter by status */
  status?: ResourceStatus;
};

/**
 * Result of a paginated fetch operation
 */
export type FetchResourcesResult = {
  /** The resources fetched */
  data: ResourceEntry[];
  /** The total count of resources matching the query */
  count: number | null;
  /** Whether there are more resources to fetch */
  hasMore: boolean;
};

const TABLE_NAME = "resources";
const table = client.from(TABLE_NAME);

export const ResourceEntryAPI: ModelAPI<
  ResourceEntry,
  ResourceEntryGetListParams
> = {
  getList: async (params) => {
    const { limit, offset, resourceType, status } = params;
    const isPaginating =
      typeof limit === "number" && typeof offset === "number";

    let query = table.select("*", { count: "exact" });

    if (isPaginating) {
      query = query.range(offset, offset + limit - 1);
    }

    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }

    if (status) {
      query = query.eq("status", status);
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

export default ResourceEntryAPI;
