import { useEffect } from "react";
import { getResources } from "~/utils/supabase";

export default function Dashboard() {
  // AKNOTES:
  // this is where useLoader has to be used instead of useEffect suggested by Ron????
  // Data fetching is happenig here ... make this into a sperate comp

  // use this data TODO: -- "Suggestions" tab - showing pending edits for a given resource.
  // Fetch and log resources when the page loads
  useEffect(() => {
    const fetchAndLogResources = async () => {
      try {
        console.log("🔄 Fetching PHLask resources...");

        // Fetch the first page of resources
        const result = await getResources({ limit: 10, offset: 0 });

        console.log("✅ Successfully fetched resources!");
        console.log(`📊 Total count: ${result.count}`);
        console.log(`📄 Fetched ${result.data.length} resources`);
        console.log(`➡️  More available: ${result.hasMore}`);
        console.log("🗂️  Resources:\n", result.data);

        // Log some statistics
        const resourceTypes = result.data.reduce((acc, resource) => {
          acc[resource.resource_type] = (acc[resource.resource_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log("\n📈 Resource types breakdown:", resourceTypes);

        // Log a sample resource for reference
        if (result.data.length > 0) {
          console.log("\n📝 Sample resource:", result.data[0]);
        }
      } catch (error) {
        console.error("❌ Error fetching resources:", error);
      }
    };

    fetchAndLogResources();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Dashboard Overview
      </h1>
      <p className="text-gray-600">Welcome to the main landing page.</p>
    </div>
  );
}
