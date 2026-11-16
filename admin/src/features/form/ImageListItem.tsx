import { Check } from "lucide-react";
import StyledFileInput from "../../components/StyledFileInput";
import { useI18n } from "../../i18n";
import "./ImageListItem.css";

type ImageListItemProps = {
  id: number;
  isBusy: boolean;
  hasSelectedFile: boolean;
  displayName: string;
  canConfirmName: boolean;
  errorText?: string | null;
  onPickFile: (id: number, file: File | null) => void;
  onChangeName: (id: number, value: string) => void;
  onConfirmName: (id: number) => void;
  onRemove: (id: number) => void;
};

export default function ImageListItem({
  id,
  isBusy,
  hasSelectedFile,
  displayName,
  canConfirmName,
  errorText,
  onPickFile,
  onChangeName,
  onConfirmName,
  onRemove
}: ImageListItemProps) {
  const { t } = useI18n();

  return (
    <div className="image-list-item">
      <div className="image-list-item-controls">
        <StyledFileInput
          text={hasSelectedFile ? t("image.replace") : t("image.choose")}
          accept="image/*"
          disabled={isBusy}
          onFileSelect={(file) => onPickFile(id, file)}
        />

        {hasSelectedFile ? (
          <div className="image-list-item-name-wrap">
            <input
              type="text"
              className="image-list-item-name-input"
              placeholder={t("image.namePlaceholder")}
              aria-label={t("image.namePlaceholder")}
              value={displayName}
              disabled={isBusy}
              onChange={(event) => onChangeName(id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onConfirmName(id);
                }
              }}
            />
            <button
              type="button"
              className="image-list-item-name-confirm"
              onClick={() => onConfirmName(id)}
              disabled={!canConfirmName || isBusy}
              aria-label={t("image.confirmName")}
            >
              <Check size={18} />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="image-list-item-delete-button"
          onClick={() => onRemove(id)}
          disabled={isBusy}
          aria-label={t("image.remove")}
        >
          X
        </button>
      </div>

      {errorText ? <span className="image-list-item-error">{errorText}</span> : null}
    </div>
  );
}
