"use client";

import { useState } from "react";
import type { ProductFilterOption } from "@/lib/api";

type CatalogVariantFiltersProps = {
  diameters: ProductFilterOption[];
  innerPipes: ProductFilterOption[];
  innerThicknesses: ProductFilterOption[];
  outerPipes: ProductFilterOption[];
  executions: ProductFilterOption[];
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

function CompactSelect({
  label,
  name,
  options,
  value,
  includeAll = false,
  className = "",
}: {
  label: string;
  name: string;
  options: ProductFilterOption[];
  value?: string;
  includeAll?: boolean;
  className?: string;
}) {
  if (options.length <= 1) {
    return null;
  }

  return (
    <label className={`catalog-filter-field ${className}`.trim()}>
      <span>{label}</span>
      <select defaultValue={value ?? (includeAll ? "" : options[0]?.value ?? "")} name={name}>
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
}: {
  label: string;
  name: string;
  options: ProductFilterOption[];
  value?: string;
}) {
  if (options.length <= 1) {
    return null;
  }

  return (
    <div aria-label={label} className="catalog-material-filter catalog-thickness-filter" role="group">
      <span>{label}</span>
      <div className="catalog-segmented-control">
        <label className="filter-chip">
          <input defaultChecked={!value} name={name} type="radio" value="" />
          Все
        </label>
        {options.map((option) => (
          <label className="filter-chip" key={option.value}>
            <input
              defaultChecked={option.value === value}
              name={name}
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
}: {
  label: string;
  name: string;
  options: ProductFilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  showMaterial?: boolean;
  showSteel?: boolean;
  includeHidden?: boolean;
}) {
  const parsed = parsedPipeOptions(options);
  const selected = parsed.find((option) => option.value === selectedValue) ?? parsed[0];
  if (!selected) {
    return null;
  }
  const materials = uniqueValues(parsed.map((option) => option.material));
  const steelOptions = parsed.filter((option) => option.material === selected.material);
  const steels = uniqueValues(steelOptions.map((option) => option.steel));

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
      {showMaterial && materials.length > 1 ? (
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
      {showSteel && steels.length > 1 ? (
        <label className="catalog-filter-field catalog-pipe-steel-filter">
          <span>Марка стали {label}</span>
          <select onChange={(event) => selectSteel(event.target.value)} value={selected.steel}>
            {steels.map((steel) => (
              <option key={steel} value={steel}>
                {steel}
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
  diameter,
  innerPipe,
  innerThickness,
  outerPipe,
  execution,
  facets,
}: CatalogVariantFiltersProps) {
  const [selectedInnerPipe, setSelectedInnerPipe] = useState(innerPipe ?? innerPipes[0]?.value ?? "");
  const [selectedOuterPipe, setSelectedOuterPipe] = useState(outerPipe ?? outerPipes[0]?.value ?? "");

  return (
    <>
      <div className="catalog-filter-row catalog-filter-row-primary">
        <PipeControls
          label="внутренней трубы"
          name="inner_pipe"
          onChange={setSelectedInnerPipe}
          options={innerPipes}
          selectedValue={selectedInnerPipe}
          showSteel={false}
        />
        <CompactSelect
          className="catalog-diameter-filter"
          label="Диаметр d/D"
          name="diameter"
          options={diameters}
          value={diameter}
        />
      </div>

      <div className="catalog-filter-row catalog-filter-row-inner-steel">
        <PipeControls
          label="внутренней трубы"
          name="inner_pipe"
          onChange={setSelectedInnerPipe}
          options={innerPipes}
          selectedValue={selectedInnerPipe}
          includeHidden={false}
          showMaterial={false}
        />
        <CompactButtons
          label="Толщина внутренней трубы"
          name="inner_thickness"
          options={innerThicknesses}
          value={innerThickness}
        />
      </div>

      {outerPipes.length ? (
        <div className="catalog-filter-row catalog-filter-row-outer">
          <PipeControls
            label="наружной трубы"
            name="outer_pipe"
            onChange={setSelectedOuterPipe}
            options={outerPipes}
            selectedValue={selectedOuterPipe}
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
