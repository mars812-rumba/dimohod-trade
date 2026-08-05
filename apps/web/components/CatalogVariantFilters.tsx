"use client";

import { useEffect, useState } from "react";
import type { ProductFilterOption, ProductVariantCombination } from "@/lib/api";
import { filterVariantItems } from "@/lib/variantSelection";

type CatalogVariantFiltersProps = {
  diameters: ProductFilterOption[];
  innerPipes: ProductFilterOption[];
  innerThicknesses: ProductFilterOption[];
  outerPipes: ProductFilterOption[];
  executions: ProductFilterOption[];
  variantCombinations: ProductVariantCombination[];
  diameter?: string;
  innerPipe?: string;
  innerThickness?: string;
  outerPipe?: string;
  execution?: string;
  facets: Array<{
    name: string;
    label: string;
    value?: string;
    options: ProductFilterOption[];
  }>;
};

type ParsedPipeOption = ProductFilterOption & {
  material: string;
  steel: string;
};

function materialLabel(value: string) {
  return value === "stainless" ? "Нержавейка" : value === "galvanized" ? "Оцинковка" : value;
}

function parsedPipeOptions(options: ProductFilterOption[]): ParsedPipeOption[] {
  return options.map((option) => {
    const [material = "", steel = ""] = option.value.split("|");
    return { ...option, material, steel };
  });
}

