import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Result of a paginated fetch operation
 */
type PaginatedResult<Entity> = {
  /** The resources fetched */
  data: Entity[];
  /** The total count of resources matching the query */
  count: number | null;
  /** Whether there are more resources to fetch */
  hasMore: boolean;
};

export type GetModelAPI<Entity, Params> = (client: SupabaseClient) => {
  getList: (params: Params) => Promise<PaginatedResult<Entity>>;
  getById: (id: string) => Promise<Entity>;
  create: (values: Entity) => Promise<Entity>;
  updateById: (id: string, values: Partial<Entity>) => Promise<Entity>;
  delete: (id: string) => Promise<void>;
};
