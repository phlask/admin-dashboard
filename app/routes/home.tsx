import { useEffect } from "react";
import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { getResources } from "~/utils/supabase";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  useEffect(() => {
    // Fetch and log resources when the page loads
    const fetchAndLogResources = async () => {
      try {
        console.log("🔄 Fetching PHLask resources...");

        // Fetch the first page of resources
        const result = await getResources({ limit: 10, offset: 0 });

        console.log("✅ Successfully fetched resources!");
        console.log(`📊 Total count: ${result.count}`);
        console.log(`📄 Fetched ${result.data.length} resources`);
        console.log(`➡️  More available: ${result.hasMore}`);
        console.log("\n🗂️  Resources:", result.data);

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

  return <Welcome />;
}
