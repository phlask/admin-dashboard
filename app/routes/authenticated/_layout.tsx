import { Dashboard, Logout, RateReview } from "@mui/icons-material";
import { Link, NavLink, Outlet } from "react-router";
import phlasklogo from "~/assets/PHLASK_v2.svg";
import { ThemeToggle } from "~/components/ThemeToggle";
import { WaveDivider } from "~/components/WaveDivider";

export const action = () => {};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-navy-800 dark:text-brand-300"
      : "text-navy-600 hover:bg-brand-50 dark:text-brand-100/80 dark:hover:bg-navy-800"
  }`;

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-brand-50 text-navy-900 dark:bg-navy-950 dark:text-brand-50">
      <aside className="flex w-64 flex-col bg-white dark:bg-navy-900">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600 pt-6 pb-9 pl-6 dark:from-navy-600 dark:to-navy-800">
          <div className="inline-flex rounded-xl bg-white/90 p-2 shadow-sm dark:bg-navy-950/70">
            <img src={phlasklogo} alt="PHLASK Logo" className="h-6 w-auto" />
          </div>
          <p className="mt-2 text-xs font-medium text-white/80">
            Admin dashboard
          </p>
          <WaveDivider
            color="currentColor"
            height={22}
            className="bottom-0 text-white dark:text-navy-900"
            duration={22}
          />
        </div>

        <nav className="flex flex-1 flex-col justify-between p-4">
          <ul className="space-y-1">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                <Dashboard fontSize="small" />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/reviews" className={navLinkClass}>
                <RateReview fontSize="small" />
                Reviews
              </NavLink>
            </li>
          </ul>

          <div className="space-y-2 border-t border-brand-100 pt-3 dark:border-navy-700">
            <div className="flex items-center justify-between rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-navy-500 dark:text-brand-100/70">
                Theme
              </span>
              <ThemeToggle />
            </div>
            <Link
              to="/logout"
              className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-brand-50 dark:text-brand-100/80 dark:hover:bg-navy-800"
            >
              <Logout fontSize="small" />
              Logout
            </Link>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
