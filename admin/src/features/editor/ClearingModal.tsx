import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";

export default function ClearingModal() {
  const { t } = useI18n();

  return (
    <AppModal title={t("editor.clearingTitle")}>
      <p className="app-modal-text">{t("editor.clearingText")}</p>
    </AppModal>
  );
}
