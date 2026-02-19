import { Outlet } from "react-router";

import phlasklogo from "~/assets/PHLASK_v2.svg";

export default function UnauthenticatedLayout() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">
            <img src={phlasklogo} alt="PHLASK Logo" />
          </h1>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
