"use client";

import { useMemo, useState } from "react";
import type { ProductFilterOption } from "@/lib/api";
import { type CatalogMaterial, steelGradesForMaterial } from "@/lib/catalogFilters";

type CatalogVariantFiltersProps = {
  diameters: ProductFilterOption[];
  steelGrades: ProductFilterOption[];
  materials: ProductFilterOption[];
  diameter?: string;
  material: CatalogMaterial;
  steel?: string;
  facets: Array<{
    name: string;
    label: string;
    value?: string;
    options: ProductFilterOption[];
  }>;
};

export function CatalogVariantFilters({
  diameters,
  steelGrades,
  materials,
  diameter,
  material: initialMaterial,
  steel: initialSteel,
  facets,
}: CatalogVariantFiltersProps) {
  const [material, setMaterial] = useState<CatalogMaterial>(initialMaterial);
  const initialSteels = steelGradesForMaterial(steelGrades, initialMaterial);
  const [steel, setSteel] = useState(
    initialSteels.some((option) => option.value === initialSteel)
      ? initialSteel ?? ""
      : initialSteels[0]?.value ?? "",
  );
  const availableSteels = useMemo(
    () => steelGradesForMaterial(steelGrades, material),
    [material, steelGrades],
  );

  function selectMaterial(nextMaterial: CatalogMaterial) {
    const nextSteels = steelGradesForMaterial(steelGrades, nextMaterial);
    setMaterial(nextMaterial);
    setSteel(nextSteels[0]?.value ?? "");
  }

  return (
    <>
      <label className="catalog-filter-field">
        <span>Диаметр d/D</span>
        <select defaultValue={diameter ?? diameters[0]?.value ?? ""} name="diameter">
          {diameters.length ? (
            diameters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} · {option.count}
              </option>
            ))
          ) : (
            <option value="">Нет вариантов</option>
          )}
        </select>
      </label>

      <fieldset className="catalog-material-filter">
        <legend>Материал</legend>
        <div>
          {materials
            .filter((option) => option.value === "stainless" || option.value === "galvanized")
            .sort((left, right) => (left.value === "stainless" ? -1 : right.value === "stainless" ? 1 : 0))
            .map((option) => {
              const value = option.value as CatalogMaterial;
              return (
                <label className="filter-chip" key={option.value}>
                  <input
                    checked={material === value}
                    name="material"
                    onChange={() => selectMaterial(value)}
                    type="radio"
                    value={value}
                  />
                  {option.label} <span>{option.count}</span>
                </label>
              );
            })}
        </div>
      </fieldset>

      <label className="catalog-filter-field">
        <span>Марка стали</span>
        <select
          disabled={!availableSteels.length}
          name="steel"
          onChange={(event) => setSteel(event.target.value)}
          value={steel}
        >
          {availableSteels.length ? (
            availableSteels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} · {option.count}
              </option>
            ))
          ) : (
            <option value="">Нет вариантов</option>
          )}
        </select>
      </label>

      {facets.filter((facet) => facet.options.length).map((facet) => (
        <label className="catalog-filter-field" key={facet.name}>
          <span>{facet.label}</span>
          <select defaultValue={facet.value ?? ""} name={facet.name}>
            <option value="">Все варианты</option>
            {facet.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} · {option.count}
              </option>
            ))}
          </select>
        </label>
      ))}

      <button className="button catalog-filter-submit" type="submit">
        Показать
      </button>
    </>
  );
}
