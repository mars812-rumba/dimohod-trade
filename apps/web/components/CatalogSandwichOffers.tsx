import Link from "next/link";
import { getProducts, type ProductListItem } from "@/lib/api";
import { steelWithThicknessLabel } from "@/lib/productLabels";
import { productSelectionPath } from "@/lib/productUrls";
import styles from "./CatalogSandwichOffers.module.css";

function contourLabel(product: ProductListItem, outer = false) {
  const attributes = product.attributes;
  const steel = outer ? attributes.outer_steel_grade : product.steel_grade;
  const material = outer ? attributes.outer_material : product.material;
  const thickness = outer ? attributes.outer_wall_thickness_mm : product.wall_thickness_mm;
  const label = steelWithThicknessLabel(
    typeof steel === "string" ? steel : null,
    typeof thickness === "string" || typeof thickness === "number" ? String(thickness) : null,
  );
  if (label) return label;
  return typeof material === "string" && material.trim() ? material : "Уточняется";
}

export async function CatalogSandwichOffers({
  diameters,
  selection,
}: {
  diameters: string[];
  selection: Pick<NonNullable<Parameters<typeof getProducts>[0]>, "length" | "material" | "steelGrade" | "outerMaterial" | "outerSteelGrade">;
}) {
  // Examples, not a sales/popularity ranking. Only request existing diameters.
  const ordered = [...new Set(diameters)].sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]));
  const wanted = ["115:215", "120:220", "150:250", "180:280", "200:300", "250:350"];
  const selected = [...wanted.filter(d => ordered.includes(d)), ...ordered.filter(d => !wanted.includes(d))].slice(0, 6);
  const responses = await Promise.all(selected.map(diameter => getProducts({
    category: "sendvich-truby",
    limit: 1,
    diameter,
    ...selection,
  }).catch(() => null)));
  const offers = responses.flatMap(response => response?.items ?? [])
    .filter(item => item.selected_sku && item.diameter_mm !== null && item.outer_diameter_mm !== null);

  return (
    <section className={styles.section} aria-labelledby="sandwich-offers-title">
      <div className={styles.heading}>
        <div>
          <h2 id="sandwich-offers-title">Исполнения и цены</h2>
          <p>Примеры сэндвич-труб для сравнения. Цена указана за одну трубу выбранной длины, не за комплект дымохода.</p>
        </div>
        <Link className={styles.help} href="/#send-materials">Помочь с подбором</Link>
      </div>
      {offers.length ? <p className={styles.mobileHint}>Таблицу можно прокрутить вправо, чтобы увидеть цену и ссылку на товар.</p> : null}
      {offers.length ? (
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Сравнение исполнений сэндвич-труб">
          <table className={styles.table}>
            <caption className="sr-only">Параметры и цены конкретных исполнений сэндвич-труб</caption>
            <thead><tr>
              <th scope="col">Диаметры d/D</th>
              <th scope="col">Длина</th>
              <th scope="col">Внутренняя труба</th>
              <th scope="col">Наружная труба</th>
              <th scope="col">Цена за штуку</th>
              <th scope="col"><span className="sr-only">Переход к товару</span></th>
            </tr></thead>
            <tbody>{offers.map(item => (
              <tr key={item.selected_sku_id ?? `${item.slug}-${item.selected_sku}`}>
                <th scope="row">{item.diameter_mm}/{item.outer_diameter_mm} мм</th>
                <td>{item.length_mm !== null ? `${item.length_mm} мм` : "Уточняется"}</td>
                <td>{contourLabel(item)}</td>
                <td>{contourLabel(item, true)}</td>
                <td className={styles.price}>{item.price_rub && Number.isFinite(Number(item.price_rub)) && Number(item.price_rub) > 0
                  ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(Number(item.price_rub))
                  : "По запросу"}</td>
                <td><Link href={productSelectionPath(item.slug, item, item.selected_sku)} aria-label={`Открыть сэндвич-трубу ${item.diameter_mm}/${item.outer_diameter_mm} мм, артикул ${item.article ?? item.selected_sku}`}>К товару</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p>Примеры исполнений сейчас недоступны. Выберите параметры в фильтрах или обратитесь за подбором.</p>}
      <p className={styles.note}>Нужны другая длина или материал? <Link href="#sandwich-filters">Выбрать параметры в фильтрах</Link>. Если параметры пока неизвестны, оставьте заявку — фотографии и документы необязательны.</p>
    </section>
  );
}
