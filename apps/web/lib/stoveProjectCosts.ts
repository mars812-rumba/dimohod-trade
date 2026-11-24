// Owner-provided project totals, received 05.10.2026; not current product tariffs.
export const stoveProjectCosts = [
  {
    id: 11,
    name: "СНТ «Звезда»",
    context: "Заменили старый дымоход и установили печь клиента. Стоимость самой печи не включена.",
    lines: [
      { label: "Комплект дымохода", amount: 55000 },
      { label: "Монтаж", amount: 35000 },
      { label: "Демонтаж старого дымохода", amount: 6000 },
    ],
    total: 96000,
    photos: [
      { src: "/images/works/object-11/03.webp", alt: "Печь и дымоход в доме в СНТ «Звезда»" },
      { src: "/images/works/object-11/02.webp", alt: "Дымоход на чердаке дома в СНТ «Звезда»" },
      { src: "/images/works/object-11/01.webp", alt: "Дымоход над кровлей дома в СНТ «Звезда»" },
      { src: "/images/works/object-11/04.webp", alt: "Труба в проёме деревянного перекрытия дома в СНТ «Звезда»" },
    ],
  },
  {
    id: 10,
    name: "Лампово",
    context: "Печь-камин Dacha 2 с конфорками и дымоход в двухэтажном доме. Комплект включает покраску участка первого этажа.",
    lines: [
      { label: "Печь-камин Dacha 2 с конфорками", amount: 66000 },
      { label: "Комплект дымохода с покраской", amount: 94380 },
      { label: "Монтаж", amount: 36500 },
      { label: "Расходники: крепёж, герметики и др.", amount: 5500 },
      { label: "Противопожарная стена на 1-м и 2-м этажах", amount: 6000 },
      { label: "Доставка печи и дымохода, разгрузка", amount: 5500 },
    ],
    total: 213880,
    photos: [
      { src: "/images/guides/stove-lampovo/01.webp", alt: "Печь с чёрным дымоходом на первом этаже дома в Лампово" },
      { src: "/images/guides/stove-lampovo/02.webp", alt: "Металлическая труба на втором этаже дома в Лампово" },
      { src: "/images/guides/stove-lampovo/03.webp", alt: "Общий вид дома в Лампово с дымоходом над кровлей" },
      { src: "/images/guides/stove-lampovo/04.webp", alt: "Наружный участок дымохода и проход через кровлю в Лампово" },
    ],
  },
] as const;
