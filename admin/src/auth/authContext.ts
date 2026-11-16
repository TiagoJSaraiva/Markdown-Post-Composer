/*
 * Context, value type and consumer hooks of the in-memory admin password session.
 * AuthProvider supplies the value; panels and hooks read the password from here.
 */
import { createContext, useContext } from "react";

/** Outcome of an unlock attempt; `error` is the thrown value (an ApiError for backend failures). */
export type UnlockResult = { ok: true } | { ok: false; error: unknown };

/** State and actions of the admin password session. */
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

/** Context of the password session; `null` outside AuthProvider. */
export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Reads the password session.
 *
 * @returns The session state and its actions.
 * @throws Error when used outside AuthProvider.
 */
export function useAdminAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used within AuthProvider");
  }

  return context;
}

/**
 * Reads the password of the unlocked session. Only call from components rendered behind the gate.
 *
 * @returns The admin password.
 * @throws Error when the app is locked.
 */
export function useAdminPassword(): string {
  const { password } = useAdminAuth();

  if (password === null) {
    throw new Error("useAdminPassword called while locked");
  }

  return password;
}
