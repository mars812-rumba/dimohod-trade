import type { ReactNode } from "react";
import Link from "next/link";
import { IconArrowLeft as ArrowLeft } from "@tabler/icons-react";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="legal-back" href="/">
          <ArrowLeft aria-hidden size={17} /> На главную
        </Link>
        <h1>{title}</h1>
        <p className="legal-revision">Редакция от 11 августа 2026 года</p>
        {children}
      </article>
    </main>
  );
}
