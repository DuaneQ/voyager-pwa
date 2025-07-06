// src/hooks/useStripePortal.ts
import { getFunctions, httpsCallable } from "firebase/functions";
import { useCallback, useState } from "react";

export function useStripePortal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const createPortal = httpsCallable(functions, "createStripePortalSession");
      const result: any = await createPortal({});
      if (result?.data?.url) {
        window.location.assign(result.data.url);
      } else {
        setError("Failed to get portal link.");
      }
    } catch (err: any) {
      setError(err?.message || "Error opening portal.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { openPortal, loading, error };
}