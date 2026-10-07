import { maxContactUrl } from "@/lib/contactLinks";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function MaxContactLink({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  return (
    <a
      aria-label="Написать в MAX (откроется в новой вкладке)"
      className={`max-contact-link${compact ? " max-contact-link-compact" : ""}`}
      href={maxContactUrl}
      onClick={onClick}
      rel="noopener noreferrer"
      target="_blank"
      title="Написать в MAX"
    >
      <img alt="" height={26} src={`${basePath}/brand/max-52.webp`} width={26} />
      {compact ? null : <span>Написать в MAX</span>}
    </a>
  );
}
