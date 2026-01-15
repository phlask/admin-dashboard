import { data, Link, useLoaderData } from "react-router";
import { useEffect } from "react";

import { getResources } from "~/utils/db";

import type { FetchResourcesResult } from "~/types/ResourceEntry";

export async function loader(): Promise<FetchResourcesResult> {
  try {
    const fetchedData = await getResources({ limit: 15, offset: 0 });
    return fetchedData;
  } catch (error) {
    console.error("Server Failed to Fetch Data");
    throw data("Failed to fetch data", { status: 500 });
  }
}

export default function Dashboard() {
  const loaderData = useLoaderData<typeof loader>();

  useEffect(() => {
    console.log("Full Loader Data:", loaderData);
    console.log("Resources:", loaderData?.data);
    console.log("Count:", loaderData?.count);
  }, [loaderData]);

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Dashboard Overview
        </h1>
        <p>
          This will be the main dashboard with{" "}
          <Link
            to="https://www.figma.com/design/VGGqwl3Eq3GQIAO9I6LoNW/PHLASK?node-id=14132-40149&t=hYoMMFsOQURyASlX-4"
            className="text-blue-600 hover:underline font-medium"
          >
            this{" "}
          </Link>
          design
        </p>
        <br />
      </div>
      <div>
        <p>Check Logs in Console to see how the data looks like</p>
        <br />
        <Link
          to="https://reactrouter.com/start/framework/data-loading"
          className="text-blue-600 hover:underline font-medium"
        >
          Fetched Based on
        </Link>
      </div>
    </>
  );
}
