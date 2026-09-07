"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: Readonly<{ children: string }>) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Salvando..." : children}
    </button>
  );
}
