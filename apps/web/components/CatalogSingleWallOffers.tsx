import { getSingleWallOffers } from "@/lib/catalogSingleWallOffers";
import { productSelectionPath } from "@/lib/productUrls";
import styles from "./CatalogSingleWallOffers.module.css";

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function CatalogSingleWallOffers() {
  const offers = await getSingleWallOffers();
  if (!offers.length) return null;

  return (
    <section className={styles.section} aria-labelledby="single-wall-offers-title" data-single-wall-offers>
      <h2 id="single-wall-offers-title">Исполнения и цены</h2>
      <p className={styles.parameters}>Длина 1000 мм · сталь AISI 304 · толщина 0,5 мм</p>
      <table className={styles.table}>
        <caption className="sr-only">Цены за штуку и ссылки на исполнения одноконтурных труб</caption>
        <colgroup><col className={styles.diameterColumn} /><col className={styles.priceColumn} /><col className={styles.linkColumn} /></colgroup>
        <thead><tr>
          <th scope="col">Диаметр</th>
          <th scope="col">Цена за штуку</th>
          <th scope="col"><span className="sr-only">Переход к товару</span></th>
        </tr></thead>
        <tbody>{offers.map(item => (
          <tr key={item.selected_sku_id}>
            <th scope="row">Ø{item.diameter_mm} мм</th>
            <td className={styles.price}>{item.price_rub && Number.isFinite(Number(item.price_rub)) && Number(item.price_rub) > 0
              ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(item.price_rub))
              : "Цена по запросу"}</td>
            <td><a href={`${appBasePath}${productSelectionPath(item.slug, item, item.selected_sku)}`}
              aria-label={`Открыть трубу Ø${item.diameter_mm} мм, артикул ${item.selected_sku}`}>Открыть →</a></td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}
