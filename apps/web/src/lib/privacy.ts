import { useCallback, useEffect, useState } from "react";

const privateValueListeners = new Set<() => void>();

export function invalidatePrivateValues(): void {
  for (const listener of privateValueListeners) listener();
}

export type ConfidentialValueStatus =
  | "masked"
  | "permit-required"
  | "permit-signing"
  | "decrypting"
  | "revealed"
  | "stale"
  | "unavailable"
  | "error-retryable"
  | "remasked";

interface PrivateValueOptions<T> {
  identityKey: string | undefined;
  decrypt: () => Promise<T>;
}

export function usePrivateValue<T>({ identityKey, decrypt }: PrivateValueOptions<T>) {
  const [status, setStatus] = useState<ConfidentialValueStatus>("masked");
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remask = useCallback(() => {
    setValue(null);
    setError(null);
    setStatus("remasked");
  }, []);

  useEffect(() => {
    setValue(null);
    setError(null);
    setStatus("masked");
  }, [identityKey]);

  useEffect(() => {
    const invalidate = () => {
      setValue(null);
      setError(null);
      setStatus("stale");
    };
    privateValueListeners.add(invalidate);
    return () => {
      privateValueListeners.delete(invalidate);
    };
  }, []);

  const reveal = useCallback(async () => {
    if (!identityKey) {
      setStatus("unavailable");
      setError("Connect the wallet before revealing this private value.");
      return;
    }
    setError(null);
    setStatus("permit-required");
    await Promise.resolve();
    setStatus("permit-signing");
    try {
      setStatus("decrypting");
      const decrypted = await decrypt();
      setValue(decrypted);
      setStatus("revealed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Decryption could not be completed");
      setStatus("error-retryable");
    }
  }, [decrypt, identityKey]);

  const markStale = useCallback(() => {
    setValue(null);
    setStatus("stale");
  }, []);

  return { status, value, error, reveal, remask, markStale };
}
