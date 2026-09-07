"use client";

import { useFormStatus } from "react-dom";

import styles from "./administration.module.css";

type ActionSubmitButtonProps = Readonly<{
  label: string;
  pendingLabel: string;
  tone?: "primary" | "secondary";
  disabled?: boolean;
}>;

export function ActionSubmitButton({
  label,
  pendingLabel,
  tone = "primary",
  disabled = false,
}: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={tone === "primary" ? styles.primaryButton : styles.secondaryButton}
      type="submit"
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
