import { useLoaderData } from "react-router";
import ResourcesAPI from "~/api/resources/methods";
import { Welcome } from "../welcome/welcome";
import type { Route } from "./+types/home";

export function meta(_metaArgs: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader() {
  const result = await ResourcesAPI.getList({ limit: 10, offset: 0 });
  return result;
}

export default function Home() {
  const _data = useLoaderData<typeof loader>();

  return <Welcome />;
}
