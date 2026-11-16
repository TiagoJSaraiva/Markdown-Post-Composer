import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useI18n } from "../i18n";
import { describeError } from "../i18n/errors";
import { useAdminAuth } from "./authContext";
import "../components/StatusScreen.css";

function UnlockScreen() {
  const { t } = useI18n();
  const { unlock, wasRejected } = useAdminAuth();
  const [candidate, setCandidate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!candidate) {
      setMessage(t("unlock.empty"));
      return;
    }

    setIsChecking(true);
    setMessage(null);

    const result = await unlock(candidate);

    // On success the gate unmounts this screen.
    if (!result.ok) {
      setMessage(describeError(t, result.error));
      setIsChecking(false);
    }
  }

  const shownMessage = message ?? (wasRejected ? t("unlock.rejected") : null);

  return (
    <div className="status-screen">
      <form className="status-screen-card" onSubmit={(event) => void handleSubmit(event)}>
        <h1 className="status-screen-title">{t("unlock.title")}</h1>
        <p className="status-screen-text">{t("unlock.description")}</p>
        <label className="status-screen-text" htmlFor="admin-password">{t("unlock.passwordLabel")}</label>
        <input
          id="admin-password"
          type="password"
          className="status-screen-input"
          value={candidate}
          onChange={(event) => setCandidate(event.target.value)}
          autoComplete="current-password"
          autoFocus
        />
        {shownMessage ? <p className="status-screen-error" role="alert">{shownMessage}</p> : null}
        <button type="submit" className="status-screen-button" disabled={isChecking}>
          {isChecking ? t("unlock.checking") : t("unlock.submit")}
        </button>
      </form>
    </div>
  );
}

/** Renders the app only while unlocked, the unlock screen otherwise. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { password } = useAdminAuth();

  return password === null ? <UnlockScreen /> : <>{children}</>;
}
