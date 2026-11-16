/*
 * Styled file picker (button look, native input hidden). Used by the image list items.
 */
import type { ChangeEvent } from "react";
import "./StyledFileInput.css";

/** Props of StyledFileInput. */
type StyledFileInputProps = {
  /** Text of the button. */
  text: string;
  /** Accepted file types, as in the `accept` attribute of a file input. */
  accept?: string;
  disabled?: boolean;
  /** Called with the chosen file, or `null` when none was chosen. */
  onFileSelect?: (file: File | null) => void;
};

/**
 * File picker that looks like a button.
 *
 * @param props - Component props.
 * @param props.text - Text of the button.
 * @param props.accept - Accepted file types.
 * @param props.disabled - Disables the picker.
 * @param props.onFileSelect - Called with the chosen file.
 * @returns The picker.
 */
export default function StyledFileInput({ text, accept, disabled = false, onFileSelect }: StyledFileInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    onFileSelect?.(file);

    // Keep the native input clean so future selections always trigger change.
    event.target.value = "";
  }

  return (
    <label className="styled-file-input-root">
      <span className="styled-file-input-button">{text}</span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="styled-file-input-native"
        onChange={handleChange}
      />
    </label>
  );
}
