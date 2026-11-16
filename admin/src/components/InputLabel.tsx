import "./InputLabel.css";

type InputLabelProps = {
  value: string;
  /** Id of the field this text labels. Leave it out when an enclosing <label> already does. */
  htmlFor?: string;
};

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
