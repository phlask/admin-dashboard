import type { ResourceEntry } from "~/types/ResourceEntry";

export type ColumnDefinition = {
  header: string;
  accessorKey: keyof ResourceEntry | string;
  width?: string;
  render?: (row: ResourceEntry) => React.ReactNode;
};

// Common Columns for all Resources
export const COMMON_COLUMNS: ColumnDefinition[] = [
  { header: "Site ID", accessorKey: "id", width: "70px" },
  { header: "Site Title", accessorKey: "name", width: "200px" },
  {
    header: "Address",
    accessorKey: "address",
    render: (row) => (
      <div>
        <div className="font-medium">{row.address || "No Address"}</div>
        <div className="text-xs text-gray-500">
          {row.city}, {row.state}
        </div>
      </div>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
    render: (row) => (
      <span
        className={`px-2 py-1 rounded-full text-xs ${
          row.status === "OPERATIONAL"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {row.status?.replace("_", " ") || "UNKNOWN"}
      </span>
    ),
  },
  {
    header: "Verification",
    accessorKey: "verification.verified",
    render: (row) =>
      row.verification?.verified ? (
        <span className="text-green-400">Verified</span>
      ) : (
        <span className="text-red-400">Unverified</span>
      ),
  },
];

// Specific Columns for WATER
export const WATER_COLUMNS: ColumnDefinition[] = [
  {
    header: "Dispenser Type",
    accessorKey: "water.dispenser_type",
    render: (row) => row.water?.dispenser_type?.join(", ") || "N/A",
  },
  {
    header: "Tags",
    accessorKey: "water.tags",
    render: (row) => (
      <div className="flex gap-1 flex-wrap">
        {row.water?.tags?.map((tag) => (
          <span
            key={tag}
            className="text-[10px] border px-1 rounded bg-gray-50"
          >
            {tag}
          </span>
        ))}
      </div>
    ),
  },
];

// Specific Columns for FOOD
export const FOOD_COLUMNS: ColumnDefinition[] = [
  {
    header: "Food Type",
    accessorKey: "food.food_type",
    render: (row) => row.food?.food_type?.join(", ") || "N/A",
  },
  {
    header: "Distribution",
    accessorKey: "food.distribution_type",
    render: (row) => row.food?.distribution_type?.join(", ") || "N/A",
  },
];

// custom colums for other resouses can be added as above as needed

// Colums Config Object
export const RESOURCE_COLUMNS_CONFIG = {
  WATER: [...COMMON_COLUMNS, ...WATER_COLUMNS],
  FOOD: [...COMMON_COLUMNS, ...FOOD_COLUMNS],
  FORAGE: [...COMMON_COLUMNS],
  BATHROOM: [...COMMON_COLUMNS],
};
