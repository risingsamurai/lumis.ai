import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAuditStore } from "../store/auditStore";
import { firestoreService } from "../services/firestoreService";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { SeverityBadge } from "../components/ui/Badge";
import { FairnessGauge } from "../components/charts/FairnessGauge";
import toast from "react-hot-toast";

export default function AuditHistory() {
  const { user } = useAuth();
  const { audits, setAudits, loadingAudits, setLoadingAudits, hasFetchedAudits, setHasFetchedAudits } = useAuditStore();
  const nav = useNavigate();

  useEffect(() => {
    async function loadAudits() {
      if (!user || hasFetchedAudits) return;
      setLoadingAudits(true);
      try {
        const history = await firestoreService.getUserAudits(user.uid);
        setAudits(history);
        setHasFetchedAudits(true);
      } catch (err: any) {
        toast.error("Failed to load audit history: " + err.message);
        console.error("Failed to load audit history", err);
      } finally {
        setLoadingAudits(false);
      }
    }
    loadAudits();
  }, [user, setAudits, setLoadingAudits, hasFetchedAudits, setHasFetchedAudits]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit History</h1>
        <p className="mt-2 text-white/70">Review past fairness audits and mitigation reports.</p>
      </div>

      {loadingAudits ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : audits.length === 0 ? (
        <Card className="text-center py-12">
          <h3 className="text-xl font-semibold">No audits found</h3>
          <p className="mt-2 text-white/60">You haven't run any fairness audits yet.</p>
          <Button className="mt-6" onClick={() => nav("/audit/new")}>
            Start New Audit
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audits.map((audit) => (
            <Card key={audit.id}>
              <div 
                className="flex cursor-pointer flex-col h-full transition-all hover:-translate-y-1 hover:border-brand-primary/50"
                onClick={() => nav(`/audit/${audit.id}`)}
              >
                <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{audit.datasetName}</h3>
                  <p className="text-xs text-white/50">
                    {audit.createdAt && typeof audit.createdAt === "object" && "toDate" in audit.createdAt
                      ? audit.createdAt.toDate().toLocaleDateString()
                      : new Date(audit.createdAt as any).toLocaleDateString()}
                  </p>
                </div>
                {audit.severity && <SeverityBadge severity={audit.severity} />}
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="h-16 w-16">
                  <FairnessGauge score={audit.biasScore} />
                </div>
                <div className="text-sm font-medium text-brand-primary">
                  View Report →
                </div>
              </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
