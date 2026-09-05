import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

import type { VeilSaveDeploymentManifest } from "@veilsave/shared";

import type { RuntimeConfig } from "../config/runtime";
import {
  SEPOLIA_CANDIDATE_READ_MODEL,
  validateCandidateReadModel,
  type CandidateReadModel,
} from "../config/candidate";
import {
  fetchDeploymentManifest,
  verifyManifestCode,
  type CodeHashCheck,
} from "../config/manifest";

export type DeploymentStatusState = "loading" | "ready" | "read-only" | "error";

export type DeploymentManifestModel = VeilSaveDeploymentManifest | CandidateReadModel;

export const TRANSACTION_NOT_READY_MESSAGE =
  "Transactions unlock after the ACTIVE release manifest is published and verified. The console remains read-only until then.";

interface DeploymentContextValue {
  runtime: RuntimeConfig;
  manifest: DeploymentManifestModel | null;
  /** "active" only for a fetched ACTIVE manifest; "candidate" for verified read-only state. */
  source: "active" | "candidate" | null;
  codeChecks: CodeHashCheck[];
  status: DeploymentStatusState;
  error: string | null;
  retry: () => void;
  /**
   * Establishes write readiness on demand: fetches the future ACTIVE manifest,
   * schema-validates it, and verifies its runtime bytecode against live chain.
   * Never runs during read-only initialization; call only from explicit
   * transaction intent. Resolves true (and promotes to ready) or false.
   */
  ensureTransactionReady: () => Promise<boolean>;
}

const DeploymentContext = createContext<DeploymentContextValue | null>(null);

/** Public Sepolia state may render while transaction controls stay disabled. */
export function canReadDeployment(status: DeploymentStatusState): boolean {
  return status === "ready" || status === "read-only";
}

/** Transaction controls require the fetched, verified ACTIVE manifest. Never true for the candidate. */
export function canTransactDeployment(status: DeploymentStatusState): boolean {
  return status === "ready";
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return "Deployment validation failed";
}

export function DeploymentProvider({
  runtime,
  children,
}: PropsWithChildren<{ runtime: RuntimeConfig }>) {
  const publicClient = usePublicClient({ chainId: runtime.chainId });
  const publicClientRef = useRef(publicClient);
  publicClientRef.current = publicClient;

  // The candidate is the only initialization input. The future ACTIVE manifest
  // is never fetched, retried, or awaited on this path, so a missing manifest
  // file cannot slow or break public read-only rendering.
  const candidate = useMemo(() => {
    try {
      return validateCandidateReadModel(SEPOLIA_CANDIDATE_READ_MODEL);
    } catch {
      return null;
    }
  }, []);
  const codeQuery = useQuery({
    queryKey: ["veilsave", "manifest-code", candidate?.sourceCommit, "candidate"],
    queryFn: async () => {
      if (!publicClient || !candidate) throw new Error("Public chain client is unavailable");
      return verifyManifestCode(publicClient, candidate);
    },
    enabled: Boolean(publicClient && candidate),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const [promoted, setPromoted] = useState<{
    manifest: VeilSaveDeploymentManifest;
    checks: CodeHashCheck[];
  } | null>(null);
  const promotionPendingRef = useRef<Promise<boolean> | null>(null);

  let status: DeploymentStatusState = "loading";
  let manifest: DeploymentManifestModel | null = null;
  let source: "active" | "candidate" | null = null;
  let error: string | null = null;

  if (promoted) {
    status = "ready";
    manifest = promoted.manifest;
    source = "active";
  } else if (candidate && codeQuery.data) {
    status = "read-only";
    manifest = candidate;
    source = "candidate";
  } else if (codeQuery.error || candidate === null) {
    status = "error";
    error = errorMessage(
      codeQuery.error ?? new Error("The candidate deployment configuration is invalid"),
    );
  }

  const statusRef = useRef(status);
  statusRef.current = status;

  const ensureTransactionReady = useCallback(async (): Promise<boolean> => {
    if (statusRef.current === "ready") return true;
    if (promotionPendingRef.current) return promotionPendingRef.current;
    const run = (async () => {
      try {
        const fetched = await fetchDeploymentManifest(runtime.manifestUrl);
        const client = publicClientRef.current;
        if (!client) return false;
        const checks = await verifyManifestCode(client, fetched);
        setPromoted({ manifest: fetched, checks });
        return true;
      } catch {
        return false;
      }
    })();
    promotionPendingRef.current = run;
    try {
      return await run;
    } finally {
      promotionPendingRef.current = null;
    }
  }, [runtime.manifestUrl]);

  return (
    <DeploymentContext.Provider
      value={{
        runtime,
        manifest,
        source,
        codeChecks: promoted?.checks ?? codeQuery.data ?? [],
        status,
        error,
        retry: () => {
          void codeQuery.refetch();
        },
        ensureTransactionReady,
      }}
    >
      {children}
    </DeploymentContext.Provider>
  );
}

export function useDeployment(): DeploymentContextValue {
  const value = useContext(DeploymentContext);
  if (!value) throw new Error("useDeployment must be used inside DeploymentProvider");
  return value;
}
