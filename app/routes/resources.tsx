import { useState, useEffect } from "react";
import { getResources } from "~/utils/supabase";
import { ResourceTable } from "~/components/tables/ResourcesTable";
import type { ResourceEntry } from "~/types/ResourceEntry";
import { RESOURCE_COLUMNS_CONFIG } from "~/components/tables/columns";
import { useSearchParams } from "react-router";

type ResourceType = "WATER" | "FOOD" | "FORAGE" | "BATHROOM";

export default function ResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get("tab") as ResourceType) || "WATER";

  const [data, setData] = useState<ResourceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const handleTabChange = (newTab: ResourceType) => {
    setSearchParams((prev) => {
      prev.set("tab", newTab);
      prev.delete("page");
      return prev;
    });
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        console.log("Fetching data for:", activeTab);
        const result = await getResources({
          resourceType: activeTab,
          limit: 20,
        });
        setData(result.data);
      } catch (error) {
        console.error("Failed to fetch", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Resources Dashboard
        </h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(["WATER", "FOOD", "FORAGE", "BATHROOM"] as ResourceType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => handleTabChange(type)}
                className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === type
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            )
          )}
        </nav>
      </div>

      <ResourceTable
        data={data}
        columns={RESOURCE_COLUMNS_CONFIG[activeTab]}
        isLoading={loading}
        onViewClick={(id) => console.log("Navigate to", id)}
      />
    </div>
  );
}
