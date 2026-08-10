import type {
  ChangeEventHandler,
  FormEventHandler,
  PointerEventHandler,
} from "react";

import styles from "../../App.module.scss";
import type { AuthSnapshot } from "../../auth";
import { HeaderLogo } from "../ui/Icon";

type LoginScreenProps = {
  authSnapshot: AuthSnapshot;
  email: string;
  password: string;
  message: string | null;
  isPending: boolean;
  onEmailChange: ChangeEventHandler<HTMLInputElement>;
  onPasswordChange: ChangeEventHandler<HTMLInputElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
};

export function LoginScreen({
  authSnapshot,
  email,
  password,
  message,
  isPending,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onButtonPointerDown,
}: LoginScreenProps) {
  if (authSnapshot.status === "loading") {
    return (
      <main className={styles.loginScreen} aria-label="Iniciar sesión">
        <section className={styles.loginCard}>
          <span className={styles.splashLogo} aria-hidden="true">
            <HeaderLogo />
          </span>
          <p className={styles.splashKicker}>Lista de la compra</p>
          <h1>Jucart</h1>
          <p className={styles.loginStatus}>Comprobando sesión…</p>
        </section>
      </main>
    );
  }

  if (authSnapshot.status === "signed_in" && authSnapshot.user) {
    return null;
  }

  return (
    <main className={styles.loginScreen} aria-label="Iniciar sesión">
      <section className={styles.loginCard}>
        <span className={styles.splashLogo} aria-hidden="true">
          <HeaderLogo />
        </span>
        <p className={styles.splashKicker}>Lista de la compra</p>
        <h1>Jucart</h1>
        <p className={styles.loginIntro}>Inicia sesión para ver tus listas.</p>
        <form className={styles.loginForm} onSubmit={onSubmit}>
          <label className={styles.authLabel} htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className={styles.authInput}
            type="email"
            autoComplete="username"
            placeholder="Tu email"
            value={email}
            onChange={onEmailChange}
            disabled={isPending}
          />
          <label className={styles.authLabel} htmlFor="auth-password">
            Contraseña
          </label>
          <input
            id="auth-password"
            className={styles.authInput}
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={onPasswordChange}
            disabled={isPending}
          />
          <button
            className={styles.primaryButton}
            type="submit"
            onPointerDown={onButtonPointerDown}
            disabled={isPending}
          >
            {isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>
        {message ? (
          <p className={styles.authMessage} role="status">
            {message}
          </p>
        ) : null}
        {authSnapshot.error ? (
          <p className={styles.authMessage} role="alert">
            {authSnapshot.error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
