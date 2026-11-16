/*
 * One image slot of the form panel: file picker, name input with confirm button and
 * remove button. Presentational; FormPanel wires it to useTempImages.
 */
import { Check } from "lucide-react";
import StyledFileInput from "../../components/StyledFileInput";
import { useI18n } from "../../i18n";
import "./ImageListItem.css";

/** Props of ImageListItem. */
type ImageListItemProps = {
  /** Slot id (TempImageItem.id), passed back to every callback. */
  id: number;
  /** Disables the controls while a request for this slot is in flight. */
  isBusy: boolean;
  /** True once a file was uploaded; shows the name input and the replace label. */
  hasSelectedFile: boolean;
  /** Value of the name input. */
  displayName: string;
  /** Enables the confirm button (see canConfirmImageName). */
  canConfirmName: boolean;
  /** Translated error of the last operation on this slot. */
  errorText?: string | null;
  /** A file was chosen (or `null` when cancelled). */
  onPickFile: (id: number, file: File | null) => void;
  /** The name input changed. */
  onChangeName: (id: number, value: string) => void;
  /** The typed name should be sent as a rename. */
  onConfirmName: (id: number) => void;
  /** The slot should be removed. */
  onRemove: (id: number) => void;
};

/**
 * A row of the image list.
 *
 * @param props - Component props.
 * @returns The row.
 */
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
