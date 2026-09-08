"use client";

import { useFormStatus } from "react-dom";

import styles from "./administration.module.css";

type DeleteAccountButtonProps = Readonly<{
  accountName: string;
}>;

export function DeleteAccountButton({ accountName }: DeleteAccountButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={styles.dangerButton}
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(
            `Excluir o acesso de ${accountName}? O cadastro funcional e o historico serao preservados.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Excluindo..." : "Excluir acesso"}
    </button>
  );
}
