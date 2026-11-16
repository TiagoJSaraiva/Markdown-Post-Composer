import "./InputLabel.css";

export default function InputLabel({ value }: { value: string }) {
  return (
    <div className="input-label">
      {value}
    </div>
  );
}
