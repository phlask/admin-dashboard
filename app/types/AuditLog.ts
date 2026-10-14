/** Actions recorded by the `_audit_row_change` trigger. */
export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "ROLLBACK";

/** Tables the audit triggers are attached to. */
export type AuditedTable = "resource_edits" | "resources" | "providers";

/** A row of the append-only `audit_log` table. */
export type AuditLogEntry = {
  id: number;
  occurred_at: string;
  /** Email of the signed-in user, else their id / role, else `system:<db role>` */
  actor: string;
  actor_id: string | null;
  action: AuditAction;
  table_name: AuditedTable;
  record_id: string | null;
  /** For UPDATEs, the columns whose value changed */
  changed_fields: string[];
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};
