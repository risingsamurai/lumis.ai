import { useEffect, useState } from "react";

export function useBackendHealth() {
  const [status, setStatus] = useState<"checking" | "online" | "warming">("checking");
  
  useEffect(() => {
    const start = Date.now();
    fetch("https://cfisshy-ai.onrender.com/health")
      .then(res => {
        if (res.ok) {
          const elapsed = Date.now() - start;
          setStatus(elapsed > 3000 ? "warming" : "online");
        }
      })
      .catch(() => setStatus("warming"));
  }, []);
  
  return status;
}
