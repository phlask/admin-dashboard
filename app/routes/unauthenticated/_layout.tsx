import { Outlet } from "react-router";

import phlasklogo from "~/assets/PHLASK_v2.svg";

export default function UnauthenticatedLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 text-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src={phlasklogo} alt="PHLASK Logo" className="h-10" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
