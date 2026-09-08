"use client";

import { useRef } from "react";

import { changeAccountPasswordAction } from "./actions";
import { ActionSubmitButton } from "./action-submit-button";
import styles from "./administration.module.css";

type PasswordResetDialogProps = Readonly<{
  accountId: string;
  accountName: string;
}>;

export function PasswordResetDialog({
  accountId,
  accountName,
}: PasswordResetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = `password-dialog-${accountId}`;
  const titleId = `password-dialog-title-${accountId}`;
  const descriptionId = `password-dialog-description-${accountId}`;

  const openDialog = () => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        className={`${styles.secondaryButton} ${styles.passwordTrigger}`}
        type="button"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={openDialog}
      >
        Definir senha temporária
      </button>

      <dialog
        ref={dialogRef}
        id={dialogId}
        className={styles.passwordDialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => triggerRef.current?.focus()}
      >
        <div className={styles.passwordDialogHeader}>
          <div>
            <p className={styles.eyebrow}>Acesso administrativo</p>
            <h2 id={titleId}>Definir senha temporária</h2>
          </div>
          <button
            className={styles.dialogCloseButton}
            type="button"
            aria-label="Fechar janela de senha"
            onClick={closeDialog}
          >
            Fechar
          </button>
        </div>

        <p id={descriptionId} className={styles.passwordDialogDescription}>
          Crie uma senha para <strong>{accountName}</strong>. A pessoa deverá
          alterá-la no próximo acesso.
        </p>

        <form action={changeAccountPasswordAction} className={styles.passwordDialogForm}>
          <input type="hidden" name="accountId" value={accountId} />
          <label>
            <span>Nova senha temporária</span>
            <input
              name="newPassword"
              type="password"
              minLength={9}
              maxLength={128}
              required
              autoComplete="new-password"
            />
            <small>Mínimo de 9 caracteres, com número e caractere especial.</small>
          </label>
          <label>
            <span>Confirmar senha</span>
            <input
              name="confirmPassword"
              type="password"
              minLength={9}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </label>
          <div className={styles.passwordDialogActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={closeDialog}
            >
              Cancelar
            </button>
            <ActionSubmitButton
              label="Definir senha"
              pendingLabel="Atualizando..."
            />
          </div>
        </form>
      </dialog>
    </>
  );
}
