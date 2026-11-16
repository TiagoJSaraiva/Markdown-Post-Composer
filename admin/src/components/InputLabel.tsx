/*
 * Label text for form fields, as a real <label> when it targets a field and a plain
 * block otherwise. Used by the form panel.
 */
import "./InputLabel.css";

/** Props of InputLabel. */
type InputLabelProps = {
  /** Label text. */
  value: string;
  /** Id of the field this text labels. Leave it out when an enclosing <label> already does. */
  htmlFor?: string;
};

/**
 * Text label of a form field.
 *
 * @param props - Component props.
 * @param props.value - Label text.
 * @param props.htmlFor - Id of the labelled field.
 * @returns A <label> when `htmlFor` is set, a <div> otherwise.
 */
export default function InputLabel({ value, htmlFor }: InputLabelProps) {
  if (htmlFor) {
    return (
      <label className="input-label" htmlFor={htmlFor}>
        {value}
      </label>
    );
  }

  return (
    <div className="input-label">
      {value}
    </div>
  );
}
