import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { App } from "./App";
import { readRuntimeConfig } from "./config/runtime";
import { createWalletConfig } from "./lib/chain";
import { DeploymentProvider } from "./providers/DeploymentProvider";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("VeilSave root element is missing");

const runtime = readRuntimeConfig();
if (!runtime.config) {
  createRoot(root).render(
    <ConfigurationError message={runtime.error ?? "Runtime configuration is missing"} />,
  );
} else {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
  });
  const walletConfig = createWalletConfig(runtime.config);
  createRoot(root).render(
    <StrictMode>
      <WagmiProvider config={walletConfig}>
        <QueryClientProvider client={queryClient}>
          <DeploymentProvider runtime={runtime.config}>
            <App />
          </DeploymentProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>,
  );
}

function ConfigurationError({ message }: { message: string }) {
  return (
    <main className="gate gate--error">
      <h1>VeilSave is not configured</h1>
      <p>{message}</p>
      <p className="microcopy">
        Provide the reviewed Sepolia runtime variables and an active deployment manifest before
        using the app.
      </p>
    </main>
  );
}
