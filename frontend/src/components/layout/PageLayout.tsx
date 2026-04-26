import { Link, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";

const links = [
  ["/dashboard", "Dashboard"],
  ["/history", "Audit History"],
  ["/audit/new", "New Audit"],
  ["/playground", "Playground"],
  ["/compare", "Compare"],
  ["/settings", "Settings"]
] as const;

export function PageLayout() {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`min-h-screen grid ${collapsed ? "md:grid-cols-[92px_1fr]" : "md:grid-cols-[240px_1fr]"}`}>
      <aside className="hidden border-r border-white/10 p-4 md:block">
        <p className="font-bold text-xl">LUMIS.AII</p>
        <nav className="mt-6 space-y-2">
          {links.map(([to, label]) => (
            <Link key={to} className="block rounded-lg bg-white/5 px-3 py-2 text-sm" to={to}>
              {collapsed ? label[0] : label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.displayName ?? "Auditor"}</h1>
            <p className="text-sm text-white/60">Detect Bias. Build Fairness. Deploy With Confidence.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCollapsed((prev) => !prev)}>
              {collapsed ? "Expand" : "Collapse"}
            </Button>
            <Button variant="ghost" onClick={() => void logout()}>
              Sign Out
            </Button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
