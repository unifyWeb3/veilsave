import { createContext, useContext, type PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

import type { VeilSaveDeploymentManifest } from "@veilsave/shared";

import type { RuntimeConfig } from "../config/runtime";
import { fetchDeploymentManifest, verifyManifestCode, type CodeHashCheck } from "../config/manifest";

interface DeploymentContextValue {
  runtime: RuntimeConfig;
  manifest: VeilSaveDeploymentManifest | null;
  codeChecks: CodeHashCheck[];
  status: "loading" | "ready" | "error";
  error: string | null;
  retry: () => void;
}

const DeploymentContext = createContext<DeploymentContextValue | null>(null);

export function DeploymentProvider({ runtime, children }: PropsWithChildren<{ runtime: RuntimeConfig }>) {
  const publicClient = usePublicClient({ chainId: runtime.chainId });
  const manifestQuery = useQuery({
    queryKey: ["veilsave", "manifest", runtime.manifestUrl],
    queryFn: () => fetchDeploymentManifest(runtime.manifestUrl),
    staleTime: 5 * 60_000,
    retry: 2,
  });
  const codeQuery = useQuery({
    queryKey: ["veilsave", "manifest-code", manifestQuery.data?.sourceCommit],
    queryFn: async () => {
      if (!publicClient || !manifestQuery.data) throw new Error("Public chain client is unavailable");
      return verifyManifestCode(publicClient, manifestQuery.data);
    },
    enabled: Boolean(publicClient && manifestQuery.data),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const error = manifestQuery.error ?? codeQuery.error;
  const status = error ? "error" : manifestQuery.data && codeQuery.data ? "ready" : "loading";

  return (
    <DeploymentContext.Provider
      value={{
        runtime,
        manifest: manifestQuery.data ?? null,
        codeChecks: codeQuery.data ?? [],
        status,
        error: error instanceof Error ? error.message : error ? "Deployment validation failed" : null,
        retry: () => {
          void manifestQuery.refetch();
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