function uniqueValues(values: string[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function compactSteelProfileLabel(value: string) {
  return value.replace(/^AISI\s+/i, "");
}

function combinationValue(combination: ProductVariantCombination, key: string) {
  const value = combination[key as keyof ProductVariantCombination];
  return typeof value === "string" ? value : null;
}

function CompactSelect({
  label,
  name,
  options,
  value,
  includeAll = false,
  className = "",
  onChange,
}: {
  label: string;
  name: string;
  options: ProductFilterOption[];
  value?: string;
  includeAll?: boolean;
  className?: string;
  onChange?: (value: string) => void;
}) {
  if (options.length <= 1) {
    return null;
  }

  return (
    <label className={`catalog-filter-field ${className}`.trim()}>
      <span>{label}</span>
      <select
        defaultValue={onChange ? undefined : value ?? (includeAll ? "" : options[0]?.value ?? "")}
        name={name}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        value={onChange ? value ?? "" : undefined}
      >
        {includeAll ? <option value="">Все варианты</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompactButtons({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: ProductFilterOption[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  if (options.length <= 1) {
    return null;
  }

  return (
    <div aria-label={label} className="catalog-material-filter catalog-thickness-filter" role="group">
      <span>{label}</span>
      <div className="catalog-segmented-control">
        <label className="filter-chip">
          <input
            checked={onChange ? !value : undefined}
            defaultChecked={onChange ? undefined : !value}
            name={name}
            onChange={onChange ? () => onChange("") : undefined}
            type="radio"
            value=""
          />
          Все
        </label>
        {options.map((option) => (
          <label className="filter-chip" key={option.value}>
            <input
              checked={onChange ? option.value === value : undefined}
              defaultChecked={onChange ? undefined : option.value === value}
              name={name}
              onChange={onChange ? () => onChange(option.value) : undefined}
              type="radio"
              value={option.value}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function PipeControls({
  label,
  name,
  options,
  selectedValue,
  onChange,
  showMaterial = true,
  showSteel = true,
  includeHidden = true,
  showProfileLabel = false,
  showSingleMaterial = false,
  showSingleSteel = false,
}: {
  label: string;
  name: string;
  options: ProductFilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  showMaterial?: boolean;
  showSteel?: boolean;
  includeHidden?: boolean;
  showProfileLabel?: boolean;
  showSingleMaterial?: boolean;
  showSingleSteel?: boolean;
}) {
  const parsed = parsedPipeOptions(options);
  const selected = parsed.find((option) => option.value === selectedValue) ?? parsed[0];
  if (!selected) {
    return null;
  }
  const materials = uniqueValues(parsed.map((option) => option.material));
  const steelOptions = parsed.filter((option) => option.material === selected.material);
  const steels = uniqueValues(steelOptions.map((option) => option.steel));
  const steelLabels = new Map(
    steelOptions.map((option) => [
      option.steel,
      showProfileLabel ? compactSteelProfileLabel(option.label) : option.steel,
    ]),
  );

  function selectMaterial(material: string) {
    const next =
      parsed.find((option) => option.material === material && option.steel === selected.steel) ??
      parsed.find((option) => option.material === material);
    if (next) {
      onChange(next.value);
    }
  }

  function selectSteel(steel: string) {
    const next = parsed.find(
      (option) => option.material === selected.material && option.steel === steel,
    );
    if (next) {
      onChange(next.value);
    }
  }

  return (
    <>
      {includeHidden ? <input name={name} type="hidden" value={selected.value} /> : null}
      {showMaterial && (materials.length > 1 || (showSingleMaterial && materials.length === 1)) ? (
        <div
          aria-label={`Материал ${label}`}
          className="catalog-material-filter catalog-pipe-material-filter"
          role="group"
        >
          <span>Материал {label}</span>
          <div className="catalog-segmented-control">
            {materials.map((material) => (
              <label className="filter-chip" key={material}>
                <input
                  checked={material === selected.material}
                  onChange={() => selectMaterial(material)}
                  type="radio"
                />
                {materialLabel(material)}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {showSteel && (steels.length > 1 || (showSingleSteel && steels.length === 1)) ? (
        <label className="catalog-filter-field catalog-pipe-steel-filter">
          <span>Марка стали {label}</span>
          <select onChange={(event) => selectSteel(event.target.value)} value={selected.steel}>
            {steels.map((steel) => (
              <option key={steel} value={steel}>
                {steelLabels.get(steel) ?? steel}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

export function CatalogVariantFilters({
  diameters,
  innerPipes,
  innerThicknesses,
  outerPipes,
  executions,
  variantCombinations,
  diameter,
  innerPipe,
  innerThickness,
  outerPipe,
  execution,
  facets,
}: CatalogVariantFiltersProps) {
  const [selectedInnerPipe, setSelectedInnerPipe] = useState(
    innerPipe ?? innerPipes[0]?.value ?? "",
  );
  const [selectedOuterPipe, setSelectedOuterPipe] = useState(
    outerPipe ?? outerPipes[0]?.value ?? "",
  );
  const [selectedDiameter, setSelectedDiameter] = useState(diameter ?? diameters[0]?.value ?? "");
  const [selectedInnerThickness, setSelectedInnerThickness] = useState(innerThickness ?? "");

  const diameterCombinations = filterVariantItems(
    variantCombinations,
    { diameter: selectedDiameter },
    combinationValue,
  );
  const availableInnerValues = new Set(
    diameterCombinations.map((combination) => combination.inner_pipe),
  );
  const availableInnerPipes = diameterCombinations.length
    ? innerPipes.filter((option) => availableInnerValues.has(option.value))
    : innerPipes;
  const effectiveInnerPipe = availableInnerPipes.some(
    (option) => option.value === selectedInnerPipe,
  )
    ? selectedInnerPipe
    : availableInnerPipes[0]?.value ?? "";
  const innerCombinations = filterVariantItems(
    diameterCombinations,
    { inner_pipe: effectiveInnerPipe },
    combinationValue,
  );
  const availableThicknessValues = new Set(
    innerCombinations.map((combination) => combination.inner_thickness).filter(Boolean),
  );
  const availableInnerThicknesses = innerCombinations.length
    ? innerThicknesses.filter((option) => availableThicknessValues.has(option.value))
    : innerThicknesses;
  const effectiveInnerThickness =
    selectedInnerThickness &&
    availableInnerThicknesses.some((option) => option.value === selectedInnerThickness)
      ? selectedInnerThickness
      : "";
  const matchingCombinations = filterVariantItems(
    innerCombinations,
    {
      inner_thickness: effectiveInnerThickness,
    },
    combinationValue,
  );
  const availableOuterValues = new Set(
    matchingCombinations.map((combination) => combination.outer_pipe),
  );
  const selectedInnerMaterial = effectiveInnerPipe.split("|", 1)[0];
  const availableOuterPipes = matchingCombinations.length
    ? outerPipes.filter(
        (option) =>
          availableOuterValues.has(option.value) ||
          // Every price section with a galvanized inner pipe has a confirmed
          // galvanized outer-shell execution. Keep it visible if legacy data
          // made the combination matrix incomplete; the submitted filters
          // still select only a real SKU from the category.
          (selectedInnerMaterial === "galvanized" && option.value.startsWith("galvanized|")),
      )
    : outerPipes;
  const effectiveOuterPipe = availableOuterPipes.some(
    (option) => option.value === selectedOuterPipe,
  )
    ? selectedOuterPipe
    : availableOuterPipes[0]?.value ?? "";

  useEffect(() => {
    if (effectiveInnerPipe !== selectedInnerPipe) {
      setSelectedInnerPipe(effectiveInnerPipe);
    }
  }, [effectiveInnerPipe, selectedInnerPipe]);

  useEffect(() => {
    if (effectiveInnerThickness !== selectedInnerThickness) {
      setSelectedInnerThickness(effectiveInnerThickness);
    }
  }, [effectiveInnerThickness, selectedInnerThickness]);

  useEffect(() => {
    if (effectiveOuterPipe !== selectedOuterPipe) {
      setSelectedOuterPipe(effectiveOuterPipe);
    }
  }, [effectiveOuterPipe, selectedOuterPipe]);

  return (
    <>
      <div className="catalog-filter-row catalog-filter-row-primary">
        <PipeControls
          label="внутренней трубы"
          name="inner_pipe"
          onChange={setSelectedInnerPipe}
          options={availableInnerPipes}
          selectedValue={effectiveInnerPipe}
          showSteel={false}
        />
        <CompactSelect
          className="catalog-diameter-filter"
          label="Диаметр d/D"
          name="diameter"
          options={diameters}
          onChange={setSelectedDiameter}
          value={selectedDiameter}
        />
      </div>

      <div className="catalog-filter-row catalog-filter-row-inner-steel">
        <PipeControls
          label="внутренней трубы"
          name="inner_pipe"
          onChange={setSelectedInnerPipe}
          options={availableInnerPipes}
          selectedValue={effectiveInnerPipe}
          includeHidden={false}
          showMaterial={false}
          showProfileLabel
        />
        <CompactButtons
          label="Толщина внутренней трубы"
          name="inner_thickness"
          options={availableInnerThicknesses}
          onChange={setSelectedInnerThickness}
          value={effectiveInnerThickness}
        />
      </div>

      {outerPipes.length ? (
        <div className="catalog-filter-row catalog-filter-row-outer">
          <PipeControls
            label="наружной трубы"
            name="outer_pipe"
            onChange={setSelectedOuterPipe}
            options={availableOuterPipes}
            selectedValue={effectiveOuterPipe}
            showSingleMaterial
            showSingleSteel
          />
        </div>
      ) : null}

      <div className="catalog-filter-row catalog-filter-row-execution">
        <CompactSelect
          includeAll
          label="Исполнение"
          name="execution"
          options={executions}
          value={execution}
        />
        {facets.map((facet) => (
          <CompactSelect
            includeAll
            key={facet.name}
            label={facet.label}
            name={facet.name}
            options={facet.options}
            value={facet.value}
          />
        ))}
      </div>

      <button className="button catalog-filter-submit" type="submit">
        Показать
      </button>
    </>
  );
}
