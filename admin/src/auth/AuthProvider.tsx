/*
 * Keeps the admin password in React state (memory only) and provides the lock and
 * unlock actions through AuthContext. Mounted by App.
 */
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isUnauthorizedError, isUnauthorizedStatus } from "../lib/apiError";
import { listTempImages } from "../services/tempImages";
import { AuthContext, type AuthContextValue } from "./authContext";

/**
 * Provides the password session. The password lives in React state only: never in
 * localStorage or sessionStorage.
 *
 * @param props - Component props.
 * @param props.children - Subtree that consumes the session.
 * @returns The context provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(null);
  const [wasRejected, setWasRejected] = useState(false);

  const unlock = useCallback<AuthContextValue["unlock"]>(async (candidate) => {
    try {
      await listTempImages(candidate);
      setWasRejected(false);
      setPassword(candidate);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }, []);

  const lock = useCallback(() => {
    setPassword(null);
  }, []);

  const lockIfUnauthorized = useCallback((statusOrError: unknown) => {
    const unauthorized =
      typeof statusOrError === "number"
        ? isUnauthorizedStatus(statusOrError)
        : isUnauthorizedError(statusOrError);

    if (unauthorized) {
      setWasRejected(true);
      setPassword(null);
    }

    return unauthorized;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ password, wasRejected, unlock, lock, lockIfUnauthorized }),
    [password, wasRejected, unlock, lock, lockIfUnauthorized]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
