"use client";

import { ClipboardList, Layers, Package, Route } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./ReadyKitTabs.module.css";

const tabs = [
  { id: "bom", label: "Состав комплекта", Icon: Package },
  { id: "application", label: "Применение", Icon: Route },
  { id: "conditions", label: "Что важно уточнить", Icon: ClipboardList },
  { id: "related", label: "Похожие комплекты", Icon: Layers },
] as const;
type TabId = typeof tabs[number]["id"];

// Children are rendered on the server, once. Enhancement only changes visibility.
export function ReadyKitTabs({ panels }: { panels: Record<TabId, ReactNode> }) {
  const [enhanced, setEnhanced] = useState(false);
  const [active, setActive] = useState<TabId>("bom");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setEnhanced(true), []);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(tabs[next].id);
    buttons.current[next]?.focus({ preventScroll: true });
  }
  return <div className={styles.sections} data-kit-tabs data-enhanced={enhanced}>
    <div className={styles.tabs} role="tablist" aria-label="Разделы комплекта" hidden={!enhanced}>
      {tabs.map(({ id, label, Icon }, index) => <button key={id} type="button" role="tab"
        id={`kit-tab-${id}`} aria-controls={`kit-panel-${id}`} aria-selected={active === id}
        tabIndex={active === id ? 0 : -1} ref={node => { buttons.current[index] = node; }}
        onKeyDown={event => keyboard(event, index)} onClick={() => setActive(id)}>
        <Icon size={18} aria-hidden /><span>{label}</span>
      </button>)}
    </div>
    {tabs.map(({ id }) => <div key={id} id={`kit-panel-${id}`} data-kit-panel={id}
      role={enhanced ? "tabpanel" : undefined} aria-labelledby={enhanced ? `kit-tab-${id}` : undefined}
      tabIndex={enhanced ? 0 : undefined} hidden={enhanced && active !== id} className={styles.panel}>
      {panels[id]}
    </div>)}
  </div>;
}
