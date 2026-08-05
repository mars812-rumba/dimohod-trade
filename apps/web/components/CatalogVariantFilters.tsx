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

function CompactSelect({
  label,
  name,
  options,
  value,
  includeAll = false,
}: {
  label: string;
  name: string;
  options: ProductFilterOption[];
  value?: string;
  includeAll?: boolean;
}) {
  if (options.length <= 1) {
    return null;
  }

  return (
    <label className="catalog-filter-field">
      <span>{label}</span>
      <select defaultValue={value ?? (includeAll ? "" : options[0]?.value ?? "")} name={name}>
        {includeAll ? <option value="">Все варианты</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} · {option.count}
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
    <fieldset className="catalog-material-filter catalog-thickness-filter">
      <legend>{label}</legend>
      <div>
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
    </fieldset>
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
  return (
    <>
      <CompactSelect
        label="Диаметр d/D"
        name="diameter"
        options={diameters}
        value={diameter}
      />
      <CompactSelect
        label="Внутренняя труба"
        name="inner_pipe"
        options={innerPipes}
        value={innerPipe}
      />
      <CompactButtons
        label="Толщина внутренней трубы"
        name="inner_thickness"
        options={innerThicknesses}
        value={innerThickness}
      />
      <CompactSelect
        label="Внешняя труба"
        name="outer_pipe"
        options={outerPipes}
        value={outerPipe}
      />
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

      <button className="button catalog-filter-submit" type="submit">
        Показать
      </button>
    </>
  );
}
