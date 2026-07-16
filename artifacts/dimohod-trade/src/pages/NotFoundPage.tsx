import { Link } from "wouter";

export default function NotFoundPage() {
  return (
    <main className="page">
      <h1>404 — Страница не найдена</h1>
      <Link className="button secondary" href="/">
        На главную
      </Link>
    </main>
  );
}
