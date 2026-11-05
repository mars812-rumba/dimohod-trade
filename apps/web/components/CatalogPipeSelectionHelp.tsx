import Link from "next/link";

export function CatalogPipeSelectionHelp() {
  return (
    <aside className="state-empty">
      <p>Выберите вариант по диаметру, длине и материалу в характеристиках товара.</p>
      <Link href="/configurator">Открыть конфигуратор</Link>
    </aside>
  );
}
