import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
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

interface DeploymentContextValue {
  runtime: RuntimeConfig;
  manifest: DeploymentManifestModel | null;
  /** "active" only for a fetched ACTIVE manifest; "candidate" for verified read-only state. */
  source: "active" | "candidate" | null;
  codeChecks: CodeHashCheck[];
  status: DeploymentStatusState;
  error: string | null;
  retry: () => void;
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
  const activeQuery = useQuery({
    queryKey: ["veilsave", "manifest", runtime.manifestUrl],
    queryFn: () => fetchDeploymentManifest(runtime.manifestUrl),
    staleTime: 5 * 60_000,
    retry: 2,
  });
  const candidate = useMemo(() => {
    try {
      return validateCandidateReadModel(SEPOLIA_CANDIDATE_READ_MODEL);
    } catch {
      return null;
    }
  }, []);
  const activeManifest = activeQuery.data ?? null;
  // The ACTIVE manifest is authoritative when present. The candidate is a
  // read-only fallback and is never allowed to satisfy transaction gating.
  const codeTarget = activeManifest ?? candidate;
  const codeQuery = useQuery({
    queryKey: [
      "veilsave",
      "manifest-code",
      codeTarget?.sourceCommit,
      activeManifest ? "active" : "candidate",
    ],
    queryFn: async () => {
      if (!publicClient || !codeTarget) throw new Error("Public chain client is unavailable");
      return verifyManifestCode(publicClient, codeTarget);
    },
    enabled: Boolean(publicClient && codeTarget),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  let status: DeploymentStatusState = "loading";
  let manifest: DeploymentManifestModel | null = null;
  let source: "active" | "candidate" | null = null;
  let error: string | null = null;

  if (activeManifest && codeQuery.data) {
    status = "ready";
    manifest = activeManifest;
    source = "active";
  } else if (activeManifest && codeQuery.error) {
    // Fail closed: a fetched manifest that does not match live chain bytecode
    // must never degrade silently into the candidate path.
    status = "error";
    error = errorMessage(codeQuery.error);
  } else if (activeManifest) {
    status = "loading";
    manifest = activeManifest;
  } else if (activeQuery.error && candidate && codeQuery.data) {
    status = "read-only";
    manifest = candidate;
    source = "candidate";
  } else if (activeQuery.error) {
    status = "error";
    error = errorMessage(codeQuery.error ?? activeQuery.error);
  }

  return (
    <DeploymentContext.Provider
      value={{
        runtime,
        manifest,
        source,
        codeChecks: codeQuery.data ?? [],
        status,
        error,
        retry: () => {
          void activeQuery.refetch();
          void codeQuery.refetch();
        },
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
