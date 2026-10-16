// A small in-memory stand-in for Supabase (GoTrue + PostgREST + the review
// RPCs) so the dashboard can be exercised end to end without credentials.
//
// Only what the dashboard uses is implemented. Test helpers:
//   POST /__reset  restore the seed data and clear the request log
//   GET  /__log    every request received since the last reset
import http from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54400);

export const TEST_PASSWORD = "correct-horse";

const baseResource = {
  id: 1,
  version: 1,
  date_created: "2025-01-01T00:00:00Z",
  creator: "phlask_app",
  last_modified: "2025-01-01T00:00:00Z",
  last_modifier: "phlask_app",
  source: { type: "MANUAL" },
  verification: { verified: true, last_modified: "2025-01-01", verifier: "x" },
  resource_type: "WATER",
  address: "55 North Broad Street, Philadelphia, PA, USA",
  city: "Philadelphia",
  state: "Pennsylvania",
  zip_code: "19107",
  latitude: 39.9540848,
  longitude: -75.1628833,
  gp_id: null,
  images: [],
  guidelines: "Bring your own container.",
  description: "A daytime services drop-in center.",
  name: "Grace Cafe Philly",
  status: "OPERATIONAL",
  entry_type: "OPEN",
  hours: null,
  water: { dispenser_type: ["SINK"], tags: ["BYOB", "FILTERED"] },
  food: null,
  forage: null,
  bathroom: null,
};

const reviewColumns = {
  review_status: "PENDING",
  submitted_by: null,
  submitted_at: "2026-10-01T12:00:00Z",
  reviewed_by: null,
  reviewed_at: null,
  review_notes: null,
  cleared_fields: [],
  applied_snapshot: null,
};

const nullFields = Object.fromEntries(
  Object.keys(baseResource).map((key) => [key, null]),
);

const seed = () => {
  const resources = new Map([[1, { ...baseResource }]]);
  // A far-away resource for list/pagination tests.
  resources.set(2, {
    ...baseResource,
    id: 2,
    name: "Love Park Fountain",
    address: "1599 JFK Blvd",
    latitude: 39.9541,
    longitude: -75.1661,
  });

  const edits = new Map();
  const add = (edit) => edits.set(edit.id, edit);
  // Approved history for resource 1, oldest first.
  add({
    ...baseResource,
    ...reviewColumns,
    id: 3,
    mapped_resource: 1,
    review_status: "APPROVED",
    submitted_by: "carol@example.com",
    reviewed_by: "vol@phlask.org",
    reviewed_at: "2026-09-01T00:00:00Z",
    applied_snapshot: {
      ...baseResource,
      name: "Grace Cafe",
      guidelines: "Bring a bottle.",
    },
  });
  add({
    ...baseResource,
    ...reviewColumns,
    id: 4,
    mapped_resource: 1,
    review_status: "APPROVED",
    submitted_by: "erin@example.com",
    reviewed_by: "vol@phlask.org",
    reviewed_at: "2026-09-12T00:00:00Z",
    applied_snapshot: { ...baseResource },
  });
  add({
    ...baseResource,
    ...reviewColumns,
    id: 5,
    mapped_resource: 1,
    review_status: "REJECTED",
    submitted_by: "spam@example.com",
    reviewed_by: "vol@phlask.org",
    reviewed_at: "2026-09-11T00:00:00Z",
    review_notes: "Spam",
  });
  // Pending: a name-only edit (sparse — NULL means "no change").
  add({
    ...nullFields,
    ...reviewColumns,
    id: 7,
    mapped_resource: 1,
    submitted_by: "alice@example.com",
    name: "Grace Cafe (Broad St)",
  });
  // Pending: brand-new site 5 m from resource 1.
  add({
    ...baseResource,
    ...reviewColumns,
    id: 8,
    mapped_resource: null,
    submitted_at: "2026-10-02T12:00:00Z",
    name: "Grace Cafe Phila",
    address: "55 N. Broad St",
    latitude: 39.95412,
    longitude: -75.16288,
  });
  return { resources, edits, audit: [] };
};

let state = seed();
let log = [];

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "reviewer@phlask.org",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-01-05T10:00:00Z",
  last_sign_in_at: "2026-10-14T09:00:00Z",
  user_metadata: {},
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

const parseValue = (raw) => {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
};

const loose = (a, b) => String(a) === String(b);

