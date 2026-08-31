import type { Product, SKU } from "@/lib/api";

export type ProductFaqItem = {
  q: string;
  a: string;
};

type KindFact = {
  purpose: string;
  selectionQuestion: (name: string) => string;
};

const kindFacts: Record<string, KindFact> = {
  труба: {
    purpose: "Формирует прямой участок дымового канала. Конкретный вариант выбирают по диаметру, длине, контуру и материалу.",
    selectionQuestion: (name) => `Как выбрать длину для «${name}»?`,
  },
  отвод: {
    purpose: "Меняет направление дымового канала. Угол и исполнение должны соответствовать геометрии рассчитанного маршрута.",
    selectionQuestion: (name) => `Какой угол отвода выбрать для «${name}»?`,
  },
  тройник: {
    purpose: "Используется в узле присоединения ответвления к основному каналу. Для выбора важны угол, диаметры и исполнение соединений.",
    selectionQuestion: (name) => `Что проверить при выборе тройника «${name}»?`,
  },
  четверник: {
    purpose: "Это фасонный узел с несколькими присоединениями. Его выбирают только после проверки схемы, угла и всех сопрягаемых диаметров.",
    selectionQuestion: (name) => `Для какой схемы подбирают «${name}»?`,
  },
  шибер: {
    purpose: "Служит для регулировки тяги внутри дымового канала. Тип механизма и размер выбирают под конкретный участок системы.",
    selectionQuestion: (name) => `Как выбрать исполнение шибера «${name}»?`,
  },
  конденсатоотвод: {
    purpose: "Используется в узле отвода конденсата. Совместимость определяется конструкцией узла и размером выбранных элементов.",
    selectionQuestion: (name) => `К какому узлу подходит «${name}»?`,
  },
  ревизия: {
    purpose: "Даёт доступ к участку дымохода для осмотра и очистки. Место установки определяют по схеме всей трассы.",
    selectionQuestion: (name) => `Где учитывать прочистку «${name}» в проекте?`,
  },
  опорная_площадка: {
    purpose: "Передаёт вертикальную нагрузку от дымохода на предусмотренную опорную конструкцию. Схему опирания проверяют вместе с крепежом.",
    selectionQuestion: (name) => `Что нужно проверить для установки «${name}»?`,
  },
  консоль: {
    purpose: "Входит в опорный узел дымохода. Размер и вылет выбирают по расположению площадки и фактической геометрии места крепления.",
    selectionQuestion: (name) => `Как подобрать вылет для «${name}»?`,
  },
  крепеж: {
    purpose: "Фиксирует соответствующий участок или опорный узел системы. Назначение конкретного хомута нельзя определять только по диаметру.",
    selectionQuestion: (name) => `Как понять, где применяется «${name}»?`,
  },
  проходной_узел: {
    purpose: "Используется в месте пересечения дымоходом строительной конструкции. Состав прохода определяют по материалу, толщине и геометрии конструкции.",
    selectionQuestion: (name) => `Какие данные нужны для подбора «${name}»?`,
  },
  изоляция: {
    purpose: "Комплект относится к проходному стакану. Его размер и состав сверяют с выбранным проходным узлом, а не подбирают отдельно по названию.",
    selectionQuestion: (name) => `С каким проходным узлом сверять «${name}»?`,
  },
  оголовок: {
    purpose: "Завершает верхнюю часть дымохода. Конкретное исполнение выбирают по типу системы и размерам завершающего участка.",
    selectionQuestion: (name) => `Как выбрать исполнение оголовка «${name}»?`,
  },
  заглушка: {
    purpose: "Закрывает предусмотренную часть соответствующего узла. При выборе сверяют назначение, контур и присоединительные размеры.",
    selectionQuestion: (name) => `К какому элементу подбирают «${name}»?`,
  },
  декоративная_юбка: {
    purpose: "Используется для отделки места примыкания. Размер выбирают по фактическому диаметру и геометрии участка.",
    selectionQuestion: (name) => `Какой размер нужен для «${name}»?`,
  },
  фланец: {
    purpose: "Используется для декоративной отделки примыкания дымохода. Перед заказом сверяют диаметр и форму места установки.",
    selectionQuestion: (name) => `Что измерить перед заказом «${name}»?`,
  },
};

function customFaq(product: Product): ProductFaqItem[] {
  const raw = product.extra_attributes.faq;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const question = "question" in item && typeof item.question === "string" ? item.question.trim() : "";
    const answer = "answer" in item && typeof item.answer === "string" ? item.answer.trim() : "";
    return question && answer ? [{ q: question, a: answer }] : [];
  });
}

function numericValues(skus: SKU[], key: keyof SKU): number[] {
  return Array.from(
    new Set(
      skus.flatMap((sku) => {
        const value = sku[key];
        if (typeof value === "number" && Number.isFinite(value)) return [value];
        if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return [Number(value)];
        return [];
      }),
    ),
  ).sort((left, right) => left - right);
}

