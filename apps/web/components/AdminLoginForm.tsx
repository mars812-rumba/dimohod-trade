"use client";

import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./AdminLoginForm.module.css";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.startsWith("/admin/login")) {
    return "/admin/customers";
  }
  return value;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nextPath = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/auth/login`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail ?? "Не удалось войти");
      router.replace(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Не удалось войти");
      passwordRef.current?.focus();
      passwordRef.current?.select();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.pass} aria-labelledby="admin-login-title">
        <div className={styles.brandMark} aria-hidden><ShieldCheck size={25} /></div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Дымоход Трейд · управление</p>
          <h1 id="admin-login-title">Вход для менеджера</h1>
          <p>Каталог, клиенты и сметы доступны после входа. Сессия сохранится на этом устройстве на 30 дней.</p>
        </div>

        <form aria-busy={busy} onSubmit={submit}>
          <label htmlFor="admin-password">Пароль</label>
          <div className={styles.inputWrap}>
            <KeyRound aria-hidden size={18} />
            <input
              aria-describedby={error ? "admin-login-error" : "admin-login-help"}
              aria-invalid={Boolean(error)}
              autoComplete="current-password"
              id="admin-password"
              onChange={(event) => setPassword(event.target.value)}
              ref={passwordRef}
              required
              type="password"
              value={password}
            />
          </div>
          <p className={styles.help} id="admin-login-help">Используется пароль администратора из защищённой конфигурации.</p>
          {error ? <p className={styles.error} id="admin-login-error" role="alert">{error}</p> : null}
          <button disabled={busy || !password} type="submit">
            {busy ? "Проверяем…" : "Войти в админку"}
            {!busy ? <ArrowRight aria-hidden size={18} /> : null}
          </button>
        </form>
      </section>
    </main>
  );
}
