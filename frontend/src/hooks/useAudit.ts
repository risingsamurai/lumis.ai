import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { demoAudit } from "../utils/mockData";

export function useAudit() {
  const { id } = useParams();
  const audit = useMemo(() => demoAudit, [id]);
  return { audit, loading: false };
}
