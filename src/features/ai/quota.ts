// the Smart Engineer's allowance left today, for any screen that shows it (the store lives in services/ai-service.ts)
import { useEffect, useState } from "react";
import { onQuota, quotaNow } from "../../services/ai-service";

export function useQuota() {
  const [q, setQ] = useState(quotaNow());
  useEffect(() => {
    const off = onQuota(setQ);
    return () => {
      off();
    };
  }, []);
  return q;
}
