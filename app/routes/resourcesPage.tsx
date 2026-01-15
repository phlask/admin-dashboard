import {
  data,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";

import type { ResourceEntry } from "~/types/ResourceEntry";
import { getResources } from "~/utils/db";

import { ResourceTable } from "~/components/tables/ResourcesTable";
import { RESOURCE_COLUMNS_CONFIG } from "~/components/tables/columns";
import type { Route } from "../+types/root";

type ResourceType = "WATER" | "FOOD" | "FORAGE" | "BATHROOM";

// type LoaderResult = {
//   resources: {
//     data: ResourceEntry[];
//     count: number | null;
//     hasMore: boolean;
//   };
//   activeTab: ResourceType;
// };

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const activeTab = (url.searchParams.get("tab") as ResourceType) || "WATER";

  const resources = await getResources({
    resourceType: activeTab,
    limit: 20,
  });

  return { resources, activeTab };
}

export default function ResourcesPage() {
  const { resources, activeTab } = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const isDataLoading = navigation.state === "loading";

  const [searchParams, setSearchParams] = useSearchParams();

  const handleTabChange = (newTab: ResourceType) => {
    if (newTab === activeTab) return;

    setSearchParams((prev) => {
      prev.set("tab", newTab);

      return prev;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col justify-between items-baseline">
        <h1 className="text-2xl font-bold text-gray-800">
          Resources Dashboard
        </h1>
        <p className="text-blue-300">
          <i>
            Only 20 resources per type are fethced for now ... maybe we can add
            pagination and other in furhter builds
          </i>
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(["WATER", "FOOD", "FORAGE", "BATHROOM"] as ResourceType[]).map(
            (resourceType, index) => (
              <button
                key={index}
                onClick={() => handleTabChange(resourceType)}
                className={` cursor-pointer
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === resourceType
                    ? "border--b-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-b-gray-300"
                }
              `}
                title={`${resourceType}`}
              >
                {resourceType.charAt(0) + resourceType.slice(1).toLowerCase()}
              </button>
            )
          )}
        </nav>
      </div>

      <ResourceTable
        data={resources.data}
        columns={RESOURCE_COLUMNS_CONFIG[activeTab]}
        isLoading={isDataLoading}
        //  this can later be used to take us to resource edit page
        onViewClick={(id) => console.log("Navigate to", id)}
      />
    </div>
  );
}
