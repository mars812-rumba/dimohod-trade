import type { TablerIcon } from "@tabler/icons-react";

type ScenarioCardProps = {
  icon: TablerIcon;
  title: string;
  text: string;
};

export function ScenarioCard({ icon: Icon, title, text }: ScenarioCardProps) {
  return (
    <article className="card">
      <Icon size={22} color="var(--accent)" strokeWidth={2.1} />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
