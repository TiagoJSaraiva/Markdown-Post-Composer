import { createContext, useContext } from "react";

export type UnlockResult = { ok: true } | { ok: false; error: unknown };

export type AuthContextValue = {
  /** The admin password, held in memory only. Null while locked. */
  password: string | null;
  /** True when the app was locked because the server answered 401. */
  wasRejected: boolean;
  /** Validates the password against the backend and unlocks on success. */
  unlock: (candidate: string) => Promise<UnlockResult>;
  /** Forgets the password and shows the unlock screen. */
  lock: () => void;
  /**
   * Locks and returns true when the failure is a 401, given either an HTTP
   * status or a thrown ApiError. Returns false for anything else.
   */
  lockIfUnauthorized: (statusOrError: unknown) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAdminAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used within AuthProvider");
  }

  return context;
}

/** The password of the unlocked session. Only call from components rendered behind the gate. */
export function useAdminPassword(): string {
  const { password } = useAdminAuth();

  if (password === null) {
    throw new Error("useAdminPassword called while locked");
  }

  return password;
}
