import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { useDeployment } from "./DeploymentProvider";
import { loadZamaClient, type ZamaClient, type ZamaStatus } from "../lib/zama";

interface ZamaContextValue {
  status: ZamaStatus;
  client: ZamaClient | null;
  error: string | null;
  ensureReady: () => Promise<ZamaClient>;
  retry: () => void;
}

const ZamaContext = createContext<ZamaContextValue | null>(null);

export function ZamaProvider({ children }: PropsWithChildren) {
  const { runtime, manifest, status: deploymentStatus } = useDeployment();
  const [status, setStatus] = useState<ZamaStatus>("idle");
  const [client, setClient] = useState<ZamaClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Promise<ZamaClient> | null>(null);

  const initialize = useCallback(async () => {
    if (client) return client;
    if (pendingRef.current) return pendingRef.current;
    if (!manifest || deploymentStatus !== "ready") {
      throw new Error("The verified Sepolia deployment is not ready for Zama initialization.");
    }
    const pending = (async () => {
      setStatus("loading");
      setError(null);
      try {
        const next = await loadZamaClient(runtime, manifest);
        setClient(next);
        setStatus("ready");
        return next;
      } catch (cause) {
        setClient(null);
        setStatus("unavailable");
        const message = cause instanceof Error ? cause.message : "Zama services are unavailable";
        setError(message);
        throw cause instanceof Error ? cause : new Error(message);
      } finally {
        pendingRef.current = null;
      }
    })();
    pendingRef.current = pending;
    return pending;
  }, [client, deploymentStatus, manifest, runtime]);

  return (
    <ZamaContext.Provider
      value={{
        status,
        client,
        error,
        ensureReady: initialize,
        retry: () => {
          void initialize().catch(() => undefined);
        },
      }}
    >
      {children}
    </ZamaContext.Provider>
  );
}

export function useZama(): ZamaContextValue {
  const value = useContext(ZamaContext);
  if (!value) throw new Error("useZama must be used inside ZamaProvider");
  return value;
}
