import type { Product, SKU } from "@/lib/api";
import catalog from "./productFaqCatalog.json" with { type: "json" };

export type ProductFaqItem = {
  id?: string;
  q: string;
  a: string;
};

type FamilyFaq = { set: string; slug: string; title: string; items: ProductFaqItem[] };
const familyFaqs: Record<string, FamilyFaq> = catalog;

export function productFaqTitle(product: Product): string {
  return `Вопросы о товаре: ${familyFaqs[product.id]?.title ?? product.name}`;
}

function positiveNumber(value: unknown): string | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(number).replace(".", ",") : null;
}

function attributeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function materialLabel(material: unknown, steel: unknown, thickness: unknown): string | null {
  const label = attributeText(material);
  if (!label) return null;
  const parts = [label];
  // A steel grade is never attributed to galvanized material.
  const grade = attributeText(steel);
  if (grade && !/оцинк/i.test(label)) parts.push(grade);
  const wall = positiveNumber(thickness);
  if (wall) parts.push(`${wall} мм`);
  return parts.join(", ");
}

function catalogFaqItems(family: FamilyFaq, sku: SKU | null): ProductFaqItem[] {
  const base = family.items.map((item) => ({ ...item }));
  if (!sku) return base;
  const parameters: ProductFaqItem[] = [];
  const inner = positiveNumber(sku.diameter_mm);
  const outer = positiveNumber(sku.outer_diameter_mm);
  const sandwich = family.slug.startsWith("sendvich-");
  if (sandwich && inner && outer && Number(sku.outer_diameter_mm) > Number(sku.diameter_mm)) {
    parameters.push({
      id: `${family.set}-P01`,
      q: "Какие диаметры у выбранного исполнения?",
      a: `В выбранном исполнении внутренний канал — ${inner} мм, наружный кожух — ${outer} мм. При подборе соседних сэндвич-элементов сверяйте оба размера и конструкцию соединения. Крепёж и проходки дополнительно проверяют по наружной поверхности в месте установки.`,
    });
  }
  const length = positiveNumber(sku.length_mm);
  if ((family.set === "F01" || family.set === "F02") && length) {
    const effective = positiveNumber(sku.attributes.effective_length_mm);
    parameters.push({
      id: `${family.set}-P02`,
      q: "Какова длина выбранной трубы?",
      a: `Номинальная длина выбранной секции — ${length} мм. При составлении трассы учитывайте посадку соединений: прибавка к общей длине собранного участка может быть меньше номинальной длины изделия.${effective ? ` Монтажная длина этого исполнения — ${effective} мм.` : ""}`,
    });
  }
  if (sandwich) {
    const innerMaterial = materialLabel(sku.material, sku.steel_grade, sku.wall_thickness_mm);
    const outerMaterial = materialLabel(sku.attributes.outer_material, sku.attributes.outer_steel_grade, sku.attributes.outer_wall_thickness_mm);
    if (innerMaterial && outerMaterial) parameters.push({
      id: `${family.set}-P03`,
      q: "Из чего сделаны внутренняя труба и наружный кожух?",
      a: `Внутренняя труба выбранного исполнения: ${innerMaterial}. Наружный кожух: ${outerMaterial}. Это разные части сэндвича: материал кожуха нельзя использовать как характеристику дымового канала. Допустимый режим эксплуатации проверяют по документации системы.`,
    });
    const insulation = positiveNumber(sku.insulation_mm);
    if (insulation) parameters.push({
      id: `${family.set}-P04`,
      q: "Какая толщина утепления у этого исполнения?",
      a: `У выбранного исполнения слой утепления ${insulation} мм. Допустимые расстояния до конструкций по этому размеру не определяют; их нужно сверить с документацией системы.`,
    });
  }
  // Only a specifically confirmed outer-fit range, not a generic diameter field.
  const outerFit = attributeText(sku.attributes.outer_fit_range);
  if (["F12", "F13", "F14", "F15", "F30", "F31", "F35"].includes(family.set) && outerFit) parameters.push({
    id: `${family.set}-P05`,
    q: "Для какого наружного диаметра подходит выбранное исполнение?",
    a: `Рабочий диапазон охвата выбранного исполнения — ${outerFit}. Сопоставьте его с наружным размером трубы в месте установки. Дополнительно проверьте конструкцию посадки и остальные параметры узла.`,
  });
  const included = sku.attributes.included_items;
  if (Array.isArray(included) && included.length && included.every((item) => attributeText(item))) parameters.push({
    id: `${family.set}-P06`,
    q: "Что входит в комплект выбранного изделия?",
    a: `В поставку выбранного исполнения входят: ${included.map((item) => String(item).trim()).join(", ")}. Для сборки узла могут понадобиться дополнительные детали по схеме дымохода. Изображения соседних элементов на общей фотографии не означают их включение в комплект.`,
  });
  for (const item of parameters.slice(0, 2)) {
    // Replace the equivalent generic question instead of repeating it.
    const replacement = item.id?.endsWith("-P01")
      ? (family.set === "F02" ? "F02-Q1" : family.set === "F22" ? "F22-Q2" : null)
      : null;
    const index = replacement ? base.findIndex((candidate) => candidate.id === replacement) : -1;
    if (index >= 0) base[index] = item;
    else base.push(item);
  }
  return base;
}

type KindFact = {
  purpose: string;
  selectionQuestion: (name: string) => string;
};

const kindFacts: Record<string, KindFact> = {
  труба: {
    purpose: "Формирует прямой участок дымового канала. Конкретный вариант выбирают по диаметру, длине, контуру и материалу.",
    selectionQuestion: (name) => name.toLocaleLowerCase("ru-RU").includes("сэндвич")
      ? "Как выбрать длину сэндвич-трубы?"
      : "Как выбрать длину трубы?",
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
  const selected = facts.length ? facts.join(", ") : "параметры выбранного исполнения";
  return `Для выбранного артикула ${sku.article} проверьте ${selected}. Совпадение одного диаметра ещё не подтверждает совместимость всего узла — её сверяют по соседним элементам и маршруту.`;
}

export function productFaqItems(product: Product, activeSku: SKU | null): ProductFaqItem[] {
  const manualItems = customFaq(product);
  if (manualItems.length) return manualItems;

  const family = familyFaqs[product.id];
  if (family) return catalogFaqItems(family, activeSku);

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