function textValues(skus: SKU[], key: keyof SKU): string[] {
  return Array.from(
    new Set(
      skus.flatMap((sku) => {
        const value = sku[key];
        return typeof value === "string" && value.trim() ? [value.trim()] : [];
      }),
    ),
  ).sort(new Intl.Collator("ru", { numeric: true }).compare);
}

function range(values: number[], unit = "мм"): string | null {
  if (!values.length) return null;
  const separator = unit === "°" ? "" : " ";
  if (values.length === 1) return `${values[0]}${separator}${unit}`;
  if (values.length <= 4) return `${values.join(", ")}${separator}${unit}`;
  return `от ${values[0]} до ${values.at(-1)}${separator}${unit}`;
}

function list(values: string[]): string | null {
  if (!values.length) return null;
  if (values.length <= 4) return values.join(", ");
  return `${values.slice(0, 3).join(", ")} и другие варианты`;
}

function variantAnswer(product: Product): string {
  const facts = [
    range(numericValues(product.skus, "diameter_mm"))
      ? `внутренний диаметр ${range(numericValues(product.skus, "diameter_mm"))}`
      : null,
    range(numericValues(product.skus, "outer_diameter_mm"))
      ? `наружный диаметр ${range(numericValues(product.skus, "outer_diameter_mm"))}`
      : null,
    range(numericValues(product.skus, "length_mm"))
      ? `длина ${range(numericValues(product.skus, "length_mm"))}`
      : null,
    range(numericValues(product.skus, "angle_deg"), "°")
      ? `угол ${range(numericValues(product.skus, "angle_deg"), "°")}`
      : null,
    range(numericValues(product.skus, "insulation_mm"))
      ? `изоляция ${range(numericValues(product.skus, "insulation_mm"))}`
      : null,
    range(numericValues(product.skus, "wall_thickness_mm"))
      ? `толщина стали ${range(numericValues(product.skus, "wall_thickness_mm"))}`
      : null,
    list(textValues(product.skus, "steel_grade"))
      ? `марка стали ${list(textValues(product.skus, "steel_grade"))}`
      : null,
    list(textValues(product.skus, "contour"))
      ? `контур ${list(textValues(product.skus, "contour"))}`
      : null,
  ].filter((value): value is string => Boolean(value));

  if (!facts.length) {
    return "Доступные исполнения показаны в переключателях карточки. Если нужного параметра нет, его следует уточнить до оформления заказа.";
  }
  return `В активных вариантах семейства указаны: ${facts.join("; ")}. Карточка показывает только параметры, которые есть в каталоге.`;
}

function selectedSkuAnswer(product: Product, sku: SKU | null): string {
  if (!sku) {
    return "Сначала выберите вариант в карточке, затем сверьте его параметры с соседними элементами и схемой трассы.";
  }
  const facts = [
    sku.diameter_mm !== null ? `d=${sku.diameter_mm} мм` : null,
    sku.outer_diameter_mm !== null ? `D=${sku.outer_diameter_mm} мм` : null,
    sku.length_mm !== null ? `L=${sku.length_mm} мм` : null,
    sku.angle_deg !== null ? `угол ${sku.angle_deg}°` : null,
    sku.wall_thickness_mm ? `толщина ${sku.wall_thickness_mm} мм` : null,
    sku.steel_grade ? `сталь ${sku.steel_grade}` : null,
    sku.contour ? `контур ${sku.contour}` : null,
  ].filter((value): value is string => Boolean(value));
  const selected = facts.length ? facts.join(", ") : "параметры выбранного SKU";
  return `Для выбранного артикула ${sku.article} проверьте ${selected}. Совпадение одного диаметра ещё не подтверждает совместимость всего узла — её сверяют по соседним элементам и маршруту.`;
}

export function productFaqItems(product: Product, activeSku: SKU | null): ProductFaqItem[] {
  const manualItems = customFaq(product);
  if (manualItems.length) return manualItems;

  const fact = kindFacts[product.product_kind ?? ""];
  const rawKnowledge = product.extra_attributes.seo_knowledge;
  const knowledgePurpose = rawKnowledge && typeof rawKnowledge === "object" && "purpose" in rawKnowledge &&
    Array.isArray(rawKnowledge.purpose)
    ? rawKnowledge.purpose.find((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : null;
  const purpose = knowledgePurpose?.trim() || fact?.purpose ||
    "Это отдельное семейство каталога. Его назначение и совместимость нужно сверять по выбранному варианту и месту в общей схеме дымохода.";
  const selectionQuestion = fact?.selectionQuestion(product.name) ??
    `Что проверить перед заказом «${product.name}»?`;

  return [
    {
      q: `Для чего используется «${product.name}»?`,
      a: purpose,
    },
    {
      q: `Какие варианты «${product.name}» есть в каталоге?`,
      a: variantAnswer(product),
    },
    {
      q: selectionQuestion,
      a: selectedSkuAnswer(product, activeSku),
    },
  ];
}