/** Applies the PostgREST query-string filters the dashboard uses. */
const applyFilters = (rows, params) => {
  let out = rows;
  for (const [key, value] of params) {
    if (["select", "order", "offset", "limit", "columns"].includes(key)) {
      continue;
    }
    if (key === "or") {
      const terms = [
        ...value.slice(1, -1).matchAll(/(\w+)\.ilike\.\*([^,]*)\*/g),
      ];
      out = out.filter((row) =>
        terms.some(([, column, term]) =>
          String(row[column] ?? "")
            .toLowerCase()
            .includes(term.toLowerCase()),
        ),
      );
      continue;
    }
    const dot = value.indexOf(".");
    const op = value.slice(0, dot);
    const operand = value.slice(dot + 1);
    out = out.filter((row) => {
      const cell = row[key];
      switch (op) {
        case "eq":
          return loose(cell, operand);
        case "neq":
          return !loose(cell, operand);
        case "is":
          return cell === parseValue(operand);
        case "in":
          return operand
            .slice(1, -1)
            .split(",")
            .some((v) => loose(cell, v));
        case "gte":
          return Number(cell) >= Number(operand) || String(cell) >= operand;
        case "lte":
          return Number(cell) <= Number(operand) || String(cell) <= operand;
        case "ilike":
          return String(cell ?? "")
            .toLowerCase()
            .includes(operand.replaceAll("%", "").toLowerCase());
        default:
          return true;
      }
    });
  }

  const order = params.get("order");
  if (order) {
    const keys = order.split(",").map((part) => {
      const [column, direction] = part.split(".");
      return { column, desc: direction === "desc" };
    });
    out = [...out].sort((a, b) => {
      for (const { column, desc } of keys) {
        const x = a[column];
        const y = b[column];
        if (x === y) continue;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * (desc ? -1 : 1);
      }
      return 0;
    });
  }
  return out;
};

const respondRows = (req, res, rows, params) => {
  const total = rows.length;
  const offset = Number(params.get("offset") ?? 0);
  const limit = Number(params.get("limit") ?? total);
  const page = rows.slice(offset, offset + limit);
  const headers = {
    "content-range": `${offset}-${Math.max(offset + page.length - 1, 0)}/${total}`,
  };
  if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
    return page.length === 1
      ? send(res, 200, page[0], headers)
      : send(res, 406, {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
        });
  }
  if (req.method === "HEAD") {
    return send(res, 200, undefined, headers);
  }
  return send(res, 200, page, headers);
};

const MIRRORED = Object.keys(baseResource).filter((key) => key !== "id");

/** Mirrors the audit_log triggers so the Audit log page has something to
 * show after you approve, reject, roll back or save in the UI. */
const audit = (action, tableName, before, after) => {
  const changed =
    before && after
      ? Object.keys(after).filter(
          (key) =>
            key !== "applied_snapshot" &&
            JSON.stringify(before[key]) !== JSON.stringify(after[key]),
        )
      : [];
  state.audit.push({
    id: state.audit.length + 1,
    occurred_at: new Date().toISOString(),
    actor: user.email,
    actor_id: user.id,
    action,
    table_name: tableName,
    record_id: String((after ?? before).id),
    changed_fields: changed,
    old_data: before,
    new_data: after,
  });
};

const applyEdit = (edit) => {
  const target = state.resources.get(edit.mapped_resource);
  for (const key of MIRRORED) {
    if (edit[key] !== null && edit[key] !== undefined) target[key] = edit[key];
  }
  for (const key of edit.cleared_fields ?? []) {
    if (MIRRORED.includes(key)) target[key] = null;
  }
  target.last_modified = new Date().toISOString();
  return target;
};

const rpc = (name, args) => {
  const edit = state.edits.get(Number(args.p_edit_id));
  if (!edit) return [400, { message: `edit ${args.p_edit_id} not found` }];
  const editBefore = { ...edit };
  const resourceBefore = edit.mapped_resource
    ? { ...state.resources.get(edit.mapped_resource) }
    : null;
  if (name === "approve_edit") {
    if (edit.review_status !== "PENDING")
      return [400, { message: "not PENDING" }];
    let resource;
    if (edit.mapped_resource === null) {
      const id = Math.max(...state.resources.keys()) + 1;
      resource = { ...baseResource, ...edit, id };
      state.resources.set(id, resource);
      edit.mapped_resource = id;
    } else {
      resource = applyEdit(edit);
    }
    Object.assign(edit, {
      review_status: "APPROVED",
      reviewed_by: args.p_reviewer,
      reviewed_at: new Date().toISOString(),
      applied_snapshot: { ...resource },
    });
    audit(resourceBefore ? "UPDATE" : "INSERT", "resources", resourceBefore, {
      ...resource,
    });
    audit("APPROVE", "resource_edits", editBefore, { ...edit });
    return [200, resource];
  }
  if (name === "reject_edit") {
    if (edit.review_status !== "PENDING")
      return [400, { message: "not PENDING" }];
    Object.assign(edit, {
      review_status: "REJECTED",
      reviewed_by: args.p_reviewer,
      reviewed_at: new Date().toISOString(),
      review_notes: args.p_notes,
    });
    audit("REJECT", "resource_edits", editBefore, { ...edit });
    return [200, edit];
  }
  if (name === "rollback_to_edit") {
    if (edit.review_status !== "APPROVED")
      return [400, { message: "not an applied edit" }];
    const target = state.resources.get(edit.mapped_resource);
    Object.assign(target, edit.applied_snapshot, {
      id: target.id,
      last_modified: new Date().toISOString(),
    });
    audit("ROLLBACK", "resources", resourceBefore, { ...target });
    return [200, target];
  }
  return [404, { message: `unknown rpc ${name}` }];
};

