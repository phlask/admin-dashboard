import { Outlet, NavLink } from "react-router";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">
            PHLASK Admin
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {/* Dashboard Link */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            Dashboard
          </NavLink>

          {/* Resources Link */}
          <NavLink
            to="/resources"
            className={({ isActive }) =>
              `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            Resources
          </NavLink>

          {/* Users Link --- FOR FUTURE*/}
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            Users
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        {/* <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <h2 className="text-sm font-semibold text-gray-500">
            Header if needed can be added
          </h2>
        </header> */}

        {/* This is where the pages (Dashboard, Sites, Users) are rendered */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
