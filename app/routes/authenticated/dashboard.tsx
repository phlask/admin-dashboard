import type { MiddlewareFunction } from "react-router";
import { authMiddleware } from "~/middleware/auth";

export const middleware: MiddlewareFunction[] = [authMiddleware];

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Dashboard Overview
      </h1>
    </div>
  );
}
