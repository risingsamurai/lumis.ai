import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import { PageLayout } from "./components/layout/PageLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NewAudit from "./pages/NewAudit";
import AuditReport from "./pages/AuditReport";
import Playground from "./pages/Playground";
import Compare from "./pages/Compare";
import Settings from "./pages/Settings";
import { Skeleton } from "./components/ui/Skeleton";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                   focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand-primary 
                   focus:text-white focus:rounded-lg focus:shadow-lg
                   focus:outline-none focus:ring-2 focus:ring-brand-secondary"
      >
        Skip to main content
      </a>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          element={
            <ProtectedRoute>
              <PageLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/audit/new" element={<NewAudit />} />
          <Route path="/audit/:id" element={<AuditReport />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}
