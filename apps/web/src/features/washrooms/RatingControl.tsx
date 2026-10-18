import { useId } from "react";

const SCALE = [1, 2, 3, 4, 5] as const;

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

/**
 * A 1–5 score as a segmented control.
 *
 * Underneath it is a native radio group, so arrow keys, form semantics, and
 * screen reader announcements come from the browser.
 */
export function RatingControl({ label, value, onChange }: Props) {
  const name = useId();

  return (
    <fieldset className="rating">
      <legend>{label}</legend>
      <div className="segmented">
        {SCALE.map((score) => (
          <label key={score}>
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
            />
            <span aria-hidden="true">{score}</span>
            <span className="sr-only">{score} out of 5</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
