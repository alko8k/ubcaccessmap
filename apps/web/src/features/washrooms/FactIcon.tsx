import { Check, CircleHelp, X } from "lucide-react";

/**
 * The icon for an accessibility fact's state. Facts never borrow the red–green
 * rank ramp: the icon and the word next to it carry the state.
 */
export function FactIcon({ value }: { value: string }) {
  if (value === "yes") return <Check aria-hidden="true" size={16} />;
  if (value === "no") return <X aria-hidden="true" size={16} />;
  return <CircleHelp aria-hidden="true" size={16} />;
}
