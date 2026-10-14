import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogEntry } from "~/types/AuditLog";

const TABLE_NAME = "audit_log";

export type AuditLogQuery = {
  limit: number;
  offset: number;
  /** Case-insensitive substring of the actor (email / user id) */
  actor?: string;
  action?: string;
  tableName?: string;
  recordId?: string;
  /** Inclusive ISO timestamps */
  from?: string;
  to?: string;
  ascending?: boolean;
};

/** `ilike` treats % and _ as wildcards; escape them so a search is literal. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export const getAuditLogAPI = (client: SupabaseClient) => ({
  getList: async (params: AuditLogQuery) => {
    let query = client
      .from(TABLE_NAME)
      .select("*", { count: "exact" })
      .order("occurred_at", { ascending: params.ascending ?? false })
      .order("id", { ascending: params.ascending ?? false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.actor) {
      query = query.ilike("actor", `%${escapeLike(params.actor)}%`);
    }
    if (params.action) {
      query = query.eq("action", params.action);
    }
    if (params.tableName) {
      query = query.eq("table_name", params.tableName);
    }
    if (params.recordId) {
      query = query.eq("record_id", params.recordId);
    }
    if (params.from) {
      query = query.gte("occurred_at", params.from);
    }
    if (params.to) {
      query = query.lte("occurred_at", params.to);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return { data: (data ?? []) as AuditLogEntry[], count: count ?? 0 };
  },
});

export default getAuditLogAPI;
