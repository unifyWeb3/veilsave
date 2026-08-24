import { StatusPill } from "../design/Primitives";
import { useDeployment } from "../providers/DeploymentProvider";
import { useZama } from "../providers/ZamaProvider";
import { useProtocolSnapshot } from "../protocol/useProtocolSnapshot";

export function ProtocolHealth() {
  const deployment = useDeployment();
  const zama = useZama();
  const snapshot = useProtocolSnapshot();
  const loss = snapshot.data?.strategy.lossMode;
  return (
    <div className="health-strip" aria-label="Protocol health">
      <StatusPill
        tone={
          deployment.status === "ready"
            ? "verified"
            : deployment.status === "error"
              ? "critical"
              : "pending"
        }
        icon="shield-check"
        pulse={deployment.status === "loading"}
      >
        {deployment.status === "ready"
          ? "Manifest verified"
          : deployment.status === "error"
            ? "Manifest mismatch"
            : "Checking manifest"}
      </StatusPill>
      <StatusPill
        tone={
          zama.status === "ready"
            ? "verified"
            : zama.status === "unavailable" || zama.status === "error"
              ? "pending"
              : "neutral"
        }
        icon="key-round"
        pulse={zama.status === "loading"}
      >
        {zama.status === "ready"
          ? "Zama ready"
          : zama.status === "loading"
            ? "Zama loading"
            : zama.status === "unavailable" || zama.status === "error"
              ? "Zama retryable"
              : "Zama on demand"}
      </StatusPill>
      <StatusPill
        tone={loss ? "critical" : snapshot.isError ? "pending" : "verified"}
        icon={loss ? "circle-alert" : "circle-dot"}
      >
        {loss ? "Loss mode" : snapshot.isError ? "RPC retry" : "Pool operating"}
      </StatusPill>
    </div>
  );
}
