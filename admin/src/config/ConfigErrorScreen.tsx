import { useI18n } from "../i18n";
import type { ConfigResult } from "./env";
import "../components/StatusScreen.css";

type ConfigErrorScreenProps = {
  result: Extract<ConfigResult, { ok: false }>;
};

export default function ConfigErrorScreen({ result }: ConfigErrorScreenProps) {
  const { t } = useI18n();

  return (
    <div className="status-screen">
      <div className="status-screen-card" role="alert">
        <h1 className="status-screen-title">{t("config.title")}</h1>
        <p className="status-screen-text">{t("config.intro")}</p>
        {result.missing.length > 0 ? (
          <p className="status-screen-error">{t("config.missing", { names: result.missing.join(", ") })}</p>
        ) : null}
        {result.invalid.length > 0 ? (
          <p className="status-screen-error">{t("config.invalid", { names: result.invalid.join(", ") })}</p>
        ) : null}
      </div>
    </div>
  );
}
