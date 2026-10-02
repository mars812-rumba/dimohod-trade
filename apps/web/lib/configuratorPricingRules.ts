import { CHIMNEY_ENGINEERING_RULES } from "./configuratorEngineeringRules";

export type PassagePriceAllocation = {
  cupUnitPriceRub: number | null;
  explanation: string;
  reviewItem: string | null;
};

export function allocatePassageKitPrice(flangeUnitPriceRub: number | null): PassagePriceAllocation {
  const rule = CHIMNEY_ENGINEERING_RULES.passageKit;
  if (flangeUnitPriceRub === null || !Number.isFinite(flangeUnitPriceRub) || flangeUnitPriceRub <= 0) {
    return {
      cupUnitPriceRub: null,
      explanation: `Цена стакана рассчитывается из комплекта ${rule.sourceUnitPriceRub} ₽ после подбора двух фланцев ${rule.flangeBaseSize}, ${rule.flangeSteelGrade}.`,
      reviewItem: "Не удалось разложить цену проходного комплекта: не найдена подтверждённая цена фланца 600×600 мм AISI 430.",
    };
  }
  const allocated = rule.sourceUnitPriceRub - flangeUnitPriceRub * rule.flangeQuantityPerPassage;
  const explanation = `Цена стакана: ${rule.sourceUnitPriceRub} ₽ − ${rule.flangeQuantityPerPassage} × ${flangeUnitPriceRub} ₽ (фланцы ${rule.flangeBaseSize}, ${rule.flangeSteelGrade}).`;
  if (allocated <= 0) {
    const allocatedText = allocated < 0 ? `−${Math.abs(allocated)}` : String(allocated);
    return {
      cupUnitPriceRub: null,
      explanation,
      reviewItem: `Разложение цены проходного комплекта даёт ${allocatedText} ₽ за стакан. Цена не включена в итог до проверки исходной строки прайса.`,
    };
  }
  return { cupUnitPriceRub: allocated, explanation, reviewItem: null };
}