const views = () => {
  const edits = [...state.edits.values()];
  const pending = edits.filter((e) => e.review_status === "PENDING");
  const count = (rows, key) =>
    Object.entries(
      rows.reduce((acc, row) => {
        if (row[key]) acc[row[key]] = (acc[row[key]] ?? 0) + 1;
        return acc;
      }, {}),
    );
  return {
    resource_edits: edits,
    resources: [...state.resources.values()],
    resource_edits_queue: pending
      .filter((e) => e.mapped_resource !== null)
      .map((e) => ({
        ...e,
        current_resource: state.resources.get(e.mapped_resource),
      })),
    new_resources_queue: pending.filter((e) => e.mapped_resource === null),
    resource_edit_counts: count(
      pending.filter((e) => e.mapped_resource),
      "mapped_resource",
    ).map(([id, n]) => ({ resource_id: Number(id), pending_count: n })),
    resource_change_log: edits
      .filter((e) => e.review_status !== "PENDING")
      .map((e) => ({
        edit_id: e.id,
        resource_id: e.mapped_resource,
        review_status: e.review_status,
        submitted_by: e.submitted_by,
        reviewed_by: e.reviewed_by,
        reviewed_at: e.reviewed_at,
        review_notes: e.review_notes,
      })),
    resource_edit_submitter_counts: count(edits, "submitted_by").map(
      ([who, n]) => ({
        submitted_by: who,
        submission_count: n,
      }),
    ),
    resource_edit_approver_counts: count(
      edits.filter((e) => e.review_status === "APPROVED"),
      "reviewed_by",
    ).map(([who, n]) => ({ reviewed_by: who, approval_count: n })),
    // Sparse edits count under their target resource's type, like the view.
    resource_edit_pending_by_type: count(
      pending.map((e) => ({
        resource_type:
          e.resource_type ??
          state.resources.get(e.mapped_resource)?.resource_type,
      })),
      "resource_type",
    ).map(([type, n]) => ({
      resource_type: type,
      pending_count: n,
    })),
    audit_log: state.audit,
    providers: [],
    resource_provider_counts: [],
  };
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let body = "";
  for await (const chunk of req) body += chunk;
  const path = url.pathname;

  if (path === "/__reset") {
    state = seed();
    log = [];
    user.user_metadata = {};
    return send(res, 204);
  }
  if (path === "/__log") return send(res, 200, log);
  log.push({
    method: req.method,
    path,
    query: url.search,
    body: body ? JSON.parse(body) : null,
  });

  if (path === "/auth/v1/user") {
    if (req.method === "PUT") {
      const update = JSON.parse(body);
      if (update.data)
        user.user_metadata = { ...user.user_metadata, ...update.data };
    }
    return send(res, 200, user);
  }
  if (path === "/auth/v1/token") {
    if (JSON.parse(body).password !== TEST_PASSWORD) {
      return send(res, 400, {
        code: 400,
        error_code: "invalid_credentials",
        msg: "Invalid login credentials",
      });
    }
    return send(res, 200, {
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "mock-refresh",
      user,
    });
  }
  if (path === "/auth/v1/logout") return send(res, 204);

  if (path.startsWith("/rest/v1/rpc/")) {
    const [status, payload] = rpc(
      path.slice("/rest/v1/rpc/".length),
      JSON.parse(body || "{}"),
    );
    return send(res, status, payload);
  }

  const table = path.slice("/rest/v1/".length);
  const all = views()[table];
  if (!all)
    return send(res, 404, { message: `mock: unknown relation ${table}` });

  if (req.method === "PATCH" && table === "resource_edits") {
    const changes = JSON.parse(body);
    const matched = applyFilters(all, url.searchParams);
    for (const row of matched) {
      const before = { ...row };
      Object.assign(row, changes);
      audit("UPDATE", "resource_edits", before, { ...row });
    }
    return respondRows(req, res, matched, new URLSearchParams());
  }

  return respondRows(
    req,
    res,
    applyFilters(all, url.searchParams),
    url.searchParams,
  );
});

server.listen(PORT, () => {
  console.log(`mock supabase listening on ${PORT}`);
});
